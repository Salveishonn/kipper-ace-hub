// Writes the branded Auth emails to supabase/templates and, with --apply, to the live project.
//
//   deno run --allow-read --allow-write scripts/apply-auth-emails.ts
//   $env:SUPABASE_ACCESS_TOKEN = "<personal access token>"
//   deno run --allow-read --allow-write --allow-env --allow-net=api.supabase.com scripts/apply-auth-emails.ts --apply
import { AUTH_EMAILS } from "../supabase/templates/authEmails.ts";

const PROJECT_REF = "qefzutfaawsegmwgaynj";
const SENDER_NAME = "Organización Kipper";
const SENDER_EMAIL = "notificaciones@kipperseguros.com";

const templatesDir = new URL("../supabase/templates/", import.meta.url);
for (const email of AUTH_EMAILS) {
  await Deno.writeTextFile(new URL(`${email.key}.html`, templatesDir), `${email.html}\n`);
}
console.log(`Wrote ${AUTH_EMAILS.length} templates to supabase/templates`);

if (Deno.args.includes("--apply")) {
  const token = Deno.env.get("SUPABASE_ACCESS_TOKEN");
  if (!token) {
    console.error("Set SUPABASE_ACCESS_TOKEN first.");
    Deno.exit(1);
  }

  const config: Record<string, string> = {
    smtp_sender_name: SENDER_NAME,
    smtp_admin_email: SENDER_EMAIL,
  };
  for (const email of AUTH_EMAILS) {
    config[`mailer_subjects_${email.key}`] = email.subject;
    config[`mailer_templates_${email.key}_content`] = email.html;
  }

  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    console.error(`Supabase rejected the update (${res.status}): ${await res.text()}`);
    Deno.exit(1);
  }
  console.log("Auth emails and sender updated on the live project.");
}
