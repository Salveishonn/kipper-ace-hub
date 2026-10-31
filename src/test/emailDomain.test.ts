import { beforeAll, describe, expect, it, vi } from "vitest";
import { emailDomainCanReceiveMail } from "../../supabase/functions/_shared/emailDomain";

// jsdom's AbortSignal has no timeout(), which the Edge Runtime does have.
beforeAll(() => {
  AbortSignal.timeout ??= () => new AbortController().signal;
});

function dnsReplies(replies: { MX: unknown; A?: unknown }) {
  return vi.fn(async (url: string) => {
    const type = new URL(url).searchParams.get("type") as "MX" | "A";
    return new Response(JSON.stringify(replies[type]), { status: 200 });
  }) as unknown as typeof fetch;
}

describe("emailDomainCanReceiveMail", () => {
  it("rejects a domain that does not exist", async () => {
    expect(await emailDomainCanReceiveMail("a@nope.test", dnsReplies({ MX: { Status: 3 } }))).toBe(false);
  });

  it("accepts a domain with MX records", async () => {
    const fetchFn = dnsReplies({ MX: { Status: 0, Answer: [{ type: 15, data: "10 mx.zoho.com." }] } });
    expect(await emailDomainCanReceiveMail("a@washero.ar", fetchFn)).toBe(true);
  });

  it("rejects a domain that declares it accepts no email", async () => {
    const fetchFn = dnsReplies({ MX: { Status: 0, Answer: [{ type: 15, data: "0 ." }] } });
    expect(await emailDomainCanReceiveMail("a@nomail.test", fetchFn)).toBe(false);
  });

  it("falls back to the domain's address when it has no MX records", async () => {
    const withAddress = dnsReplies({ MX: { Status: 0 }, A: { Status: 0, Answer: [{ type: 1, data: "1.2.3.4" }] } });
    const withoutAddress = dnsReplies({ MX: { Status: 0 }, A: { Status: 0 } });
    expect(await emailDomainCanReceiveMail("a@site.test", withAddress)).toBe(true);
    expect(await emailDomainCanReceiveMail("a@site.test", withoutAddress)).toBe(false);
  });

  it("does not turn applicants away when DNS has problems", async () => {
    const down = vi.fn().mockRejectedValue(new Error("timeout")) as unknown as typeof fetch;
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await emailDomainCanReceiveMail("a@gmail.com", down)).toBe(true);
    expect(await emailDomainCanReceiveMail("a@gmail.com", dnsReplies({ MX: { Status: 2 } }))).toBe(true);
    error.mockRestore();
  });

  it("only looks up the domain, never the full address", async () => {
    const fetchFn = dnsReplies({ MX: { Status: 3 } });
    await emailDomainCanReceiveMail("private.person@nope.test", fetchFn);
    expect(String(vi.mocked(fetchFn).mock.calls[0][0])).not.toContain("private.person");
  });
});
