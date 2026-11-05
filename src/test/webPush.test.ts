// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  b64urlDecode,
  b64urlEncode,
  encryptPushPayload,
  rawPublicKey,
  sendWebPush,
  vapidAuthorization,
} from "../../supabase/functions/_shared/webPush";

// RFC 8291, Appendix A.
const RFC = {
  plaintext: "When I grow up, I want to be a watermelon",
  asPrivate: "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw",
  asPublic: "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8",
  uaPublic: "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
  authSecret: "BTBZMqHH6r4Tts7J_aSIgg",
  salt: "DGv6ra1nlYgDCS1FRnbzlw",
  body:
    "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN",
};

async function vapidKeys() {
  const pair = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  return {
    pair,
    keys: {
      publicJwk: await crypto.subtle.exportKey("jwk", pair.publicKey),
      privateJwk: await crypto.subtle.exportKey("jwk", pair.privateKey),
    },
  };
}

describe("web push", () => {
  it("matches the RFC 8291 test vector", async () => {
    const body = await encryptPushPayload(
      new TextEncoder().encode(RFC.plaintext),
      { p256dh: RFC.uaPublic, auth: RFC.authSecret },
      {
        senderPrivate: b64urlDecode(RFC.asPrivate),
        senderPublic: b64urlDecode(RFC.asPublic),
        salt: b64urlDecode(RFC.salt),
      },
    );
    expect(b64urlEncode(body)).toBe(RFC.body);
  });

  it("signs a VAPID JWT the push service can verify", async () => {
    const { pair, keys } = await vapidKeys();
    const header = await vapidAuthorization("https://fcm.googleapis.com/fcm/send/abc", keys, "mailto:a@b.c");
    const [, jwt, k] = header.match(/^vapid t=([^,]+), k=(.+)$/)!;
    expect(k).toBe(b64urlEncode(rawPublicKey(keys.publicJwk)));

    const [h, c, sig] = jwt.split(".");
    const claims = JSON.parse(new TextDecoder().decode(b64urlDecode(c)));
    expect(claims.aud).toBe("https://fcm.googleapis.com");
    expect(claims.sub).toBe("mailto:a@b.c");
    const valid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      pair.publicKey,
      b64urlDecode(sig),
      new TextEncoder().encode(`${h}.${c}`),
    );
    expect(valid).toBe(true);
  });

  it("reports expired subscriptions as gone", async () => {
    const { keys } = await vapidKeys();
    const fetchFn = (async () => new Response("", { status: 410 })) as typeof fetch;
    const res = await sendWebPush(
      { endpoint: "https://push.example/x", p256dh: RFC.uaPublic, auth: RFC.authSecret },
      { title: "Hola" },
      keys,
      "mailto:a@b.c",
      fetchFn,
    );
    expect(res).toMatchObject({ ok: false, gone: true, status: 410 });
  });
});
