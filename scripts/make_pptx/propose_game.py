"""
ゲーム性提案書ジェネレーター
使い方: python propose_game.py
"""
import sys
import io
import json
import os
import re
from datetime import date

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

ANALYSIS_PATH  = os.path.join(ROOT_DIR, "src", "machineAnalysis.json")
LIBRARY_PATH   = os.path.join(ROOT_DIR, "src", "gameDesignLibrary.json")
MACHINE_LIB_PATH = os.path.join(ROOT_DIR, "src", "machineLibrary.json")
OUTPUT_DIR = os.path.join(ROOT_DIR, "proposals")


def load_env_local():
    env_path = os.path.join(ROOT_DIR, ".env.local")
    if not os.path.exists(env_path):
        return
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, val = line.partition("=")
                os.environ.setdefault(key.strip(), val.strip())


def load_analysis():
    with open(ANALYSIS_PATH, encoding="utf-8") as f:
        return json.load(f)


def load_library():
    with open(LIBRARY_PATH, encoding="utf-8") as f:
        return json.load(f)


def load_machine_library():
    with open(MACHINE_LIB_PATH, encoding="utf-8") as f:
        return json.load(f)


def build_machine_lib_context(ml):
    lines = []
    for m in ml["machines"]:
        lines.append(
            f"{m['name']}（{m['maker']}/{m['year']}/{m['era']}）[{m['type']}] "
            f"spec:{m['spec']} pattern:{m['designPattern']} 教訓:{m['lesson']} "
            f"感情:{m['playerEmotion']} tags:{','.join(m['tags'])}"
        )
    return "\n".join(lines)


def build_library_context(lib):
    lines = []

    lines.append("【ゲームフロー設計パターン】")
    for k, v in lib["gameFlowPatterns"].items():
        lines.append(f"▶{k}: {v['description']}")
        for e in v["examples"]:
            lines.append(f"  成功例 {e['machine']}: {e['detail']}")
        lines.append(f"  強み: {'・'.join(v['strengths'])}")
        lines.append(f"  弱み: {'・'.join(v['weaknesses'])}")
        lines.append(f"  プレイヤー感情: {v['playerEmotion']}")

    lines.append("\n【CZ設計パターン】")
    for k, v in lib["czDesignPatterns"].items():
        examples = " / ".join(
            e["machine"] + (" ("+e["czProb"]+")" if "czProb" in e else "") +
            " - " + (e.get("evaluation") or e.get("issue") or e.get("detail") or "")
            for e in v["examples"]
        )
        lines.append(f"▶{k}: {v['description']} | 例: {examples}")
        if "designNote" in v:
            lines.append(f"  設計メモ: {v['designNote']}")

    lines.append("\n【コイン単価帯と客層】")
    for k, v in lib["specDesign"]["coinUnitRanges"].items():
        lines.append(f"  {v['range']}: {' / '.join(v['machines'])} → {v['targetPlayer']}")

    lines.append("\n【設定差設計パターン】")
    for k, v in lib["settingDifferenceDesign"].items():
        if k == "シンプル判別型の成功例":
            continue
        lines.append(f"▶{k}: メリット={v.get('merit','')} / リスク={v.get('demerit') or v.get('risk','')}")

    lines.append("\n【市場の空白（まだ誰もやっていない設計）】")
    for g in lib["marketGaps"]["現在市場に存在しない設計"]:
        lines.append(f"・{g['gap']}: {g['opportunity']}")

    lines.append("\n【失敗パターン共通点】")
    for p in lib["marketGaps"]["失敗した機種の共通パターン"]:
        lines.append(f"・{p}")

    lines.append("\n【ライトユーザーが嫌うこと】")
    lines.append(" / ".join(lib["playerPsychology"]["ライトユーザーが嫌うこと"]))

    lines.append("\n【20代が反応する要素】")
    lines.append(" / ".join(lib["playerPsychology"]["20代が反応する要素"]))

    lines.append("\n【やめられない設計の原理】")
    for p in lib["playerPsychology"]["やめられない設計の原理"]:
        lines.append(f"・{p['type']}: {p['description']} (例: {p['example']})")

    lines.append("\n【名機の設計パターン（業界スタンダードになった設計）】")
    for name, data in lib.get("classicMachines", {}).items():
        lines.append(f"▶{name}（{data.get('year','')}年/{data.get('maker','')}）")
        lines.append(f"  パターン: {data.get('designPattern','')} | スペック: {data.get('spec','')}")
        lines.append(f"  設計の核心: {data.get('highlight','')}")
        lines.append(f"  設計教訓: {data.get('designLesson','')}")
        lines.append(f"  プレイヤー感情: {data.get('playerEmotion','')}")

    lines.append("\n【設計の変遷】")
    for topic, text in lib.get("designEvolution", {}).items():
        lines.append(f"・{topic}: {text}")

    return "\n".join(lines)


def build_analysis_context(analysis):
    """machineAnalysis.json を提案プロンプト用テキストに変換"""
    lines = []
    for name, data in analysis.items():
        lines.append(f"【{name}】")
        if data.get("spec"):
            lines.append(f"  スペック: {data['spec']}")
        if data.get("summary"):
            lines.append(f"  一言: {data['summary']}")
        if data.get("highlight"):
            lines.append(f"  ゲーム性: {data['highlight']}")
        pros = data.get("pros", [])
        if pros:
            lines.append("  良い点: " + " / ".join(pros[:3]))
        cons = data.get("cons", [])
        if cons:
            lines.append("  悪い点: " + " / ".join(cons[:3]))
        lines.append("")
    return "\n".join(lines)


