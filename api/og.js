const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://vpzbtuucopucablwyqeq.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

export default async function handler(req, res) {
  const postId = req.query.post;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  const origin = `${proto}://${host}`;
  const appUrl = postId ? `${origin}/?post=${postId}` : origin;

  let title = "SLOKEY - スロ好きのネタまとめ";
  let description = "パチスロ・パチンコの最新情報をスロ好きが集めて共有するライブラリ";

  if (postId && SUPABASE_KEY) {
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/posts?id=eq.${encodeURIComponent(postId)}&select=machine,title,body&limit=1`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        }
      );
      const [post] = await r.json();
      if (post) {
        title = `【${post.machine}】${post.title} | SLOKEY`;
        description = post.body.slice(0, 120);
      }
    } catch (_) {}
  }

  const esc = s => s.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const image = `${origin}/logo.png`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=60");
  res.status(200).send(`<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8"/>
  <title>${esc(title)}</title>
  <meta property="og:type" content="article"/>
  <meta property="og:title" content="${esc(title)}"/>
  <meta property="og:description" content="${esc(description)}"/>
  <meta property="og:image" content="${esc(image)}"/>
  <meta property="og:url" content="${esc(appUrl)}"/>
  <meta property="og:site_name" content="SLOKEY"/>
  <meta name="twitter:card" content="summary"/>
  <meta name="twitter:title" content="${esc(title)}"/>
  <meta name="twitter:description" content="${esc(description)}"/>
  <meta name="twitter:image" content="${esc(image)}"/>
  <meta http-equiv="refresh" content="0;url=${esc(appUrl)}"/>
</head>
<body>
  <script>window.location.replace(${JSON.stringify(appUrl)})</script>
  <p><a href="${esc(appUrl)}">${esc(title)}</a></p>
</body>
</html>`);
}
