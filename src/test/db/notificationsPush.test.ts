// @vitest-environment node
// Forum emails, push subscriptions and broadcasts (20261105170440_forum_emails_and_push.sql).
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createMigratedDb, createUser, runAs, verifyAdminMfa } from "./supabaseDb";

const as = (userId: string) => ({ role: "authenticated" as const, userId });

async function outbox(db: PGlite, type: string) {
  const { rows } = await db.query<{ event_id: string; payload: Record<string, unknown> }>(
    "select event_id, payload from public.notification_outbox where event_type = $1 order by created_at",
    [type],
  );
  return rows;
}

describe("forum emails, push and broadcasts", () => {
  let db: PGlite;
  let admin: string;
  let producer: string;
  let other: string;
  let suspended: string;

  beforeAll(async () => {
    db = await createMigratedDb();
    admin = await createUser(db, { email: "admin@example.test", roles: ["admin"] });
    producer = await createUser(db, { email: "pas@example.test", roles: ["productor"] });
    other = await createUser(db, { email: "pas2@example.test", roles: ["productor"] });
    suspended = await createUser(db, { email: "s@example.test", roles: ["productor"], accountStatus: "suspended" });
  }, 60_000);

  it("queues a forum.post.created event with the author's name", async () => {
    const post = await runAs<{ id: string }>(db, as(producer),
      "insert into public.forum_posts (body) values ('Comparto el tarifario') returning id");
    expect(post.error).toBeNull();
    const rows = await outbox(db, "forum.post.created");
    expect(rows).toHaveLength(1);
    expect(rows[0].payload).toMatchObject({
      post_id: post.rows[0].id,
      author_id: producer,
      author_name: "Nombre pas@example.test",
      preview: "Comparto el tarifario",
    });

    const comment = await runAs(db, as(other),
      "insert into public.forum_comments (post_id, body) values ($1, 'Gracias!')", [post.rows[0].id]);
    expect(comment.error).toBeNull();
    const comments = await outbox(db, "forum.comment.created");
    expect(comments[0].payload).toMatchObject({ post_author_id: producer, author_id: other, preview: "Gracias!" });
  });

  it("notifies new content only on its first publication", async () => {
    const res = await db.query<{ id: string }>(
      "insert into public.pas_resources (title, resource_type, published) values ('Tarifas noviembre', 'link', false) returning id",
    );
    const id = res.rows[0].id;
    expect(await outbox(db, "content.published")).toHaveLength(0);
    await db.query("update public.pas_resources set published = true where id = $1", [id]);
    await db.query("update public.pas_resources set published = false where id = $1", [id]);
    await db.query("update public.pas_resources set published = true where id = $1", [id]);
    const rows = await outbox(db, "content.published");
    expect(rows).toHaveLength(1);
    expect(rows[0].payload).toMatchObject({ kind: "novedad", title: "Tarifas noviembre", url: "/productor/novedades" });
  });

  it("links an academy lesson only once its module is published", async () => {
    const mod = await db.query<{ id: string }>(
      "insert into public.academy_modules (title, slug, published) values ('Autos', 'autos', false) returning id",
    );
    await db.query(
      "insert into public.academy_lessons (module_id, title, slug, type, published) values ($1, 'Clase 1', 'clase-1', 'video', true)",
      [mod.rows[0].id],
    );
    const before = (await outbox(db, "content.published")).filter((r) => r.event_id.startsWith("academy_lesson:"));
    expect(before).toHaveLength(0);
    await db.query("update public.academy_modules set published = true where id = $1", [mod.rows[0].id]);
    const mods = (await outbox(db, "content.published")).filter((r) => r.event_id.startsWith("academy_module:"));
    expect(mods[0].payload).toMatchObject({ kind: "academy", url: "/productor/academy/autos" });
  });

  it("push subscriptions belong to their owner, and only portal members can register", async () => {
    const ok = await runAs(db, as(producer), "select public.register_push_subscription($1, 'p', 'a', 'UA')",
      ["https://fcm.googleapis.com/fcm/send/one"]);
    expect(ok.error).toBeNull();

    const blocked = await runAs(db, as(suspended), "select public.register_push_subscription($1, 'p', 'a')",
      ["https://fcm.googleapis.com/fcm/send/two"]);
    expect(blocked.error).toMatch(/FORBIDDEN/);

    const notHttps = await runAs(db, as(producer), "select public.register_push_subscription($1, 'p', 'a')",
      ["http://evil.example/x"]);
    expect(notHttps.error).toMatch(/push_subscriptions_endpoint_https/);

    const othersView = await runAs(db, as(other), "select id from public.push_subscriptions");
    expect(othersView.rows).toHaveLength(0);
    const own = await runAs(db, as(producer), "select id from public.push_subscriptions");
    expect(own.rows).toHaveLength(1);

    // The same device signing in as someone else moves the subscription to them.
    await runAs(db, as(other), "select public.register_push_subscription($1, 'p2', 'a2')",
      ["https://fcm.googleapis.com/fcm/send/one"]);
    const moved = await db.query<{ user_id: string }>("select user_id from public.push_subscriptions");
    expect(moved.rows).toEqual([{ user_id: other }]);
  });

  it("VAPID keys are not readable by signed-in users", async () => {
    const res = await runAs(db, as(admin), "select public.get_push_vapid_keys()");
    expect(res.error).toMatch(/permission denied/);
  });

  it("broadcasts need an admin who passed MFA", async () => {
    const prod = await runAs(db, as(producer), "select public.send_admin_broadcast('Hola', 'Mensaje')");
    expect(prod.error).toMatch(/FORBIDDEN/);
    const noMfa = await runAs(db, as(admin), "select public.send_admin_broadcast('Hola', 'Mensaje')");
    expect(noMfa.error).toMatch(/FORBIDDEN/);

    await verifyAdminMfa(db, admin);
    const ok = await runAs(db, as(admin), "select public.send_admin_broadcast('Cierre de mes', 'Recordá cargar las pólizas', '/productor/novedades')");
    expect(ok.error).toBeNull();
    const rows = await outbox(db, "admin.broadcast");
    expect(rows[0].payload).toMatchObject({ title: "Cierre de mes", url: "/productor/novedades" });

    const badUrl = await runAs(db, as(admin), "select public.send_admin_broadcast('x', 'y', 'https://evil.example')");
    expect(badUrl.error).toMatch(/admin_broadcasts_url_path/);
  });

  it("users manage only their own email preferences", async () => {
    const ok = await runAs(db, as(producer),
      "insert into public.notification_preferences (forum_new_post_email) values (false)");
    expect(ok.error).toBeNull();
    const forged = await runAs(db, as(producer),
      "insert into public.notification_preferences (user_id, forum_new_post_email) values ($1, false)", [other]);
    expect(forged.error).toMatch(/row-level security/);
  });

  it("admins keep every team push on by default and can switch each one off", async () => {
    const created = await runAs(db, as(admin), "insert into public.notification_preferences default values");
    expect(created.error).toBeNull();
    const defaults = await db.query<Record<string, boolean>>(
      "select admin_push_cases, admin_push_applications, admin_push_forum from public.notification_preferences where user_id = $1",
      [admin],
    );
    expect(defaults.rows[0]).toEqual({ admin_push_cases: true, admin_push_applications: true, admin_push_forum: true });

    const off = await runAs(db, as(admin), "update public.notification_preferences set admin_push_forum = false");
    expect(off.error).toBeNull();
    const othersTouched = await runAs<{ user_id: string }>(db, as(other),
      "update public.notification_preferences set admin_push_cases = false returning user_id");
    expect(othersTouched.rows).toHaveLength(0);

    const { rows } = await db.query<{ user_id: string }>(
      "select user_id from public.notification_preferences where admin_push_forum = false",
    );
    expect(rows).toEqual([{ user_id: admin }]);
  });
});
