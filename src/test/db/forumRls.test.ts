// @vitest-environment node
// Behavioral RLS tests for the intranet forum (20261105151548_intranet_forum.sql).
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createMigratedDb, createUser, runAs, verifyAdminMfa } from "./supabaseDb";

type Ids = {
  admin: string;
  producer: string;
  otherProducer: string;
  suspended: string;
  outsider: string;
  postId: string;
};

const as = (userId: string) => ({ role: "authenticated" as const, userId });

async function seed(db: PGlite): Promise<Ids> {
  const admin = await createUser(db, { email: "admin@example.test", roles: ["admin"] });
  const producer = await createUser(db, { email: "pas@example.test", roles: ["productor"] });
  const otherProducer = await createUser(db, { email: "pas2@example.test", roles: ["productor"] });
  const suspended = await createUser(db, {
    email: "suspended@example.test",
    roles: ["productor"],
    accountStatus: "suspended",
  });
  const outsider = await createUser(db, { email: "nobody@example.test" });

  const post = await runAs<{ id: string }>(db, as(producer),
    "insert into public.forum_posts (body) values ('Hola colegas') returning id");
  if (post.error) throw new Error(post.error);
  return { admin, producer, otherProducer, suspended, outsider, postId: post.rows[0].id };
}

describe("intranet forum RLS", () => {
  let db: PGlite;
  let ids: Ids;
  beforeAll(async () => {
    db = await createMigratedDb();
    ids = await seed(db);
  }, 60_000);

  it("active producers and admins read the feed; others do not", async () => {
    for (const u of [ids.producer, ids.otherProducer, ids.admin]) {
      const res = await runAs(db, as(u), "select id from public.forum_posts");
      expect(res.rows).toHaveLength(1);
    }
    for (const u of [ids.suspended, ids.outsider]) {
      const res = await runAs(db, as(u), "select id from public.forum_posts");
      expect(res.rows).toHaveLength(0);
    }
    const anon = await runAs(db, { role: "anon" }, "select id from public.forum_posts");
    expect(anon.error).toMatch(/permission denied/);
  });

  it("suspended or role-less users cannot post", async () => {
    for (const u of [ids.suspended, ids.outsider]) {
      const res = await runAs(db, as(u), "insert into public.forum_posts (body) values ('x')");
      expect(res.error).toMatch(/row-level security/);
    }
  });

  it("nobody can post as someone else", async () => {
    const res = await runAs(db, as(ids.otherProducer),
      "insert into public.forum_posts (author_id, body) values ($1, 'suplantación')", [ids.producer]);
    expect(res.error).toMatch(/row-level security/);
  });

  it("only the author edits a post, and the author cannot be changed", async () => {
    const other = await runAs(db, as(ids.otherProducer),
      "update public.forum_posts set body = 'hackeado' where id = $1 returning id", [ids.postId]);
    expect(other.rows).toHaveLength(0);

    const own = await runAs<{ edited_at: string | null }>(db, as(ids.producer),
      "update public.forum_posts set body = 'Hola colegas (editado)' where id = $1 returning edited_at", [ids.postId]);
    expect(own.error).toBeNull();
    expect(own.rows[0].edited_at).not.toBeNull();

    const reassign = await runAs(db, as(ids.producer),
      "update public.forum_posts set author_id = $2 where id = $1", [ids.postId, ids.otherProducer]);
    expect(reassign.error).toMatch(/permission denied/);
  });

  it("attachments must live under the author's own folder for their own post", async () => {
    const ok = await runAs(db, as(ids.producer),
      `insert into public.forum_post_attachments (post_id, file_path, file_name)
       values ($1, $2, 'tarifario.pdf')`, [ids.postId, `${ids.producer}/${ids.postId}/tarifario.pdf`]);
    expect(ok.error).toBeNull();

    const foreignPost = await runAs(db, as(ids.otherProducer),
      `insert into public.forum_post_attachments (post_id, file_path, file_name)
       values ($1, $2, 'x.pdf')`, [ids.postId, `${ids.otherProducer}/${ids.postId}/x.pdf`]);
    expect(foreignPost.error).toMatch(/row-level security/);

    const foreignPath = await runAs(db, as(ids.producer),
      `insert into public.forum_post_attachments (post_id, file_path, file_name)
       values ($1, $2, 'x.pdf')`, [ids.postId, `${ids.otherProducer}/${ids.postId}/x.pdf`]);
    expect(foreignPath.error).toMatch(/row-level security/);
  });

  it("storage uploads are limited to the user's own folder", async () => {
    const own = await runAs(db, as(ids.otherProducer),
      "insert into storage.objects (bucket_id, name) values ('forum-attachments', $1)",
      [`${ids.otherProducer}/p/a.pdf`]);
    expect(own.error).toBeNull();
    const foreign = await runAs(db, as(ids.otherProducer),
      "insert into storage.objects (bucket_id, name) values ('forum-attachments', $1)",
      [`${ids.producer}/p/b.pdf`]);
    expect(foreign.error).toMatch(/row-level security/);
    const suspended = await runAs(db, as(ids.suspended),
      "insert into storage.objects (bucket_id, name) values ('forum-attachments', $1)",
      [`${ids.suspended}/p/c.pdf`]);
    expect(suspended.error).toMatch(/row-level security/);
  });

  it("members react once and comment as themselves", async () => {
    const like = await runAs(db, as(ids.otherProducer),
      "insert into public.forum_reactions (post_id, reaction) values ($1, 'like')", [ids.postId]);
    expect(like.error).toBeNull();
    const twice = await runAs(db, as(ids.otherProducer),
      "insert into public.forum_reactions (post_id, reaction) values ($1, 'love')", [ids.postId]);
    expect(twice.error).toMatch(/duplicate key/);
    const change = await runAs(db, as(ids.otherProducer),
      "update public.forum_reactions set reaction = 'idea' where post_id = $1 returning reaction", [ids.postId]);
    expect(change.rows).toEqual([{ reaction: "idea" }]);
    const forged = await runAs(db, as(ids.otherProducer),
      "insert into public.forum_reactions (post_id, user_id) values ($1, $2)", [ids.postId, ids.admin]);
    expect(forged.error).toMatch(/row-level security/);

    const comment = await runAs(db, as(ids.otherProducer),
      "insert into public.forum_comments (post_id, body) values ($1, 'Muy útil, gracias') returning id", [ids.postId]);
    expect(comment.error).toBeNull();
    const suspended = await runAs(db, as(ids.suspended),
      "insert into public.forum_comments (post_id, body) values ($1, 'x')", [ids.postId]);
    expect(suspended.error).toMatch(/row-level security/);
  });

  it("author profiles expose only name/avatar, and only to forum members", async () => {
    const res = await runAs<Record<string, unknown>>(db, as(ids.producer),
      "select * from public.get_forum_authors($1)", [[ids.producer, ids.otherProducer, ids.outsider]]);
    expect(res.error).toBeNull();
    expect(res.rows.map((r) => r.user_id).sort()).toEqual([ids.producer, ids.otherProducer].sort());
    expect(Object.keys(res.rows[0]).sort()).toEqual(["avatar_url", "full_name", "is_admin", "user_id"]);

    const outsider = await runAs(db, as(ids.outsider),
      "select * from public.get_forum_authors($1)", [[ids.producer]]);
    expect(outsider.rows).toHaveLength(0);
  });

  it("other producers cannot delete a post; an admin needs the MFA step to moderate", async () => {
    const other = await runAs(db, as(ids.otherProducer),
      "delete from public.forum_posts where id = $1 returning id", [ids.postId]);
    expect(other.rows).toHaveLength(0);

    const noMfa = await runAs(db, as(ids.admin),
      "delete from public.forum_posts where id = $1 returning id", [ids.postId]);
    expect(noMfa.rows).toHaveLength(0);

    await verifyAdminMfa(db, ids.admin);
    const mfa = await runAs(db, as(ids.admin),
      "delete from public.forum_posts where id = $1 returning id", [ids.postId]);
    expect(mfa.rows).toHaveLength(1);
    const left = await db.query("select 1 from public.forum_comments where post_id = $1", [ids.postId]);
    expect(left.rows).toHaveLength(0);
  });
});
