// Runs every migration in supabase/migrations on an in-process Postgres (PGlite) that mimics the
// parts of Supabase the migrations depend on: the anon/authenticated/service_role roles with
// Supabase's default grants, auth.uid()/auth.jwt() from request.jwt.claims, and storage.objects.
// This lets RLS and RPC grants be tested by what they allow, not by what the SQL text says.
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase/migrations");

const SUPABASE_BOOTSTRAP = `
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  invited_at timestamptz,
  email_confirmed_at timestamptz,
  created_at timestamptz default now()
);
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;

create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text not null,
  owner uuid,
  created_at timestamptz default now()
);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;

create schema cron;
create table cron.job (jobname text, schedule text, command text);
create function cron.schedule(job_name text, schedule text, command text) returns bigint
language sql as $$ insert into cron.job values (job_name, schedule, command); select 1::bigint $$;

create publication supabase_realtime;

grant usage on schema public, auth, storage to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
grant execute on function storage.foldername(text) to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to anon, authenticated, service_role;
grant select on storage.buckets to anon, authenticated, service_role;

-- Supabase's default privileges: every table/function created by postgres in public is
-- granted directly to the API roles (which is why REVOKE ... FROM PUBLIC is not enough).
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`;

/** Hosted-only extensions are unavailable in PGlite; their callers already guard on pg_extension. */
function adaptMigration(sql: string): string {
  return sql.replace(/CREATE EXTENSION IF NOT EXISTS pg_cron[^;]*;/gi, "");
}

export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

/** `before` stops ahead of that migration file, to show a defect existed before its fix. */
export async function createMigratedDb(opts: { before?: string } = {}): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SUPABASE_BOOTSTRAP);
  for (const file of migrationFiles()) {
    if (opts.before && file >= opts.before) break;
    const sql = adaptMigration(readFileSync(resolve(MIGRATIONS_DIR, file), "utf8"));
    try {
      await db.exec(sql);
    } catch (e) {
      throw new Error(`migration ${file} failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return db;
}

export type Actor =
  | { role: "anon" }
  | { role: "service_role" }
  | { role: "authenticated"; userId: string; sessionId?: string };

/**
 * Runs one statement as a PostgREST request would: inside its own transaction, with the
 * JWT claims set and the API role assumed. Errors are returned, not thrown.
 */
export async function runAs<T = Record<string, unknown>>(
  db: PGlite,
  actor: Actor,
  sql: string,
  params: unknown[] = [],
): Promise<{ rows: T[]; error: string | null }> {
  const claims =
    actor.role === "authenticated"
      ? { sub: actor.userId, role: "authenticated", session_id: actor.sessionId ?? `s-${actor.userId}` }
      : { role: actor.role };
  try {
    const rows = await db.transaction(async (tx) => {
      await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
      await tx.query(`set local role ${actor.role}`);
      const res = await tx.query<T>(sql, params);
      return res.rows;
    });
    return { rows, error: null };
  } catch (e) {
    return { rows: [], error: e instanceof Error ? e.message : String(e) };
  }
}

export async function createUser(
  db: PGlite,
  opts: {
    email: string;
    roles?: Array<"admin" | "productor" | "cliente">;
    accountStatus?: "pending" | "active" | "suspended";
    profile?: boolean;
  },
): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    "insert into auth.users (email, email_confirmed_at) values ($1, now()) returning id",
    [opts.email],
  );
  const id = rows[0].id;
  if (opts.profile !== false) {
    await db.query(
      "insert into public.profiles (user_id, email, full_name, dni, account_status) values ($1, $2, $3, $4, $5)",
      [id, opts.email, `Nombre ${opts.email}`, "30111222", opts.accountStatus ?? "active"],
    );
  }
  for (const role of opts.roles ?? []) {
    await db.query("insert into public.user_roles (user_id, role) values ($1, $2)", [id, role]);
  }
  return id;
}

/** What the admin-mfa Edge Function records after a correct emailed code. */
export async function verifyAdminMfa(db: PGlite, userId: string, sessionId = `s-${userId}`) {
  await db.query(
    `insert into public.admin_mfa_verifications (user_id, session_id, expires_at)
     values ($1, $2, now() + interval '1 hour')
     on conflict (user_id, session_id) do update set expires_at = excluded.expires_at`,
    [userId, sessionId],
  );
}
