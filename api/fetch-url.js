export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL required" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  try {
    const pageRes = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!pageRes.ok) throw new Error(`HTTP ${pageRes.status}`);

    const html = await pageRes.text();

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descMatch =
      html.match(/<meta[^>]+(?:name="description"|property="og:description")[^>]+content="([^"]{10,})"/i) ||
      html.match(/<meta[^>]+content="([^"]{10,})"[^>]+(?:name="description"|property="og:description")/i);

    const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "";
    const desc = descMatch ? descMatch[1].replace(/\s+/g, " ").trim() : "";

    if (!title && !desc) throw new Error("コンテンツ取得失敗");

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        messages: [{
          role: "user",
          content: `以下のパチスロ記事を20〜35文字の短文1文でまとめてください。2ch風の口語体（〜らしいぞ、〜って話題、〜だった、これ知ってた？など）。句点不要。\n\nタイトル: ${title}\n概要: ${desc}`,
        }],
      }),
    });

    const claudeData = await claudeRes.json();
    const body = claudeData.content?.[0]?.text?.trim() || "";

    return res.status(200).json({ body });
  } catch (err) {
    return res.status(200).json({ body: "", error: err.message });
  }
}
