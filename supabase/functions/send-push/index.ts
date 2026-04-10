import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = "mailto:admin@slokey.app";

function b64urlToBytes(b64: string): Uint8Array {
  const b64std = b64.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64std);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}
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
  return {
    Authorization: `vapid t=${toSign}.${bytesToB64url(new Uint8Array(sig))},k=${VAPID_PUBLIC_KEY}`,
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
  const serverPubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", serverKeyPair.publicKey));
  const ikm = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: clientPub }, serverKeyPair.privateKey, 256)
  );
  const salt = crypto.getRandomValues(new Uint8Array(16));

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
    const clientPubRaw = b64urlToBytes(sub.p256dh);
    const info = new Uint8Array(18 + t.length + 1 + 1 + 2 + serverPubRaw.length + 2 + clientPubRaw.length);
    let i = 0;
    const set = (b: Uint8Array) => { info.set(b, i); i += b.length; };
    set(enc.encode("Content-Encoding: ")); set(t); set(new Uint8Array([0])); set(new Uint8Array([0]));
    const view = new DataView(info.buffer);
    view.setUint16(i, serverPubRaw.length); i += 2; set(serverPubRaw);
    view.setUint16(i, clientPubRaw.length); i += 2; set(clientPubRaw);
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
    const res = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Encoding": "aesgcm",
        "Encryption": `salt=${bytesToB64url(salt)}`,
        "Crypto-Key": `dh=${bytesToB64url(serverPubRaw)};vapid=${VAPID_PUBLIC_KEY}`,
        "Content-Length": String(encrypted.length),
      },
      body: encrypted,
    });
    return res.status;
  } catch {
    return 0;
  }
}

// AIの自動投稿かどうかを判定
const AUTO_AUTHOR_PATTERNS = [
  "編集部AI", "スロ好き編集マン", "スロキー編集部", "パチスロ記者",
  "編集長補佐", "ライター見習い", "スロ専門編集", "深夜のスロライター", "編集部のマニア",
];
function isAutoPost(record: Record<string, unknown>): boolean {
  const source = String(record.source ?? "");
  const author = String((record.internal as Record<string, unknown>)?.author ?? record.author ?? "");
  if (source !== "manual") return true;
  if (AUTO_AUTHOR_PATTERNS.some(p => author.includes(p))) return true;
  return false;
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const record = body.record;
    if (!record) return new Response("no record", { status: 400 });

    // 手動投稿以外はスキップ
    if (isAutoPost(record)) {
      return new Response(JSON.stringify({ skipped: true, reason: "auto post" }), { status: 200 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 通知設定取得
    const { data: settings } = await supabase
      .from("notification_settings")
      .select("enabled, maintenance_message, pending_count, notify_threshold")
      .eq("id", 1)
      .single();

    if (!settings?.enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: "notifications disabled" }), { status: 200 });
    }

    const threshold = settings.notify_threshold ?? 3;
    const newCount = (settings.pending_count ?? 0) + 1;

    if (newCount < threshold) {
      // まだ閾値未満 → カウントだけ増やして終了
      await supabase.from("notification_settings")
        .update({ pending_count: newCount, updated_at: new Date().toISOString() })
        .eq("id", 1);
      return new Response(JSON.stringify({ buffered: true, pending: newCount, threshold }), { status: 200 });
    }

    // 閾値到達 → 通知送信してカウントリセット
    await supabase.from("notification_settings")
      .update({ pending_count: 0, updated_at: new Date().toISOString() })
      .eq("id", 1);

    const { data: subs } = await supabase.from("push_subscriptions").select("*");
    if (!subs || subs.length === 0) {
      return new Response("no subscribers", { status: 200 });
    }

    const message = {
      title: "📢 SLOKEY 新着投稿",
      body: `手動投稿が${threshold}件たまりました！チェックしてみてください`,
      tag: "slokey-batch",
      url: "/",
    };

    const results = await Promise.allSettled(subs.map(s => sendPush(s, message)));

    // 無効な購読を削除
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "fulfilled" && (r.value === 410 || r.value === 404)) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", subs[i].endpoint);
      }
    }

    const failed = results.filter(r => r.status === "rejected").length;
    return new Response(JSON.stringify({ sent: subs.length, failed, threshold }), { status: 200 });
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});