def ask(label, hint=""):
    hint_str = f"（{hint}）" if hint else ""
    print(f"\n{label}{hint_str}")
    print("→ ", end="", flush=True)
    return input().strip()


def gather_policy():
    print("=" * 50)
    print("  スロット新機種 ゲーム性提案書ジェネレーター")
    print("=" * 50)
    print("\n指針を入力してください。Enterで次の項目へ進みます。\n")

    target     = ask("① ターゲット層", "例: 荒波苦手の20〜30代、設定狙い玄人、ライト女性層")
    direction  = ask("② ゲーム性の方向性", "例: 自力感を強化、通常時の退屈さを解消、爆発力と安定を両立")
    reference  = ask("③ 参考にしたい機種・要素", "例: カバネリの自力上乗せ + ヨルムンガンドの設定差設計を改善")
    avoid      = ask("④ 避けたい要素・反省点", "例: デキレ感、通常時の煽り過多、天井が重すぎる")
    extra      = ask("⑤ その他こだわり・備考（任意）", "例: IPはアニメ系、スマスロ、コイン単価3円台")

    return {
        "target": target,
        "direction": direction,
        "reference": reference,
        "avoid": avoid,
        "extra": extra,
    }


def generate_proposal(policy, analysis_context, lib_context, machine_lib_context, client):
    policy_text = f"""
ターゲット層: {policy['target']}
ゲーム性の方向性: {policy['direction']}
参考にしたい機種・要素: {policy['reference']}
避けたい要素・反省点: {policy['avoid']}
その他・備考: {policy['extra']}
""".strip()

    prompt = f"""あなたはパチスロ・パチンコ機種の企画開発コンサルタントです。
以下の4つの情報源をもとに、新機種のゲーム性提案書を作成してください。

---
【1. 既存機種 詳細分析データ（14機種）】
{analysis_context}

---
【2. ゲーム設計ライブラリ（設計パターン・市場空白・プレイヤー心理）】
{lib_context}

---
【3. 200機種データベース（機種名・スペック・設計パターン・教訓）】
{machine_lib_context}

---
【4. 開発指針】
{policy_text}

---
以下の構成でマークダウン形式の提案書を作成してください。
200機種データベースを参照して類似機種を幅広く検討し、具体的なデータ（機種名・数値・失敗事例）を引用しながら根拠を示してください。

# 新機種ゲーム性提案書

## 1. 市場の現状と課題
（ライブラリの市場空白・失敗パターンを引用しながら「何が足りないか」を250文字程度で）

## 2. コンセプト
（一言キャッチ＋200文字程度の説明。市場の空白を埋める設計コンセプトを明示）

## 3. ゲームフロー概要
（通常時→CZ→AT→上位ATの流れをテキスト図で。設計パターン名を明示して根拠を示す）

## 4. 推奨スペック
（コイン単価帯・機械割・純増・天井を箇条書きで。ライブラリのスペック傾向データを根拠に）

## 5. 近似機種との比較分析
この提案に最も近い既存機種を3つ選び、以下の軸で比較表を作成してください。

| 比較軸 | 近似機種A | 近似機種B | 近似機種C | 本提案 |
|---|---|---|---|---|
| 設計パターン | | | | |
| コイン単価 | | | | |
| 自力感の強さ | | | | |
| やめにくさ | | | | |
| ターゲット層 | | | | |

表の後に「本提案が上記機種と最も異なる点」を2〜3行で明記してください。

## 6. 差別化ポイント
（市場空白リストを根拠に「なぜ今これが面白いのか」を3〜5点で。各点に「〇〇という既存機種にはなかった△△」という形式で記載）

## 7. 想定プレイヤー体験
（ライブラリのプレイヤー心理を参照し、実際に打った時の感情を300文字程度で）

## 8. リスクと対策
（ライブラリの失敗パターンに照らして懸念点と対策を2〜3点で）

ルール：
- 数値は「目安」として明示する
- 「〜G以内に〜を実現する」など具体的な数値付きで提案する
- 比較表は必ず埋める
- 差別化は「〇〇にはなかった」という形式で根拠を持たせる
"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text.strip()


def save_proposal(text, policy):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    today = date.today().strftime("%Y%m%d")
    # ファイル名にターゲットの先頭10文字を使う
    slug = re.sub(r'[^\w\u3040-\u9FFF]', '', policy['target'])[:10]
    filename = f"proposal_{today}_{slug}.md"
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"<!-- 指針: {json.dumps(policy, ensure_ascii=False)} -->\n\n")
        f.write(text)
    return path


def run():
    load_env_local()
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("エラー: ANTHROPIC_API_KEY が未設定です")
        print("  .env.local に ANTHROPIC_API_KEY=sk-ant-... を追加してください")
        sys.exit(1)

    import anthropic
    client = anthropic.Anthropic(api_key=api_key)

    # 指針を入力
    policy = gather_policy()

    print("\n\n分析データを読み込み中...")
    analysis = load_analysis()
    context = build_analysis_context(analysis)
    print(f"  {len(analysis)}機種のデータをコンテキストに追加")

    library = load_library()
    lib_context = build_library_context(library)
    print(f"  設計ライブラリをコンテキストに追加")

    machine_lib = load_machine_library()
    machine_lib_context = build_machine_lib_context(machine_lib)
    print(f"  {machine_lib['total']}機種データベースをコンテキストに追加")

    print("\nClaudeが提案書を生成中...（30秒ほどかかります）\n")
    proposal = generate_proposal(policy, context, lib_context, machine_lib_context, client)

    # 保存
    path = save_proposal(proposal, policy)

    print("\n" + "=" * 50)
    print(proposal)
    print("=" * 50)
    print(f"\n✅ 保存しました: {path}")


if __name__ == "__main__":
    run()
