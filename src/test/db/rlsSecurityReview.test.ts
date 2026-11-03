// @vitest-environment node
// Behavioral RLS / RPC tests for the security review (SECURITY_REVIEW.md, SR-01..SR-08).
// Each case runs as the API role PostgREST would use, against all migrations applied in order.
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createMigratedDb, createUser, runAs, verifyAdminMfa } from "./supabaseDb";

const FIX = "20261103131256_security_review_hardening.sql";

type Ids = {
  admin: string;
  producer: string;
  otherProducer: string;
  applicant: string;
  applicationId: string;
  suspended: string;
  suspendedApplicationId: string;
  ticketId: string;
  otherTicketId: string;
};

async function seed(db: PGlite): Promise<Ids> {
  const admin = await createUser(db, { email: "admin@example.test", roles: ["admin"] });
  const producer = await createUser(db, { email: "pas@example.test", roles: ["productor"] });
  const otherProducer = await createUser(db, { email: "pas2@example.test", roles: ["productor"] });
  const applicant = await createUser(db, { email: "applicant@example.test", accountStatus: "pending" });
  const suspended = await createUser(db, { email: "suspended@example.test", accountStatus: "suspended" });

  const app = await db.query<{ id: string }>(
    `insert into public.producer_applications (full_name, email, status, user_id)
     values ('Applicant', 'applicant@example.test', 'pending', $1) returning id`,
    [applicant],
  );
  // A revoked producer: application stays 'activo', role removed, profile suspended.
  const suspendedApp = await db.query<{ id: string }>(
    `insert into public.producer_applications (full_name, email, status, user_id)
     values ('Suspended', 'suspended@example.test', 'activo', $1) returning id`,
    [suspended],
  );
  const ticket = await db.query<{ id: string }>(
    "insert into public.support_tickets (producer_id, subject) values ($1, 'Mi caso') returning id",
    [producer],
  );
  const otherTicket = await db.query<{ id: string }>(
    "insert into public.support_tickets (producer_id, subject) values ($1, 'Otro caso') returning id",
    [otherProducer],
  );
  await db.query("insert into storage.buckets (id, name) values ('avatars', 'avatars') on conflict do nothing");
  await db.query("insert into storage.objects (bucket_id, name) values ('avatars', $1)", [`${admin}/a.png`]);

  return {
    admin,
    producer,
    otherProducer,
    applicant,
    applicationId: app.rows[0].id,
    suspended,
    suspendedApplicationId: suspendedApp.rows[0].id,
    ticketId: ticket.rows[0].id,
    otherTicketId: otherTicket.rows[0].id,
  };
}

async function seedActiveWithoutRole(db: PGlite, email: string) {
  const activeUser = await createUser(db, { email, accountStatus: "active" });
  const app = await db.query<{ id: string }>(
    `insert into public.producer_applications (full_name, email, status, user_id)
     values ('Latent', $1, 'pending', $2) returning id`,
    [email, activeUser],
  );
  return { activeUser, appId: app.rows[0].id };
}

const roleCount = async (db: PGlite, userId: string, role: string) =>
  (await db.query("select 1 from public.user_roles where user_id = $1 and role = $2", [userId, role])).rows.length;

describe("before the fix (proves the defects were real)", () => {
  let db: PGlite;
  let ids: Ids;
  beforeAll(async () => {
    db = await createMigratedDb({ before: FIX });
    ids = await seed(db);
  }, 60_000);

  it("SR-01: any signed-in account could call approve_pas_application", async () => {
    // A pending profile was saved only by accident: the account_status trigger aborts the RPC.
    const pending = await runAs(db, { role: "authenticated", userId: ids.applicant },
      "select public.approve_pas_application($1, $2)", [ids.applicationId, ids.admin]);
    expect(pending.error).toMatch(/account_status/);

    // An account whose profile is already active (column default, or role removed by hand)
    // grants itself the productor role.
    const { activeUser, appId } = await seedActiveWithoutRole(db, "latent@example.test");
    const res = await runAs(db, { role: "authenticated", userId: activeUser },
      "select public.approve_pas_application($1, $2)", [appId, ids.admin]);
    expect(res.error).toBeNull();
    expect(await roleCount(db, activeUser, "productor")).toBe(1);
  });

  it("SR-02: an admin without the MFA step could write admin data", async () => {
    const res = await runAs(db, { role: "authenticated", userId: ids.admin },
      "update public.profiles set account_status = 'suspended' where user_id = $1 returning user_id", [ids.producer]);
    expect(res.error).toBeNull();
    expect(res.rows).toHaveLength(1);
  });

  it("SR-03: a producer could read another user's profile via a self-made policy row", async () => {
    const actor = { role: "authenticated" as const, userId: ids.producer };
    const ins = await runAs(db, actor,
      `insert into public.policies (user_id, assigned_productor_id, policy_type, start_date, end_date)
       values ($1, $2, 'auto', current_date, current_date + 365)`, [ids.otherProducer, ids.producer]);
    expect(ins.error).toBeNull();
    const read = await runAs(db, actor, "select dni from public.profiles where user_id = $1", [ids.otherProducer]);
    expect(read.rows).toHaveLength(1);
  });
});

