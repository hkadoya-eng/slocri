export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL required" });

  try {
    const pageRes = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!pageRes.ok) throw new Error(`HTTP ${pageRes.status}`);

    const html = await pageRes.text();

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "";

    if (!title) throw new Error("タイトル取得失敗");

    const blocked = ["cloudflare", "just a moment", "attention required", "access denied", "403", "bot"].some(w => title.toLowerCase().includes(w));
    if (blocked) throw new Error("ページを取得できません");

    const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
                      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    let ogImage = ogImageMatch ? ogImageMatch[1].trim() : "";

    if (ogImage) {
      // 相対URLを絶対URLに変換
      if (ogImage.startsWith("//")) {
        ogImage = "https:" + ogImage;
      } else if (ogImage.startsWith("/")) {
        const base = new URL(url);
        ogImage = base.origin + ogImage;
      } else if (!ogImage.startsWith("http")) {
        const base = new URL(url);
        ogImage = base.origin + "/" + ogImage;
      }
      // http → https に変換（mixed content対策）
      ogImage = ogImage.replace(/^http:\/\//i, "https://");
    }

    return res.status(200).json({ body: title, ogImage });
  } catch (err) {
    return res.status(200).json({ body: "", error: err.message });
  }
}
