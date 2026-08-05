import requests
import sys
import io
import re
import json
from urllib.parse import urlparse

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

SUPABASE_URL = "https://vpzbtuucopucablwyqeq.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwemJ0dXVjb3B1Y2FibHd5cWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Mjk2MzEsImV4cCI6MjA5MTIwNTYzMX0.qry7pSzmm3lWK82Vnp7Wz-R9wHsDVwbj7ysy62xUhuA"

HEADERS = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
    "Content-Type": "application/json",
}

def fetch_ogp_image(url):
    try:
        res = requests.get(
            url,
            headers={"User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)"},
            timeout=6,
        )
        if not res.ok:
            return ""
        html = res.text

        # og:image を抽出
        m = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', html, re.IGNORECASE)
        if not m:
            m = re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', html, re.IGNORECASE)
        if not m:
            return ""

        og_image = m.group(1).strip()

        # 相対URL → 絶対URL
        if og_image.startswith("//"):
            og_image = "https:" + og_image
        elif og_image.startswith("/"):
            parsed = urlparse(url)
            og_image = parsed.scheme + "://" + parsed.netloc + og_image
        elif not og_image.startswith("http"):
            parsed = urlparse(url)
            og_image = parsed.scheme + "://" + parsed.netloc + "/" + og_image

        # http → https（mixed content対策）
        og_image = re.sub(r'^http://', 'https://', og_image, flags=re.IGNORECASE)

        return og_image
    except Exception:
        return ""

def run():
    print("URLがある投稿を取得中...")
    # PostgRESTは1回のGETで最大1000件しか返さないため offset でページングする。
    # 単発 limit=1000 だと新しい投稿(id末尾)に永久に到達せずOGPが付かない。
    # 新しい投稿から先に処理したいので id.desc で取得する。
    posts = []
    offset = 0
    while True:
        res = requests.get(
            f"{SUPABASE_URL}/rest/v1/posts"
            f"?select=id,url,internal&url=neq.&url=not.is.null"
            f"&order=id.desc&offset={offset}&limit=1000",
            headers=HEADERS,
        )
        res.raise_for_status()
        page = res.json()
        if not isinstance(page, list):
            raise RuntimeError(f"想定外のレスポンス: {page}")
        posts.extend(page)
        if len(page) < 1000:
            break
        offset += 1000

    print(f"URLあり投稿: {len(posts)}件")

    # ogImageUrl が未設定の投稿だけ対象
    targets = [
        p for p in posts
        if p.get("url") and not (p.get("internal") or {}).get("ogImageUrl")
    ]

    print(f"対象: {len(targets)}件\n")

    ok_count = 0
    skip_count = 0

    for i, p in enumerate(targets):
        url = p["url"]
        print(f"[{i+1}/{len(targets)}] {url[:70]}", end=" ... ")
        sys.stdout.flush()

        og_image = fetch_ogp_image(url)

        if og_image:
            internal = p.get("internal") or {}
            internal["ogImageUrl"] = og_image

            patch_res = requests.patch(
                f"{SUPABASE_URL}/rest/v1/posts?id=eq.{p['id']}",
                headers={**HEADERS, "Prefer": "return=minimal"},
                json={"internal": internal},
            )
            if patch_res.status_code in (200, 204):
                print(f"OK")
                ok_count += 1
            else:
                print(f"NG ({patch_res.status_code})")
        else:
            print("画像なし")
            skip_count += 1

    print(f"\n完了: 取得成功 {ok_count}件 / 画像なし {skip_count}件")

if __name__ == "__main__":
    run()
