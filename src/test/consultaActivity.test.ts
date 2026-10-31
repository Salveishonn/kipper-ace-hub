import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  consultaRef,
  formatConsultaDay,
  formatConsultaTime,
  isConsultaUnread,
  matchesAdminConsultaQueue,
} from "@/lib/consultaActivity";

const base = {
  id: "12345678-aaaa-bbbb-cccc-ddddeeeeffff",
  status: "abierto",
  last_message_at: "2026-10-31T12:00:00Z",
  last_message_by: "productor",
  producer_last_read_at: "2026-10-31T12:00:00Z",
  team_last_read_at: "2026-10-31T11:00:00Z",
};

describe("consulta activity", () => {
  it("uses the same reference as the notification emails", () => {
    expect(consultaRef(base.id)).toBe("#12345678");
  });

  it("marks a ticket unread only for the side that did not write last", () => {
    expect(isConsultaUnread(base, "equipo")).toBe(true);
    expect(isConsultaUnread(base, "productor")).toBe(false);
    expect(isConsultaUnread({ ...base, team_last_read_at: "2026-10-31T12:30:00Z" }, "equipo")).toBe(false);
    expect(isConsultaUnread({ ...base, team_last_read_at: null }, "equipo")).toBe(true);
    expect(isConsultaUnread({ ...base, last_message_by: null }, "equipo")).toBe(false);
  });

  it("sorts tickets into the admin queues", () => {
    expect(matchesAdminConsultaQueue(base, "por_responder")).toBe(true);
    expect(matchesAdminConsultaQueue(base, "esperando")).toBe(false);
    const answered = { ...base, status: "en_gestion", last_message_by: "equipo" };
    expect(matchesAdminConsultaQueue(answered, "por_responder")).toBe(false);
    expect(matchesAdminConsultaQueue(answered, "esperando")).toBe(true);
    const resolved = { ...base, status: "resuelto" };
    expect(matchesAdminConsultaQueue(resolved, "por_responder")).toBe(false);
    expect(matchesAdminConsultaQueue(resolved, "resueltas")).toBe(true);
    expect(matchesAdminConsultaQueue({ ...base, status: "cerrado" }, "cerradas")).toBe(true);
    expect(matchesAdminConsultaQueue(resolved, "todas")).toBe(true);
  });

  it("formats times for people", () => {
    const now = new Date("2026-10-31T12:00:00");
    expect(formatConsultaTime("2026-10-31T11:59:40", now)).toBe("recién");
    expect(formatConsultaTime("2026-10-31T11:30:00", now)).toContain("30");
    expect(formatConsultaTime("2026-10-01T12:00:00", now)).toContain("2026");
    expect(formatConsultaDay("2026-10-31T01:00:00", now)).toBe("Hoy");
    expect(formatConsultaDay("2026-10-30T23:00:00", now)).toBe("Ayer");
  });
});

describe("consultas migration", () => {
  const migration = readFileSync(
    resolve(process.cwd(), "supabase/migrations/20261031150000_consultas_activity_and_replies.sql"),
    "utf8",
  );

  it("emails producers about replies and resolved or closed cases", () => {
    expect(migration).toContain("v_event_type := 'case.reply.created'");
    expect(migration).toContain("'case.status.changed'");
    expect(migration).toContain("NEW.status IN ('resuelto', 'cerrado')");
  });

  it("lets producers reopen resolved cases but not closed ones", () => {
    expect(migration).toContain("WHEN from_producer AND status = 'resuelto' THEN 'abierto'");
    const allowed = "t.status IN ('abierto', 'en_gestion', 'resuelto')";
    expect(migration.split(allowed)).toHaveLength(3);
    expect(migration).not.toContain("'en_gestion', 'resuelto', 'cerrado')");
  });

  it("keeps the new functions private", () => {
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.mark_support_ticket_read(uuid) FROM PUBLIC, anon");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.tg_support_message_activity() FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.tg_enqueue_support_status_email() FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("AND (producer_id = auth.uid() OR public.is_admin())");
  });
});
