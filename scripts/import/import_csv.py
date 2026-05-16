import requests
import sys
import io
import csv
import json
import glob
import os

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

SUPABASE_URL = "https://vpzbtuucopucablwyqeq.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwemJ0dXVjb3B1Y2FibHd5cWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Mjk2MzEsImV4cCI6MjA5MTIwNTYzMX0.qry7pSzmm3lWK82Vnp7Wz-R9wHsDVwbj7ysy62xUhuA"

HEADERS = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

def find_latest_csv():
    files = glob.glob("ai収集/slocri_import_*.csv")
    if not files:
        return None
    return max(files, key=os.path.getmtime)

def run(csv_path=None):
    if csv_path is None:
        csv_path = find_latest_csv()
        if csv_path is None:
            print("CSVファイルが見つかりません")
            return
        print(f"最新CSV: {csv_path}")

    with open(csv_path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    print(f"読み込み: {len(rows)}件\n")

    ok = 0
    ng = 0

    for i, row in enumerate(rows):
        author = row.get("author", "").strip() or "編集部AI"
        internal = {
            "author": author,
            "likes": [],
            "bookmarks": [],
            "bad": [],
            "imageUrl": "",
            "ogImageUrl": "",
            "shopName": "",
        }

        payload = {
            "cat":     row["cat"].strip(),
            "source":  row["source"].strip(),
            "machine": row["machine"].strip(),
            "title":   row["title"].strip(),
            "body":    row["body"].strip(),
            "url":     row.get("url", "").strip(),
            "quality": int(row.get("quality", 3)),
            "dup_key": row.get("dup_key", "").strip(),
            "author":  author,
            "eng":     {},
            "internal": internal,
        }

        title_short = payload["title"][:30]
        print(f"[{i+1}/{len(rows)}] {title_short} ... ", end="")
        sys.stdout.flush()

        res = requests.post(
            f"{SUPABASE_URL}/rest/v1/posts",
            headers=HEADERS,
            json=payload,
        )

        if res.status_code in (200, 201):
            print("OK")
            ok += 1
        else:
            print(f"NG ({res.status_code}) {res.text[:80]}")
            ng += 1

    print(f"\n完了: 成功 {ok}件 / 失敗 {ng}件")

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else None
    run(path)
