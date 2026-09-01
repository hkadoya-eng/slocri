# -*- coding: utf-8 -*-
"""2週データが揃った新台を、機種評価（columnData.json）に自動で登録する。

なぜ必要か:
  予測の更新（update_machine_review_predictions.py）と答え合わせ（update_review_outcome.py）は
  自動化されているのに、**エントリの新規作成だけが手作業**だった。対話セッションが止まると
  そこだけ穴が空き、2026-08-17導入の L喰霊-零-Re は2週間登録されないまま残っていた。

予測値の決め方（物差しを増やさない）:
  sisRecord.forecast（update_forecast.py が「同じ仕分けで同じ週数まで到達した終了台の分布」から
  出した値）をそのまま使う。このスクリプトは独自の推計をしない。
    longevityMin = forecast.weeks
    longevityMax = forecast.weeks + max(1, forecast.weeks // 5)   ← 編集部予測と同じ許容差の刻み
  文章の評価（predictionBasis や tag の一言コメント）は書かない。事実だけ入れて人が後から足す。

登録の条件（すべて満たすもののみ）:
  ・sisRecord があり status が「継続中」（終了した台に予測は書かない）
  ・installedWeeks >= 2（2週目の診断が成立している）
  ・tier が「計測中」でない（2週が揃っていない台は登録しない）
  ・forecast.weeks がある（母数不足で予測が出ていない台は登録しない）
  ・firstWeek が MAX_AGE_WEEKS 週以内（過去の台をまとめて遡り登録しない）
  ・columnData に同じ機種が無い（name / aliases / sisDataMachine を正規化して突合）

既存エントリは絶対に書き換えない（予測は導入2週目で確定して以降変えないルール）。
冪等なので、追加が無ければファイルに触らない。

使い方: python scripts/misc/add_review_entries.py [--dry]
呼び出し元: bat/run_sis_weekly.bat（update_forecast.py の後）
"""
import io
import json
import os
import sys
import unicodedata
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from update_review_outcome import norm  # 機種名の正規化は答え合わせ側と同じものを使う

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MA_PATH = os.path.join(ROOT, "src", "machineAnalysis.json")
COL_PATH = os.path.join(ROOT, "src", "columnData.json")
DRY = "--dry" in sys.argv

MAX_AGE_WEEKS = 12          # firstWeek がこれより古い台は対象外
TOLERANCE_STEP = 5          # longevityMax の刻み（編集部予測と同じ）

# 導入直後で判定が開いている状態のバッジ。既存エントリと同じ値を使う
TAG_OPEN = {"tag": "推移で決まる（導入直後）", "tagColor": "#1565C0", "tagBg": "#E9F1FB"}


def make_id(name):
    s = unicodedata.normalize("NFKC", name).lower().strip()
    return s.replace(" ", "_")


def weeks_between(from_iso, to_day):
    return (to_day - date.fromisoformat(from_iso)).days // 7


def main():
    ma = json.loads(io.open(MA_PATH, encoding="utf-8").read())
    col = json.loads(io.open(COL_PATH, encoding="utf-8").read())
    today = date.today()

    known = set()
    for c in col["columns"]:
        for v in [c.get("name"), c.get("sisDataMachine")] + list(c.get("aliases") or []):
            if v:
                known.add(norm(v))

    added, skipped = [], []
    for name, v in sorted(ma.items()):
        if not isinstance(v, dict):
            continue
        r = v.get("sisRecord") or {}
        if not r or r.get("status") != "継続中":
            continue
        fc = r.get("forecast") or {}
        why = None
        if (r.get("installedWeeks") or 0) < 2:
            why = "設置2週未満"
        elif r.get("tier") in (None, "計測中"):
            why = f"tier={r.get('tier')}"
        elif not fc.get("weeks"):
            why = "forecastなし（母数不足）"
        elif not r.get("firstWeek"):
            why = "firstWeekなし"
        elif weeks_between(r["firstWeek"], today) > MAX_AGE_WEEKS:
            why = f"初出{r['firstWeek']}（{MAX_AGE_WEEKS}週より前）"
        if why:
            continue

        names = {norm(name)}
        if r.get("sisName"):
            names.add(norm(r["sisName"]))
        for a in (v.get("aliases") or []):
            names.add(norm(a))
        if names & known:
            skipped.append(name)
            continue

        w = int(fc["weeks"])
        entry = {
            "id": make_id(name),
            "name": name,
            **TAG_OPEN,
            "postCount": v.get("postCount") or 0,
            "longevityMin": w,
            "longevityMax": w + max(1, w // TOLERANCE_STEP),
            "predictedAt": today.isoformat(),
            "predictedAtWeeks": r.get("installedWeeks"),
            "predictedAtSource": "add_review_entries.py（2週診断の到達週分布をそのまま採用）",
            "difficulty": "open",
            "longevityMethod": "sisRecord.forecast（update_forecast.py）",
            "longevityTier": r.get("tier"),
            "longevityReason": (
                f"初週稼働値{r.get('katsudo1')}・2週稼働値{r.get('katsudo2')}・2週持続率{r.get('ret2')}"
                f"で仕分け『{r.get('tier')}』。{fc.get('basis')}（母数{fc.get('sample')}台）から"
                f"{w}週。許容差±{fc.get('tolerance')}週・実測誤差±{fc.get('expectedError')}週"
            ),
        }
        if r.get("sisName"):
            entry["sisDataMachine"] = r["sisName"]
        if v.get("releaseDate"):
            entry["releaseDate"] = v["releaseDate"]

        col["columns"].insert(0, entry)
        known |= names
        added.append(entry)

    if not added:
        print(f"追加なし（既登録スキップ{len(skipped)}件）")
        return 0

    for e in added:
        print(f"  + {e['name']} … {e['longevityMin']}〜{e['longevityMax']}週"
              f"（{e['longevityTier']} / {e['predictedAtWeeks']}週目時点）")
    if DRY:
        print("--dry のため書き込みなし")
        return 0

    col["updatedAt"] = today.isoformat()
    io.open(COL_PATH, "w", encoding="utf-8", newline="\n").write(
        json.dumps(col, ensure_ascii=False, indent=2) + "\n")
    print(f"columnData.json に {len(added)}件 追加（{today.isoformat()}）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
