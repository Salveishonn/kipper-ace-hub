// @vitest-environment node
// Signup trigger stores the "código en compañía" answer from untrusted signup metadata.
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createMigratedDb } from "./supabaseDb";

async function signUp(db: PGlite, email: string, meta: Record<string, unknown>) {
  await db.query(
    "insert into auth.users (email, raw_user_meta_data) values ($1, $2)",
    [email, JSON.stringify({ pas_applicant: true, full_name: "Ana", ...meta })],
  );
  const { rows } = await db.query<{ has_insurer_code: boolean | null; insurer_codes: unknown }>(
    "select has_insurer_code, insurer_codes from public.producer_applications where email = $1",
    [email],
  );
  return rows[0];
}

describe("PAS insurer codes on signup", () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await createMigratedDb();
  }, 60_000);

  it("stores company/code pairs when the applicant has a code", async () => {
    const row = await signUp(db, "si@example.test", {
      has_insurer_code: true,
      insurer_codes: [{ company: " Federación Patronal ", code: "123" }, { company: "", code: "x" }],
    });
    expect(row.has_insurer_code).toBe(true);
    expect(row.insurer_codes).toEqual([{ company: "Federación Patronal", code: "123" }]);
  });

  it("stores 'no' with no codes, even if codes were sent", async () => {
    const row = await signUp(db, "no@example.test", {
      has_insurer_code: false,
      insurer_codes: [{ company: "La Caja", code: "9" }],
    });
    expect(row.has_insurer_code).toBe(false);
    expect(row.insurer_codes).toEqual([]);
  });

  it("ignores malformed metadata instead of failing the signup", async () => {
    const row = await signUp(db, "bad@example.test", { has_insurer_code: true, insurer_codes: "nope" });
    expect(row.has_insurer_code).toBe(true);
    expect(row.insurer_codes).toEqual([]);
  });

  it("puts the answer in the team notification", async () => {
    const { rows } = await db.query<{ payload: Record<string, unknown> }>(
      `select o.payload from public.notification_outbox o
       join public.producer_applications a on a.id::text = o.event_id
       where a.email = 'si@example.test'`,
    );
    expect(rows[0].payload.has_insurer_code).toBe(true);
    expect(rows[0].payload.insurer_codes).toEqual([{ company: "Federación Patronal", code: "123" }]);
  });
});
