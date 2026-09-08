import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260908120000_support_notifications_and_rpc_hardening.sql"),
  "utf8",
);

describe("authorization hardening migration", () => {
  it("creates a private notification outbox with idempotent events", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.notification_outbox");
    expect(migration).toContain("UNIQUE (event_type, event_id)");
    expect(migration).toContain("REVOKE ALL ON TABLE public.notification_outbox FROM PUBLIC, anon, authenticated");
  });

  it("does not notify from admin-authored messages and uses producer-only enqueue", () => {
    expect(migration).toContain("role = 'admin'");
    expect(migration).toContain("IF is_admin_author THEN");
    expect(migration).toContain("case.created");
    expect(migration).toContain("case.message.created");
  });

  it("revokes anon execute on privileged SECURITY DEFINER RPCs", () => {
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.approve_pas_application(uuid, uuid) FROM anon");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.revoke_pas_producer(uuid) FROM anon");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.activate_pas_on_email_confirmed() FROM PUBLIC, anon, authenticated");
  });

  it("removes anonymous quote-upload storage writes", () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "Anyone can upload quote files" ON storage.objects');
  });
});

const followUp = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260908121500_outbox_deny_and_rpc_grants.sql"),
  "utf8",
);

describe("outbox deny policies", () => {
  it("denies client access to notification_outbox and MFA tables", () => {
    expect(followUp).toContain("no client access to notification_outbox");
    expect(followUp).toContain("REVOKE ALL ON FUNCTION public.get_my_producer_application() FROM anon");
  });
});

const mfaLockdown = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260908133000_mfa_tokens_and_storage_lockdown.sql"),
  "utf8",
);

describe("MFA and token lockdown", () => {
  it("requires an MFA session to mutate user_roles and PAS revoke/restore", () => {
    expect(mfaLockdown).toContain("USING (public.is_admin_session())");
    expect(mfaLockdown).toContain("IF caller IS NULL OR NOT public.is_admin_session() THEN");
  });

  it("keeps integration_tokens off PostgREST for clients", () => {
    expect(mfaLockdown).toContain("no client access to integration_tokens");
    expect(mfaLockdown).toContain("REVOKE ALL ON TABLE public.integration_tokens FROM PUBLIC, anon, authenticated");
  });

  it("stops productores reading every payment-proof object", () => {
    expect(mfaLockdown).toContain('DROP POLICY IF EXISTS "Productores read payment proofs" ON storage.objects');
  });
});

const storageLimits = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260908155027_storage_bucket_upload_limits.sql"),
  "utf8",
);

describe("storage bucket upload limits", () => {
  it("sets private-bucket size and MIME allowlists", () => {
    expect(storageLimits).toContain("file_size_limit = 2 * 1024 * 1024");
    expect(storageLimits).toContain("WHERE id = 'design-resources'");
    expect(storageLimits).toContain("WHERE id = 'avatars'");
    expect(storageLimits).toContain("image/jpeg");
    expect(storageLimits).toContain("application/pdf");
  });
});

const outboxFix = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260908161000_fix_outbox_event_type_ambiguity.sql"),
  "utf8",
);

describe("outbox trigger ambiguity fix", () => {
  it("renames the plpgsql event_type variable", () => {
    expect(outboxFix).toContain("v_event_type text");
    expect(outboxFix).toContain("VALUES (\n    v_event_type,");
    expect(outboxFix).not.toMatch(/DECLARE[\s\S]*\bevent_type text;/);
  });
});
