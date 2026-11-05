// @vitest-environment node
// Blog attachments (20261105171000_blog_media.sql): public reads only for published posts,
// writes only for admins who passed the MFA step.
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createMigratedDb, createUser, runAs, verifyAdminMfa } from "./supabaseDb";

describe("blog media RLS", () => {
  let db: PGlite;
  let admin: string;
  let producer: string;
  let published: string;
  let draft: string;

  beforeAll(async () => {
    db = await createMigratedDb();
    admin = await createUser(db, { email: "admin@example.test", roles: ["admin"] });
    producer = await createUser(db, { email: "pas@example.test", roles: ["productor"] });
    const ins = async (slug: string, status: string) =>
      (
        await db.query<{ id: string }>(
          "insert into public.blog_posts (title, slug, status) values ($1, $1, $2) returning id",
          [slug, status],
        )
      ).rows[0].id;
    published = await ins("publicado", "published");
    draft = await ins("borrador", "draft");
    for (const id of [published, draft]) {
      await db.query(
        "insert into public.blog_post_attachments (post_id, file_path, file_name) values ($1, $2, 'a.pdf')",
        [id, `posts/${id}/a.pdf`],
      );
    }
  }, 60_000);

  it("anonymous visitors see files of published posts only", async () => {
    const res = await runAs<{ post_id: string }>(db, { role: "anon" },
      "select post_id from public.blog_post_attachments");
    expect(res.error).toBeNull();
    expect(res.rows.map((r) => r.post_id)).toEqual([published]);
  });

  it("producers cannot add files", async () => {
    const res = await runAs(db, { role: "authenticated", userId: producer },
      "insert into public.blog_post_attachments (post_id, file_path, file_name) values ($1, $2, 'x.pdf')",
      [published, `posts/${published}/x.pdf`]);
    expect(res.error).toMatch(/row-level security/);
  });

  it("admins need the MFA step to add files, and paths must belong to the post", async () => {
    const actor = { role: "authenticated" as const, userId: admin };
    const noMfa = await runAs(db, actor,
      "insert into public.blog_post_attachments (post_id, file_path, file_name) values ($1, $2, 'x.pdf')",
      [published, `posts/${published}/x.pdf`]);
    expect(noMfa.error).toMatch(/row-level security/);

    await verifyAdminMfa(db, admin);
    const ok = await runAs(db, actor,
      "insert into public.blog_post_attachments (post_id, file_path, file_name) values ($1, $2, 'x.pdf')",
      [published, `posts/${published}/x.pdf`]);
    expect(ok.error).toBeNull();

    const wrongPath = await runAs(db, actor,
      "insert into public.blog_post_attachments (post_id, file_path, file_name) values ($1, $2, 'y.pdf')",
      [published, `posts/${draft}/y.pdf`]);
    expect(wrongPath.error).toMatch(/blog_post_attachments_path/);
  });

  it("rejects non-http video links", async () => {
    const res = await db.query("update public.blog_posts set video_url = 'javascript:alert(1)' where id = $1", [published])
      .then(() => null, (e: Error) => e.message);
    expect(res).toMatch(/blog_posts_video_url_http/);
  });
});