describe("after the fix", () => {
  let db: PGlite;
  let ids: Ids;
  beforeAll(async () => {
    db = await createMigratedDb();
    ids = await seed(db);
  }, 60_000);

  describe("SR-01 approve_pas_application", () => {
    it("rejects a pending applicant approving themselves", async () => {
      const res = await runAs(db, { role: "authenticated", userId: ids.applicant },
        "select public.approve_pas_application($1, $2)", [ids.applicationId, ids.admin]);
      expect(res.error).toMatch(/permission denied/);
      expect(await roleCount(db, ids.applicant, "productor")).toBe(0);
    });

    it("rejects an active account without the productor role", async () => {
      const { activeUser, appId } = await seedActiveWithoutRole(db, "latent@example.test");
      const res = await runAs(db, { role: "authenticated", userId: activeUser },
        "select public.approve_pas_application($1, $2)", [appId, ids.admin]);
      expect(res.error).toMatch(/permission denied/);
      expect(await roleCount(db, activeUser, "productor")).toBe(0);
    });

    it("rejects a suspended producer restoring themselves", async () => {
      const res = await runAs(db, { role: "authenticated", userId: ids.suspended },
        "select public.approve_pas_application($1, $2)", [ids.suspendedApplicationId, ids.admin]);
      expect(res.error).toMatch(/permission denied/);
      expect(await roleCount(db, ids.suspended, "productor")).toBe(0);
    });

    it("rejects anon", async () => {
      const res = await runAs(db, { role: "anon" },
        "select public.approve_pas_application($1, $2)", [ids.applicationId, ids.admin]);
      expect(res.error).toMatch(/permission denied/);
    });

    it("still works for the Edge Function (service role)", async () => {
      const fresh = await createUser(db, { email: "fresh@example.test", accountStatus: "pending" });
      const app = await db.query<{ id: string }>(
        `insert into public.producer_applications (full_name, email, status, user_id)
         values ('Fresh', 'fresh@example.test', 'pending', $1) returning id`, [fresh]);
      const res = await runAs(db, { role: "service_role" },
        "select public.approve_pas_application($1, $2) as r", [app.rows[0].id, ids.admin]);
      expect(res.error).toBeNull();
      expect(await roleCount(db, fresh, "productor")).toBe(1);
    });

    it("refuses a non-admin id even from the service role", async () => {
      const res = await runAs(db, { role: "service_role" },
        "select public.approve_pas_application($1, $2)", [ids.applicationId, ids.producer]);
      expect(res.error).toMatch(/FORBIDDEN/);
    });

    it("hides has_role from anon", async () => {
      const res = await runAs(db, { role: "anon" }, "select public.has_role($1, 'admin')", [ids.admin]);
      expect(res.error).toMatch(/permission denied/);
    });
  });

  describe("SR-02 admin MFA for writes and personal data", () => {
    const sessionId = "admin-session";

    it("blocks admin writes and PII reads without MFA", async () => {
      const actor = { role: "authenticated" as const, userId: ids.admin, sessionId: "no-mfa" };
      const upd = await runAs(db, actor,
        "update public.profiles set full_name = 'x' where user_id = $1 returning user_id", [ids.producer]);
      expect(upd.rows).toHaveLength(0);
      const apps = await runAs(db, actor, "select id from public.producer_applications");
      expect(apps.rows).toHaveLength(0);
      const ins = await runAs(db, actor,
        "insert into public.academy_modules (title, slug) values ('m', 'm-no-mfa')");
      expect(ins.error).toMatch(/row-level security/);
    });

    it("keeps content readable for an admin without MFA", async () => {
      await db.query("insert into public.academy_modules (title, slug) values ('Draft', 'draft')");
      const res = await runAs(db, { role: "authenticated", userId: ids.admin, sessionId: "no-mfa" },
        "select slug from public.academy_modules where slug = 'draft'");
      expect(res.rows).toHaveLength(1);
    });

    it("lets an MFA-verified admin read and write", async () => {
      await verifyAdminMfa(db, ids.admin, sessionId);
      const actor = { role: "authenticated" as const, userId: ids.admin, sessionId };
      const apps = await runAs(db, actor, "select id from public.producer_applications");
      expect(apps.rows.length).toBeGreaterThan(0);
      const upd = await runAs(db, actor,
        "update public.profiles set account_status = 'suspended' where user_id = $1 returning user_id", [ids.otherProducer]);
      expect(upd.error).toBeNull();
      expect(upd.rows).toHaveLength(1);
      const ins = await runAs(db, actor, "insert into public.academy_modules (title, slug) values ('m', 'm-mfa')");
      expect(ins.error).toBeNull();
    });

    it("does not let an MFA verification carry over to another session", async () => {
      const res = await runAs(db, { role: "authenticated", userId: ids.admin, sessionId: "other" },
        "select id from public.producer_applications");
      expect(res.rows).toHaveLength(0);
    });
  });

  describe("SR-03 producer cannot reach other users' profiles", () => {
    it("blocks inserting CRM policies and reading peers", async () => {
      const actor = { role: "authenticated" as const, userId: ids.producer };
      const ins = await runAs(db, actor,
        `insert into public.policies (user_id, assigned_productor_id, policy_type, start_date, end_date)
         values ($1, $2, 'auto', current_date, current_date + 365)`, [ids.otherProducer, ids.producer]);
      expect(ins.error).toMatch(/row-level security/);
      const read = await runAs(db, actor, "select dni from public.profiles where user_id = $1", [ids.otherProducer]);
      expect(read.rows).toHaveLength(0);
    });

    it("still reads own profile", async () => {
      const res = await runAs(db, { role: "authenticated", userId: ids.producer },
        "select user_id from public.profiles where user_id = $1", [ids.producer]);
      expect(res.rows).toHaveLength(1);
    });
  });

  describe("SR-04 profile self-service limits", () => {
    const actor = () => ({ role: "authenticated" as const, userId: ids.producer });

    it("allows editing personal fields", async () => {
      const res = await runAs(db, actor(),
        "update public.profiles set phone = '1144445555', city = 'Escobar' where user_id = $1 returning user_id", [ids.producer]);
      expect(res.error).toBeNull();
      expect(res.rows).toHaveLength(1);
    });

    it("rejects changing email, account_status or another user's row", async () => {
      const email = await runAs(db, actor(),
        "update public.profiles set email = 'attacker@example.test' where user_id = $1", [ids.producer]);
      expect(email.error).toMatch(/email del perfil/);
      const status = await runAs(db, { role: "authenticated", userId: ids.suspended },
        "update public.profiles set account_status = 'active' where user_id = $1", [ids.suspended]);
      expect(status.error).toMatch(/account_status/);
      const other = await runAs(db, actor(),
        "update public.profiles set phone = '1' where user_id = $1 returning user_id", [ids.otherProducer]);
      expect(other.rows).toHaveLength(0);
    });

    it("rejects self-inserting an active profile", async () => {
      const { rows } = await db.query<{ id: string }>(
        "insert into auth.users (email) values ('noprofile@example.test') returning id");
      const res = await runAs(db, { role: "authenticated", userId: rows[0].id },
        "insert into public.profiles (user_id, email, account_status) values ($1, 'noprofile@example.test', 'active')",
        [rows[0].id]);
      expect(res.error).toMatch(/account_status/);
    });
  });

  describe("SR-05 consultas", () => {
    it("lets a producer open a case and write with their own attachment path", async () => {
      const actor = { role: "authenticated" as const, userId: ids.producer };
      const t = await runAs<{ id: string }>(db, actor,
        "insert into public.support_tickets (producer_id, subject) values ($1, 'Nuevo') returning id", [ids.producer]);
      expect(t.error).toBeNull();
      const m = await runAs(db, actor,
        `insert into public.support_messages (ticket_id, author_user_id, body, attachment_path)
         values ($1, $2, 'hola', $3)`,
        [t.rows[0].id, ids.producer, `${t.rows[0].id}/${ids.producer}/1-doc.pdf`]);
      expect(m.error).toBeNull();
    });

    it("rejects pre-resolved cases and foreign attachment paths", async () => {
      const actor = { role: "authenticated" as const, userId: ids.producer };
      const t = await runAs(db, actor,
        "insert into public.support_tickets (producer_id, subject, status) values ($1, 'x', 'resuelto')", [ids.producer]);
      expect(t.error).toMatch(/row-level security/);
      const m = await runAs(db, actor,
        `insert into public.support_messages (ticket_id, author_user_id, body, attachment_path)
         values ($1, $2, 'mirá', $3)`,
        [ids.ticketId, ids.producer, `${ids.otherTicketId}/${ids.otherProducer}/secret.pdf`]);
      expect(m.error).toMatch(/row-level security/);
    });

    it("keeps producers out of other producers' cases", async () => {
      const actor = { role: "authenticated" as const, userId: ids.producer };
      const read = await runAs(db, actor, "select id from public.support_tickets where id = $1", [ids.otherTicketId]);
      expect(read.rows).toHaveLength(0);
      const write = await runAs(db, actor,
        "insert into public.support_messages (ticket_id, author_user_id, body) values ($1, $2, 'x')",
        [ids.otherTicketId, ids.producer]);
      expect(write.error).toMatch(/row-level security/);
    });
  });

  describe("SR-06 anonymous inserts", () => {
    it("accepts a plain lead but not one pre-assigned to a producer", async () => {
      const ok = await runAs(db, { role: "anon" },
        "insert into public.leads (full_name, email) values ('Ana', 'ana@example.test')");
      expect(ok.error).toBeNull();
      const bad = await runAs(db, { role: "anon" },
        "insert into public.leads (full_name, email, assigned_productor_id) values ('Ana', 'ana@example.test', $1)",
        [ids.producer]);
      expect(bad.error).toMatch(/row-level security/);
    });

    it("does not let clients forge audit entries", async () => {
      const res = await runAs(db, { role: "authenticated", userId: ids.producer },
        "insert into public.audit_logs (actor_user_id, action, entity_type) values ($1, 'x', 'y')", [ids.producer]);
      expect(res.error).toMatch(/row-level security/);
    });

    it("never exposes producer applications or roles to anon", async () => {
      const apps = await runAs(db, { role: "anon" }, "select id from public.producer_applications");
      expect(apps.rows).toHaveLength(0);
      const roles = await runAs(db, { role: "anon" },
        "insert into public.user_roles (user_id, role) values ($1, 'admin')", [ids.applicant]);
      expect(roles.error).not.toBeNull();
    });
  });

  describe("SR-07 avatars", () => {
    it("hides the avatar listing (user ids) from accounts without portal access", async () => {
      const res = await runAs(db, { role: "authenticated", userId: ids.applicant },
        "select name from storage.objects where bucket_id = 'avatars'");
      expect(res.rows).toHaveLength(0);
    });

    it("keeps avatars visible to producers", async () => {
      const res = await runAs(db, { role: "authenticated", userId: ids.producer },
        "select name from storage.objects where bucket_id = 'avatars'");
      expect(res.rows.length).toBeGreaterThan(0);
    });
  });

  describe("role escalation", () => {
    it("blocks users granting themselves roles, even admins without MFA", async () => {
      const self = await runAs(db, { role: "authenticated", userId: ids.applicant },
        "insert into public.user_roles (user_id, role) values ($1, 'productor')", [ids.applicant]);
      expect(self.error).toMatch(/row-level security/);
      const rpc = await runAs(db, { role: "authenticated", userId: ids.producer },
        "select public.grant_admin_role($1)", [ids.producer]);
      expect(rpc.error).toMatch(/FORBIDDEN/);
      const adminNoMfa = await runAs(db, { role: "authenticated", userId: ids.admin, sessionId: "no-mfa-2" },
        "select public.grant_admin_role($1)", [ids.producer]);
      expect(adminNoMfa.error).toMatch(/FORBIDDEN/);
    });

    it("blocks revoke/restore RPCs for non-admins", async () => {
      const res = await runAs(db, { role: "authenticated", userId: ids.suspended },
        "select public.restore_pas_producer($1)", [ids.suspended]);
      expect(res.error).toMatch(/FORBIDDEN/);
    });
  });

  describe("SR-09 admin-entered links", () => {
    it("rejects script URLs even from an MFA admin, accepts https", async () => {
      await verifyAdminMfa(db, ids.admin, "links");
      const actor = { role: "authenticated" as const, userId: ids.admin, sessionId: "links" };
      const bad = await runAs(db, actor,
        "insert into public.pas_resources (title, resource_type, external_url) values ('x', 'link', 'javascript:alert(1)')");
      expect(bad.error).toMatch(/pas_resources_external_url_http/);
      const ok = await runAs(db, actor,
        "insert into public.pas_resources (title, resource_type, external_url) values ('x', 'link', 'https://example.com/doc')");
      expect(ok.error).toBeNull();
    });
  });

  describe("deployment", () => {
    it("rolls back cleanly and re-applies idempotently", async () => {
      const scratch = await createMigratedDb();
      const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
      await scratch.exec(read("docs/security/rollback_20261103131256_security_review_hardening.sql"));
      const restored = await scratch.query("select 1 from pg_policies where policyname = 'Productores can insert policies'");
      expect(restored.rows).toHaveLength(1);
      await scratch.exec(read(`supabase/migrations/${FIX}`));
      await scratch.exec(read(`supabase/migrations/${FIX}`));
      const gone = await scratch.query("select 1 from pg_policies where policyname = 'Productores can insert policies'");
      expect(gone.rows).toHaveLength(0);
    }, 60_000);
  });

  describe("SR-08 grants", () => {
    it("removes TRUNCATE from API roles", async () => {
      const { rows } = await db.query<{ t: boolean }>(
        "select has_table_privilege('anon', 'public.profiles', 'TRUNCATE') as t");
      expect(rows[0].t).toBe(false);
    });
  });
});
