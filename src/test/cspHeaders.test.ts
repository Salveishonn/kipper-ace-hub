import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function cspValue() {
  const vercel = JSON.parse(readFileSync(resolve(process.cwd(), "vercel.json"), "utf8")) as {
    headers: Array<{ headers: Array<{ key: string; value: string }> }>;
  };
  const csp = vercel.headers
    .flatMap((block) => block.headers)
    .find((header) => header.key === "Content-Security-Policy");
  if (!csp) throw new Error("CSP header missing from vercel.json");
  return csp.value;
}

describe("production CSP", () => {
  it("lets Chrome's PDF viewer and Academy iframes load", () => {
    const csp = cspValue();
    expect(csp).toMatch(/object-src[^;]*blob:/);
    expect(csp).toMatch(/object-src[^;]*https:\/\/\*\.supabase\.co/);
    expect(csp).not.toMatch(/object-src 'none'/);
    expect(csp).toMatch(/frame-src[^;]*https:\/\/\*\.supabase\.co/);
    expect(csp).toMatch(/frame-src[^;]*https:\/\/www\.youtube\.com/);
    expect(csp).toMatch(/frame-src[^;]*https:\/\/www\.youtube-nocookie\.com/);
    expect(csp).toMatch(/frame-src[^;]*https:\/\/player\.vimeo\.com/);
    expect(csp).toMatch(/frame-src[^;]*https:\/\/view\.officeapps\.live\.com/);
  });
});
