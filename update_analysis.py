import requests
import sys
import io
import json
import os
import re
from datetime import date
from collections import defaultdict

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

SUPABASE_URL = "https://vpzbtuucopucablwyqeq.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwemJ0dXVjb3B1Y2FibHd5cWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Mjk2MzEsImV4cCI6MjA5MTIwNTYzMX0.qry7pSzmm3lWK82Vnp7Wz-R9wHsDVwbj7ysy62xUhuA"

SUPABASE_HEADERS = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
}

ANALYSIS_PATH = os.path.join(os.path.dirname(__file__), "src", "machineAnalysis.json")
STALE_THRESHOLD = 3  # 投稿がこの件数以上増えたら再分析
FORCE_ALL = "--force" in sys.argv  # 全機種強制再分析


def fetch_posts():
    res = requests.get(
        f"{SUPABASE_URL}/rest/v1/posts"
        "?select=machine,cat,title,body"
        "&cat=neq.fun"
        "&machine=neq."
        "&machine=not.is.null"
        "&limit=2000",
        headers=SUPABASE_HEADERS,
    )
    res.raise_for_status()
    return res.json()


def group_by_machine(posts):
    grouped = defaultdict(list)
    for p in posts:
        machine = (p.get("machine") or "").strip()
        if machine and "全般" not in machine:
            grouped[machine].append(p)
    return dict(grouped)


def load_analysis():
    with open(ANALYSIS_PATH, encoding="utf-8") as f:
        return json.load(f)


def save_analysis(data):
    with open(ANALYSIS_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def lookup_key(machine, analysis):
    """機種名またはaliasでJSONのキーを返す"""
    if machine in analysis:
        return machine
    for key, val in analysis.items():
        if machine in (val.get("aliases") or []):
            return key
    return None


def analyze_machine(machine, posts, client):
    import anthropic

    posts_text = "\n".join(
        f"- [{p['cat']}] {p['title']}：{p['body']}"
        for p in posts[:60]
    )

    prompt = f"""あなたはパチスロ・パチンコ機種の評価アナリストです。
以下は「{machine}」についてのユーザー投稿・解析情報です。

{posts_text}

これらの情報を元に、以下のJSON形式で詳細な機種評価を作成してください。

{{
  "summary": "20文字以内の一言まとめ（機種の核心を一言で）",
  "highlight": "この機種のゲーム性・面白さ・特徴を100〜200文字で詳述。打感・演出の仕組み・爆発力・天井設計など、実際に打った際の体験を中心に記述する",
  "pros": [
    "良い点1（具体的な数値・演出名・ユーザーの声を含めて80〜150文字）",
    "良い点2（同上）",
    "良い点3（同上）",
    "良い点4（同上・あれば）",
    "良い点5（同上・あれば）",
    "良い点6（同上・あれば）"
  ],
  "cons": [
    "悪い点1（具体的な数値・症状・ユーザーの声を含めて80〜150文字）",
    "悪い点2（同上）",
    "悪い点3（同上・あれば）",
    "悪い点4（同上・あれば）"
  ]
}}

ルール：
- summaryは20文字以内
- highlightは機種の面白さ・ゲーム性の核心を打ち手視点で具体的に記述（「〇〇G天井でAT確定」「〇〇ループ継続率XX%」など数値を積極活用）
- pros/consはそれぞれ最大7件、最低2件
- 投稿内容に基づく事実のみ（推測・創作禁止）
- プレイヤー視点で記述、ゲーム性の楽しさが伝わるよう心がける
- JSONのみ出力（説明文・コードブロック不要）"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    text = message.content[0].text.strip()

    # ```json ... ``` ブロックを除去
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)

    return json.loads(text)


def load_env_local():
    """環境変数になければ .env.local から読み込む"""
    env_path = os.path.join(os.path.dirname(__file__), ".env.local")
    if not os.path.exists(env_path):
        return
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, val = line.partition("=")
                os.environ.setdefault(key.strip(), val.strip())


def run():
    load_env_local()
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("エラー: ANTHROPIC_API_KEY が未設定です")
        print("  .env.local に ANTHROPIC_API_KEY=sk-ant-... を追加してください")
        sys.exit(1)

    import anthropic
    client = anthropic.Anthropic(api_key=api_key)

    print("Supabaseから投稿を取得中...")
    posts = fetch_posts()
    print(f"取得: {len(posts)}件\n")

    grouped = group_by_machine(posts)
    analysis = load_analysis()
    today = date.today().isoformat()
    updated = []

    for machine, machine_posts in sorted(grouped.items(), key=lambda x: -len(x[1])):
        if len(machine_posts) < 3:
            continue

        existing_key = lookup_key(machine, analysis)

        if existing_key:
            prev_count = analysis[existing_key].get("postCount", 0)
            if not FORCE_ALL and len(machine_posts) < prev_count + STALE_THRESHOLD:
                print(f"スキップ  [{machine}] {len(machine_posts)}件（前回{prev_count}件）")
                continue
            label = "強制再分析" if FORCE_ALL else "再分析"
            print(f"{label}    [{machine}] {prev_count}件 → {len(machine_posts)}件", end=" ... ")
        else:
            print(f"新規分析  [{machine}] {len(machine_posts)}件", end=" ... ")

        sys.stdout.flush()

        try:
            result = analyze_machine(machine, machine_posts, client)
            key = existing_key or machine
            existing = analysis.get(key, {})
            analysis[key] = {
                "aliases": existing.get("aliases", []),
                "releaseDate": existing.get("releaseDate", ""),
                "spec": existing.get("spec", ""),
                "summary": result["summary"],
                "highlight": result.get("highlight", existing.get("highlight", "")),
                "pros": result["pros"],
                "cons": result["cons"],
                "scores": existing.get("scores", {}),
                "scoreReason": existing.get("scoreReason", {}),
                "postCount": len(machine_posts),
                "updatedAt": today,
            }
            updated.append(machine)
            print("OK")
        except Exception as e:
            print(f"エラー: {e}")

    if updated:
        save_analysis(analysis)
        print(f"\n更新完了: {len(updated)}機種（{', '.join(updated)}）")
    else:
        print("\n更新対象なし（全機種スキップ）")


if __name__ == "__main__":
    run()
