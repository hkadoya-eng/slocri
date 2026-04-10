import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = "mailto:admin@slokey.app";

// Base64url → Uint8Array
function b64urlToBytes(b64: string): Uint8Array {
  const b64std = b64.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64std);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

// Uint8Array → Base64url
function bytesToB64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function buildVapidHeaders(audience: string): Promise<Record<string, string>> {
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 3600, sub: VAPID_SUBJECT };
  const header = { typ: "JWT", alg: "ES256" };

  const enc = new TextEncoder();
  const headerB64 = bytesToB64url(enc.encode(JSON.stringify(header)));
  const payloadB64 = bytesToB64url(enc.encode(JSON.stringify(payload)));
  const toSign = `${headerB64}.${payloadB64}`;

  const privBytes = b64urlToBytes(VAPID_PRIVATE_KEY);
  const cryptoKey = await crypto.subtle.importKey(
    "raw", privBytes, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, cryptoKey, enc.encode(toSign)
  );
  const jwt = `${toSign}.${bytesToB64url(new Uint8Array(sig))}`;

  return {
    Authorization: `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
    "Content-Type": "application/octet-stream",
    TTL: "86400",
  };
}

async function encryptPayload(sub: { p256dh: string; auth: string }, payload: string) {
  const enc = new TextEncoder();
  const clientPub = await crypto.subtle.importKey(
    "raw", b64urlToBytes(sub.p256dh), { name: "ECDH", namedCurve: "P-256" }, true, []
  );
  const authBytes = b64urlToBytes(sub.auth);
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]
  );
  const serverPubRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", serverKeyPair.publicKey)
  );
  const ikm = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: clientPub }, serverKeyPair.privateKey, 256)
  );
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF
  async function hkdf(prk: Uint8Array, info: Uint8Array, len: number) {
    const key = await crypto.subtle.importKey("raw", prk, { name: "HKDF" }, false, ["deriveBits"]);
    return new Uint8Array(await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info }, key, len * 8
    ));
  }

  const prkInfoParts = [enc.encode("Content-Encoding: auth\0"), authBytes];
  const prkInfo = new Uint8Array(prkInfoParts.reduce((a, b) => a + b.length, 0));
  let off = 0;
  for (const p of prkInfoParts) { prkInfo.set(p, off); off += p.length; }

  const prk = await hkdf(ikm, prkInfo, 32);

  function buildInfo(type: string) {
    const t = enc.encode(type);
    const info = new Uint8Array(18 + t.length + 1 + 1 + 2 + serverPubRaw.length + 2 + b64urlToBytes(sub.p256dh).length);
    let i = 0;
    const set = (b: Uint8Array) => { info.set(b, i); i += b.length; };
    set(enc.encode("Content-Encoding: ")); set(t); set(new Uint8Array([0]));
    set(new Uint8Array([0]));
    const view = new DataView(info.buffer);
    view.setUint16(i, serverPubRaw.length); i += 2; set(serverPubRaw);
    view.setUint16(i, b64urlToBytes(sub.p256dh).length); i += 2; set(b64urlToBytes(sub.p256dh));
    return info;
  }

  const cek = await hkdf(prk, buildInfo("aesgcm128"), 16);
  const nonce = await hkdf(prk, buildInfo("nonce"), 12);

  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const msgBytes = enc.encode(payload);
  const padded = new Uint8Array(2 + msgBytes.length);
  padded.set(msgBytes, 2);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, tagLength: 128 }, aesKey, padded)
  );

  return { encrypted, salt, serverPubRaw };
}

async function sendPush(sub: { endpoint: string; p256dh: string; auth: string }, message: object) {
  const payload = JSON.stringify(message);
  const url = new URL(sub.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const headers = await buildVapidHeaders(audience);

  try {
    const { encrypted, salt, serverPubRaw } = await encryptPayload(sub, payload);
    const body = new Uint8Array(encrypted.length);
    body.set(encrypted);

    const res = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Encoding": "aesgcm",
        "Encryption": `salt=${bytesToB64url(salt)}`,
        "Crypto-Key": `dh=${bytesToB64url(serverPubRaw)};vapid=${VAPID_PUBLIC_KEY}`,
        "Content-Length": String(body.length),
      },
      body,
    });
    return res.status;
  } catch {
    return 0;
  }
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const record = body.record;
    if (!record) return new Response("no record", { status: 400 });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 通知設定チェック
    const { data: settings } = await supabase
      .from("notification_settings")
      .select("enabled, maintenance_message")
      .eq("id", 1)
      .single();

    if (!settings?.enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: "notifications disabled" }), { status: 200 });
    }

    // 全購読取得
    const { data: subs } = await supabase.from("push_subscriptions").select("*");
    if (!subs || subs.length === 0) return new Response("no subscribers", { status: 200 });

    const message = {
      title: `📢 新着投稿：${record.machine || ""}`,
      body: record.title || "新しい投稿があります",
      tag: `post-${record.id}`,
      url: "/",
    };

    const results = await Promise.allSettled(subs.map(s => sendPush(s, message)));
    const failed = results.filter(r => r.status === "rejected" || (r.status === "fulfilled" && (r.value === 410 || r.value === 404)));

    // 無効な購読を削除
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "fulfilled" && (r.value === 410 || r.value === 404)) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", subs[i].endpoint);
      }
    }

    return new Response(JSON.stringify({ sent: subs.length, failed: failed.length }), { status: 200 });
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});
