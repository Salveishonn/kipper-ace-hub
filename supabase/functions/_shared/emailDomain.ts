const DNS_LOOKUP_URL = "https://cloudflare-dns.com/dns-query";
const DNS_TIMEOUT_MS = 3000;
const NXDOMAIN = 3;
const TYPE_MX = 15;
const TYPE_A = 1;

type DnsAnswer = { Status?: number; Answer?: Array<{ type?: number; data?: string }> };

async function lookup(domain: string, type: "MX" | "A", fetchFn: typeof fetch): Promise<DnsAnswer> {
  const url = `${DNS_LOOKUP_URL}?name=${encodeURIComponent(domain)}&type=${type}`;
  const res = await fetchFn(url, {
    headers: { Accept: "application/dns-json" },
    signal: AbortSignal.timeout(DNS_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`DNS lookup failed: ${res.status}`);
  return await res.json();
}

/**
 * False only when DNS clearly says the domain cannot receive email.
 * Any lookup problem counts as true: a DNS outage must not turn real applicants away.
 */
export async function emailDomainCanReceiveMail(
  email: string,
  fetchFn: typeof fetch = fetch,
): Promise<boolean> {
  const domain = email.slice(email.lastIndexOf("@") + 1);
  try {
    const mx = await lookup(domain, "MX", fetchFn);
    if (mx.Status === NXDOMAIN) return false;
    if (mx.Status !== 0) return true;

    const mxRecords = (mx.Answer ?? []).filter((record) => record.type === TYPE_MX);
    // RFC 7505: a single "0 ." record declares that the domain accepts no email.
    if (mxRecords.length) {
      return !(mxRecords.length === 1 && mxRecords[0].data?.trim() === "0 .");
    }

    // RFC 5321: without MX records, mail falls back to the domain's own address.
    const a = await lookup(domain, "A", fetchFn);
    if (a.Status !== 0) return a.Status !== NXDOMAIN;
    return (a.Answer ?? []).some((record) => record.type === TYPE_A);
  } catch (e) {
    console.error("email domain lookup failed", e instanceof Error ? e.message : e);
    return true;
  }
}
