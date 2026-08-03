import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Generic success — never reveal whether the email already exists. */
const GENERIC_OK = {
  ok: true as const,
  message:
    "Recibimos tu solicitud. Revisá tu email para verificar tu dirección. Una vez verificada, el equipo de Kipper evaluará tu solicitud.",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getValidatedSiteUrl(): string {
  const raw = Deno.env.get("SITE_URL");
  if (!raw?.trim()) {
    throw new Error("SITE_URL no configurado en secrets de la Edge Function");
  }
  const parsed = new URL(raw.trim());
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("SITE_URL debe usar http o https");
  }
  return parsed.origin.replace(/\/$/, "");
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (!/[A-Z]/.test(password)) return "La contraseña debe incluir al menos una mayúscula.";
  if (!/[a-z]/.test(password)) return "La contraseña debe incluir al menos una minúscula.";
  if (!/[0-9]/.test(password)) return "La contraseña debe incluir al menos un número.";
  return null;
}

function trimOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Método no permitido" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const siteUrl = getValidatedSiteUrl();

    const body = await req.json().catch(() => ({}));
    const full_name = trimOrNull(body.full_name);
    const email = trimOrNull(body.email)?.toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    const confirm_password =
      typeof body.confirm_password === "string" ? body.confirm_password : password;

    if (!full_name || !email) {
      return json({ error: "Completá nombre y email." }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Ingresá un email válido." }, 400);
    }
    if (password !== confirm_password) {
      return json({ error: "Las contraseñas no coinciden." }, 400);
    }
    const pwdErr = validatePassword(password);
    if (pwdErr) return json({ error: pwdErr }, 400);

    const phone = trimOrNull(body.phone);
    const matricula_ssn = trimOrNull(body.matricula_ssn);
    const city = trimOrNull(body.city);
    const province = trimOrNull(body.province);
    const current_companies = trimOrNull(body.current_companies);
    const message = trimOrNull(body.message);
    let years_experience: number | null = null;
    if (body.years_experience !== undefined && body.years_experience !== null && body.years_experience !== "") {
      const n = Number(body.years_experience);
      years_experience = Number.isFinite(n) ? Math.trunc(n) : null;
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // If an application or auth user already exists, return the same success payload.
    const { data: existingApp } = await admin
      .from("producer_applications")
      .select("id, user_id, status")
      .ilike("email", email)
      .maybeSingle();

    if (existingApp) {
      return json(GENERIC_OK);
    }

    const metadata = {
      pas_applicant: true,
      full_name,
      phone,
      matricula_ssn,
      city,
      province,
      years_experience,
      current_companies,
      message,
    };

    const anon = createClient(supabaseUrl, anonKey);
    const { data: signUpData, error: signUpError } = await anon.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback`,
        data: metadata,
      },
    });

    // Enumeration-safe: treat "already registered" as success.
    if (signUpError) {
      const m = signUpError.message.toLowerCase();
      if (
        m.includes("already") ||
        m.includes("registered") ||
        m.includes("exists") ||
        m.includes("rate limit")
      ) {
        return json(GENERIC_OK);
      }
      console.error("signUp error", signUpError.message);
      return json({ error: "No se pudo registrar la solicitud. Intentá nuevamente." }, 400);
    }

    const userId = signUpData.user?.id;
    if (userId) {
      // Ensure rows even if the auth trigger races or is delayed.
      await admin.from("profiles").upsert(
        {
          user_id: userId,
          email,
          full_name,
          phone,
          city,
          province,
          account_status: "pending",
        },
        { onConflict: "user_id" },
      );

      const { data: linked } = await admin
        .from("producer_applications")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!linked) {
        const { error: insertErr } = await admin.from("producer_applications").insert({
          full_name,
          email,
          phone,
          matricula_ssn,
          city,
          province,
          years_experience,
          current_companies,
          message,
          status: "pending",
          user_id: userId,
        });
        if (insertErr) {
          // Unique race: still generic success.
          console.error("application insert", insertErr.message);
        }
      }

      // If confirmations are disabled, session may already exist — still pending approval.
      if (signUpData.session && signUpData.user?.email_confirmed_at) {
        return json({
          ok: true,
          email_verified: true,
          message:
            "Tu email fue verificado. Tu solicitud está siendo evaluada por el equipo de Kipper.",
        });
      }
    }

    return json(GENERIC_OK);
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Error interno";
    if (msg.includes("SITE_URL")) {
      return json({ error: msg }, 503);
    }
    return json({ error: "Error interno" }, 500);
  }
});
