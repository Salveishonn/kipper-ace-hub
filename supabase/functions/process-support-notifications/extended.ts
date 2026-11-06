// Forum emails, portal push notifications and team broadcasts (outbox events added in
// 20261105170440_forum_emails_and_push.sql). Kept apart from the support-case emails in index.ts.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { emailParagraph, emailSmallHtml, emailLink, renderKipperEmail } from "../_shared/emailLayout.ts";
import { sendKipperEmailBatch, type BatchEmail } from "../_shared/sendEmail.ts";
import { sendWebPush, type VapidKeys } from "../_shared/webPush.ts";

export const EXTENDED_EVENTS = new Set([
  "forum.post.created",
  "forum.comment.created",
  "content.published",
  "admin.broadcast",
]);

type Payload = Record<string, unknown>;
type Recipient = { user_id: string; email: string };

const PUSH_SUBJECT = "mailto:organizacionkipper@gmail.com";

/** Active producers and every admin: the people who can use the portal and the forum. */
async function portalMembers(admin: SupabaseClient, opts: { producersOnly?: boolean } = {}): Promise<Recipient[]> {
  const roles = opts.producersOnly ? ["productor"] : ["productor", "admin"];
  const { data: roleRows, error } = await admin.from("user_roles").select("user_id, role").in("role", roles);
  if (error) throw new Error("No se pudieron leer los destinatarios");
  const adminIds = new Set((roleRows ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
  const ids = Array.from(new Set((roleRows ?? []).map((r) => r.user_id)));
  if (!ids.length) return [];

  const out: Recipient[] = [];
  for (let i = 0; i < ids.length; i += 300) {
    const { data: profiles, error: pErr } = await admin
      .from("profiles")
      .select("user_id, email, account_status")
      .in("user_id", ids.slice(i, i + 300));
    if (pErr) throw new Error("No se pudieron leer los perfiles");
    for (const p of profiles ?? []) {
      if (p.account_status !== "active" && !adminIds.has(p.user_id)) continue;
      if (typeof p.email === "string" && p.email.includes("@")) out.push({ user_id: p.user_id, email: p.email });
    }
  }
  return out;
}

/** Users who switched off a forum email kind. */
async function optedOut(admin: SupabaseClient, column: "forum_new_post_email" | "forum_reply_email") {
  const { data } = await admin.from("notification_preferences").select("user_id").eq(column, false);
  return new Set((data ?? []).map((r) => r.user_id as string));
}

function forumEmail(params: {
  siteUrl: string;
  subject: string;
  headline: string;
  intro: string;
  quote: string;
  cta: string;
}): Omit<BatchEmail, "to"> {
  const prefsUrl = `${params.siteUrl}/productor/perfil`;
  const forumUrl = `${params.siteUrl}/productor/foro`;
  const footerNote = "Recibís este aviso porque sos parte del foro de productores Kipper.";
  const quote = params.quote.trim();
  return {
    subject: params.subject,
    html: renderKipperEmail({
      subject: params.subject,
      preheader: params.intro,
      eyebrow: "Foro Kipper",
      headline: params.headline,
      bodyHtml: `${emailParagraph(params.intro)}${quote ? emailParagraph(`“${quote}”`) : ""}`,
      cta: { label: params.cta, url: forumUrl },
      afterCtaHtml: emailSmallHtml(
        `Podés dejar de recibir estos avisos desde ${emailLink("Mi perfil", prefsUrl)}.`,
      ),
      footerNote,
    }),
    text: [
      params.headline,
      "",
      params.intro,
      quote ? `"${quote}"` : "",
      "",
      `${params.cta}: ${forumUrl}`,
      "",
      `Para dejar de recibir estos avisos: ${prefsUrl}`,
      "Organización Kipper",
    ].join("\n"),
  };
}

async function forumPostEmails(admin: SupabaseClient, payload: Payload, siteUrl: string): Promise<BatchEmail[]> {
  const authorId = String(payload.author_id ?? "");
  const authorName = String(payload.author_name ?? "Un productor");
  const skip = await optedOut(admin, "forum_new_post_email");
  const members = (await portalMembers(admin)).filter((r) => r.user_id !== authorId && !skip.has(r.user_id));
  const template = forumEmail({
    siteUrl,
    subject: `${authorName} publicó en el foro — Organización Kipper`,
    headline: "Nueva publicación en el foro",
    intro: `${authorName} compartió algo con la comunidad de productores.`,
    quote: String(payload.preview ?? ""),
    cta: "Ver en el foro",
  });
  return members.map((m) => ({ ...template, to: m.email }));
}

async function forumCommentEmails(admin: SupabaseClient, payload: Payload, siteUrl: string): Promise<BatchEmail[]> {
  const postId = String(payload.post_id ?? "");
  const commenterId = String(payload.author_id ?? "");
  const authorName = String(payload.author_name ?? "Un productor");
  const postAuthorId = String(payload.post_author_id ?? "");

  const { data: earlier } = await admin.from("forum_comments").select("author_id").eq("post_id", postId);
  const involved = new Set<string>([postAuthorId, ...(earlier ?? []).map((c) => c.author_id as string)]);
  involved.delete(commenterId);
  involved.delete("");
  if (!involved.size) return [];

  const skip = await optedOut(admin, "forum_reply_email");
  const members = (await portalMembers(admin)).filter((m) => involved.has(m.user_id) && !skip.has(m.user_id));
  const postPreview = String(payload.post_preview ?? "").trim();

  return members.map((m) => {
    const own = m.user_id === postAuthorId;
    return {
      ...forumEmail({
        siteUrl,
        subject: own
          ? `${authorName} comentó tu publicación — Organización Kipper`
          : `${authorName} respondió en una conversación del foro — Organización Kipper`,
        headline: own ? "Comentaron tu publicación" : "Nueva respuesta en el foro",
        intro: own
          ? `${authorName} comentó tu publicación${postPreview ? ` “${postPreview}”` : ""}.`
          : `${authorName} sumó un comentario en una publicación donde participaste.`,
        quote: String(payload.preview ?? ""),
        cta: "Ver la conversación",
      }),
      to: m.email,
    };
  });
}

let vapidCache: VapidKeys | null | undefined;
async function vapidKeys(admin: SupabaseClient): Promise<VapidKeys | null> {
  if (vapidCache !== undefined) return vapidCache;
  const { data, error } = await admin.rpc("get_push_vapid_keys");
  vapidCache = !error && data?.publicJwk && data?.privateJwk ? (data as VapidKeys) : null;
  if (!vapidCache) console.error("push: VAPID keys not configured");
  return vapidCache;
}

/** Best effort: a failed push never fails the outbox row. Dead subscriptions are removed. */
export async function pushToUsers(
  admin: SupabaseClient,
  userIds: string[] | "all-producers",
  notification: { title: string; body: string; url: string; tag?: string },
): Promise<{ sent: number; failed: number }> {
  const keys = await vapidKeys(admin);
  if (!keys) return { sent: 0, failed: 0 };

  const ids =
    userIds === "all-producers"
      ? (await portalMembers(admin, { producersOnly: true })).map((r) => r.user_id)
      : userIds.filter(Boolean);
  if (!ids.length) return { sent: 0, failed: 0 };

  const subs: Array<{ id: string; endpoint: string; p256dh: string; auth: string }> = [];
  for (let i = 0; i < ids.length; i += 300) {
    const { data } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("user_id", ids.slice(i, i + 300));
    subs.push(...(data ?? []));
  }

  let sent = 0;
  let failed = 0;
  const gone: string[] = [];
  const delivered: string[] = [];
  for (let i = 0; i < subs.length; i += 20) {
    const results = await Promise.all(
      subs.slice(i, i + 20).map(async (s) => {
        try {
          return { s, r: await sendWebPush(s, notification, keys, PUSH_SUBJECT) };
        } catch (e) {
          return { s, r: { ok: false as const, status: 0, gone: false, error: String(e) } };
        }
      }),
    );
    for (const { s, r } of results) {
      if (r.ok) {
        sent++;
        delivered.push(s.id);
      } else {
        failed++;
        if (r.gone) gone.push(s.id);
        else console.error("push failed", r.status);
      }
    }
  }
  if (gone.length) await admin.from("push_subscriptions").delete().in("id", gone);
  if (delivered.length) {
    await admin.from("push_subscriptions").update({ last_success_at: new Date().toISOString() }).in("id", delivered);
  }
  return { sent, failed };
}

export type AdminPushKind = "admin_push_cases" | "admin_push_applications" | "admin_push_forum";

/** Push to every admin who kept this kind of team notification on. Never throws. */
export async function pushToAdmins(
  admin: SupabaseClient,
  kind: AdminPushKind,
  notification: { title: string; body: string; url: string; tag?: string },
  opts: { exclude?: string } = {},
): Promise<{ sent: number; failed: number }> {
  try {
    const { data: roleRows, error } = await admin.from("user_roles").select("user_id").eq("role", "admin");
    if (error) throw new Error("admin lookup failed");
    const { data: off } = await admin.from("notification_preferences").select("user_id").eq(kind, false);
    const skip = new Set((off ?? []).map((r) => r.user_id as string));
    if (opts.exclude) skip.add(opts.exclude);
    const ids = Array.from(new Set((roleRows ?? []).map((r) => r.user_id as string))).filter((id) => !skip.has(id));
    return await pushToUsers(admin, ids, notification);
  } catch (e) {
    console.error("admin push failed", e instanceof Error ? e.message : e);
    return { sent: 0, failed: 0 };
  }
}

function clip(text: unknown, max = 120): string {
  const value = String(text ?? "").replace(/\s+/g, " ").trim();
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/** Handles one extended outbox row. Returns an error string when the row should be retried. */
export async function handleExtendedEvent(
  admin: SupabaseClient,
  row: { event_type: string; event_id: string; payload: Payload },
  siteUrl: string,
): Promise<string | null> {
  const payload = row.payload ?? {};

  if (row.event_type === "forum.post.created" || row.event_type === "forum.comment.created") {
    const emails =
      row.event_type === "forum.post.created"
        ? await forumPostEmails(admin, payload, siteUrl)
        : await forumCommentEmails(admin, payload, siteUrl);
    if (emails.length) {
      const res = await sendKipperEmailBatch(emails, `${row.event_type}/${row.event_id}`);
      if (res.error) return res.error;
    }
    // Admins follow forum activity on their devices (after the emails, so a retry never repeats it).
    const authorName = String(payload.author_name ?? "Un productor");
    const postId = String(payload.post_id ?? "");
    await pushToAdmins(
      admin,
      "admin_push_forum",
      row.event_type === "forum.post.created"
        ? { title: `${authorName} publicó en el foro`, body: clip(payload.preview) || "Nueva publicación", url: "/admin/foro", tag: `forum-post-${postId}` }
        : { title: `${authorName} comentó en el foro`, body: clip(payload.preview) || "Nuevo comentario", url: "/admin/foro", tag: `forum-post-${postId}` },
      { exclude: String(payload.author_id ?? "") },
    );
    return null;
  }

  if (row.event_type === "content.published") {
    const kind = payload.kind === "academy" ? "Nuevo en Academy" : "Nueva novedad";
    await pushToUsers(admin, "all-producers", {
      title: kind,
      body: String(payload.title ?? "Hay contenido nuevo en el portal"),
      url: String(payload.url ?? "/productor"),
      tag: `content-${row.event_id}`,
    });
    return null;
  }

  if (row.event_type === "admin.broadcast") {
    await pushToUsers(admin, "all-producers", {
      title: String(payload.title ?? "Organización Kipper"),
      body: String(payload.body ?? ""),
      url: String(payload.url ?? "/productor"),
      tag: `broadcast-${row.event_id}`,
    });
    return null;
  }

  return `Evento no soportado: ${row.event_type}`;
}
