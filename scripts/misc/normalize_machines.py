import requests
import sys
import io
from collections import defaultdict

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

SUPABASE_URL = "https://vpzbtuucopucablwyqeq.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwemJ0dXVjb3B1Y2FibHd5cWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Mjk2MzEsImV4cCI6MjA5MTIwNTYzMX0.qry7pSzmm3lWK82Vnp7Wz-R9wHsDVwbj7ysy62xUhuA"

HEADERS = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
    "Content-Type": "application/json",
}

# 優先ルール: L > スマスロ > なし
# 新しい揺れが見つかったらここに追加して再実行
UPDATES = [
    ("ヨルムンガンド",                          "スマスロ ヨルムンガンド"),
    ("スマスロヨルムンガンド",                  "スマスロ ヨルムンガンド"),
    ("スマスロ虚構推理",                        "L虚構推理"),
    ("アクダマドライブ",                        "スマスロ アクダマドライブ"),
    ("銀河英雄伝説",                            "スマスロ銀河英雄伝説"),
    ("異世界かるてっと",                        "すますろ異世界かるてっと"),
    ("スマスロ ミリオンゴッド-神々の軌跡-",     "Lミリオンゴッド"),
    ("カバネリ海門決戦",                        "スマスロ 甲鉄城のカバネリ 海門決戦"),
    ("戦国乙女5",                               "L戦国乙女5"),
    ("転スラ2（パチンコ）",                     "e転スラ2"),
    ("全般",                                    "スマスロ全般"),
    ("パチスロ全般",                            "スマスロ全般"),
    ("ホール全般",                              "スマスロ全般"),
]

PREFIXES = ["Lパチスロ ", "L ", "スマスロ ", "スマスロ", "すますろ", "Sパチスロ ", "S", "Pパチスロ ", "P"]

def strip_prefix(name):
    for p in PREFIXES:
        if name.startswith(p):
            return name[len(p):].strip()
    return name

def fetch_machines():
    res = requests.get(
        f"{SUPABASE_URL}/rest/v1/posts?select=machine",
        headers=HEADERS,
    )
    data = res.json()
    return sorted(set(p["machine"] for p in data if p.get("machine") and p["machine"] not in ("全般", "スマスロ全般", "パチスロ全般", "ホール全般", "test")))

def check():
    machines = fetch_machines()
    groups = defaultdict(list)
    for m in machines:
        key = strip_prefix(m)
        groups[key].append(m)

    candidates = {k: v for k, v in groups.items() if len(v) > 1}

    if not candidates:
        print("揺れなし。機種名はきれいです。")
        return

    print(f"== 揺れ候補 {len(candidates)} グループ ==\n")
    for key, names in sorted(candidates.items()):
        print(f"  [{key}]")
        for n in names:
            print(f"    - {n}")
        print()
    print("→ UPDATES リストに追加して python normalize_machines.py で修正できます")

KNOWN_PREFIX_CHARS = ("L", "e", "S", "P", "スマスロ", "すますろ")

def no_prefix():
    machines = fetch_machines()
    plain = [m for m in machines if not any(m.startswith(p) for p in KNOWN_PREFIX_CHARS)]
    if not plain:
        print("プレフィックスなしの機種名はありません。")
        return
    print(f"== プレフィックスなし ({len(plain)}件) ==\n")
    for m in plain:
        print(f"  {m}")

def run():
    for old, new in UPDATES:
        res = requests.patch(
            f"{SUPABASE_URL}/rest/v1/posts?machine=eq.{requests.utils.quote(old)}",
            headers={**HEADERS, "Prefer": "return=minimal"},
            json={"machine": new},
        )
        if res.status_code in (200, 204):
            print(f"OK: 「{old}」→「{new}」")
        else:
            print(f"NG: 「{old}」→「{new}」 ({res.status_code}) {res.text}")

if __name__ == "__main__":
    if "--check" in sys.argv:
        check()
    elif "--no-prefix" in sys.argv:
        no_prefix()
    else:
        run()
        print()
        check()
