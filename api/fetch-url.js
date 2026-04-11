export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL required" });

  const apiKey = process.env.ANTHROPIC_API_KEY;

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

    let machine = "";
    if (apiKey) {
      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 30,
          messages: [{
            role: "user",
            content: `以下のパチスロ・パチンコ記事タイトルから機種名だけを抽出してください。機種名が不明な場合は空文字を返してください。機種名のみ返してください。\n\nタイトル: ${title}`,
          }],
        }),
      });
      const claudeData = await claudeRes.json();
      machine = claudeData.content?.[0]?.text?.trim() || "";
    }

    return res.status(200).json({ body: title, machine });
  } catch (err) {
    return res.status(200).json({ body: "", machine: "", error: err.message });
  }
}
