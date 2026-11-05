// Web Push without dependencies: RFC 8291 message encryption (aes128gcm, RFC 8188) and
// RFC 8292 VAPID, on WebCrypto only, so it runs in Deno (Edge Functions) and Node (vitest).

export type PushSubscriptionKeys = { endpoint: string; p256dh: string; auth: string };

/** VAPID key pair as JWKs (P-256). The public key also goes to the browser, base64url-encoded. */
export type VapidKeys = { publicJwk: JsonWebKey; privateJwk: JsonWebKey };

const enc = new TextEncoder();

/** Byte arrays backed by a plain ArrayBuffer, as WebCrypto and fetch require. */
type Bytes = Uint8Array<ArrayBuffer>;
const utf8 = (text: string): Bytes => new Uint8Array(enc.encode(text));

export function b64urlEncode(bytes: Bytes): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64urlDecode(value: string): Bytes {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function concat(...parts: Bytes[]): Bytes {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

/** Uncompressed P-256 point (0x04 || x || y) from a JWK. */
export function rawPublicKey(jwk: JsonWebKey): Bytes {
  return concat(new Uint8Array([4]), b64urlDecode(jwk.x!), b64urlDecode(jwk.y!));
}

function jwkFromRaw(raw: Bytes, d?: Bytes): JsonWebKey {
  return {
    kty: "EC",
    crv: "P-256",
    x: b64urlEncode(raw.slice(1, 33)),
    y: b64urlEncode(raw.slice(33, 65)),
    ...(d ? { d: b64urlEncode(d) } : {}),
    ext: true,
  };
}

async function hkdf(ikm: Bytes, salt: Bytes, info: Bytes, length: number) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, length * 8);
  return new Uint8Array(bits);
}

/**
 * Encrypts one push message for a subscription (single record, RFC 8291 section 3).
 * `testing` pins the sender key and salt so the RFC 8291 Appendix A vector can be checked.
 */
export async function encryptPushPayload(
  plaintext: Bytes,
  sub: { p256dh: string; auth: string },
  testing?: { senderPrivate: Bytes; senderPublic: Bytes; salt: Bytes },
): Promise<Bytes> {
  const uaPublic = b64urlDecode(sub.p256dh);
  const authSecret = b64urlDecode(sub.auth);
  const salt = testing?.salt ?? crypto.getRandomValues(new Uint8Array(16));

  let senderPrivateKey: CryptoKey;
  let senderPublic: Bytes;
  if (testing) {
    senderPrivateKey = await crypto.subtle.importKey(
      "jwk",
      jwkFromRaw(testing.senderPublic, testing.senderPrivate),
      { name: "ECDH", namedCurve: "P-256" },
      false,
      ["deriveBits"],
    );
    senderPublic = testing.senderPublic;
  } else {
    const pair = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
      "deriveBits",
    ])) as CryptoKeyPair;
    senderPrivateKey = pair.privateKey;
    senderPublic = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  }

  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, senderPrivateKey, 256),
  );

  const keyInfo = concat(utf8("WebPush: info\0"), uaPublic, senderPublic);
  const ikm = await hkdf(ecdhSecret, authSecret, keyInfo, 32);
  const cek = await hkdf(ikm, salt, utf8("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(ikm, salt, utf8("Content-Encoding: nonce\0"), 12);

  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  // 0x02 marks the last (and only) record; no extra padding.
  const padded = concat(plaintext, new Uint8Array([2]));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded));

  const header = new Uint8Array(16 + 4 + 1 + senderPublic.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = senderPublic.length;
  header.set(senderPublic, 21);
  return concat(header, ciphertext);
}

/** `Authorization: vapid t=..., k=...` for one push service origin (RFC 8292). */
export async function vapidAuthorization(endpoint: string, keys: VapidKeys, subject: string, now = Date.now()) {
  const audience = new URL(endpoint).origin;
  const header = b64urlEncode(utf8(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64urlEncode(
    utf8(JSON.stringify({ aud: audience, exp: Math.floor(now / 1000) + 12 * 3600, sub: subject })),
  );
  const signingKey = await crypto.subtle.importKey(
    "jwk",
    keys.privateJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, signingKey, utf8(`${header}.${claims}`)),
  );
  const jwt = `${header}.${claims}.${b64urlEncode(signature)}`;
  return `vapid t=${jwt}, k=${b64urlEncode(rawPublicKey(keys.publicJwk))}`;
}

export type PushResult = { ok: true } | { ok: false; status: number; gone: boolean; error: string };

/** Sends one notification. `gone` means the subscription no longer exists and should be deleted. */
export async function sendWebPush(
  sub: PushSubscriptionKeys,
  payload: unknown,
  keys: VapidKeys,
  subject: string,
  fetchFn: typeof fetch = fetch,
): Promise<PushResult> {
  const body = await encryptPushPayload(utf8(JSON.stringify(payload)), sub);
  const res = await fetchFn(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: await vapidAuthorization(sub.endpoint, keys, subject),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: String(4 * 24 * 3600),
      Urgency: "normal",
    },
    body,
  });
  if (res.ok) return { ok: true };
  const text = await res.text().catch(() => "");
  return { ok: false, status: res.status, gone: res.status === 404 || res.status === 410, error: text.slice(0, 200) };
}
