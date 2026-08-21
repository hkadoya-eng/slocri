# -*- coding: utf-8 -*-
"""継続中の機種に「稼働貢献週の予測」を付ける（machineAnalysis の sisRecord.forecast）。

考え方:
  すでに N週に到達している台の最終貢献週を、**同じ2週診断の仕分けで、同じくN週以上まで
  到達した「終了済みの台」の実績分布**から出す。単純な仕分け平均ではなく「N週まで生き延びた
  台のその後」を見るので、長く走っている台を過小評価しない。

**終了した台には予測を書かない。**終わってから予測を作るのは後付けで、答え合わせが成立しない。
予測は継続中の台にだけ付け、立てた日（madeAt）と母数（sample）を必ず残す。

母数が足りないときは段階的に広げ、それでも足りなければ予測を出さない:
  ① 同じ仕分け × N週以上到達した終了台        （n>=5 で採用）
  ② 上位判定／下位判定の2群 × N週以上         （n>=5 で採用）
  ③ 全機種 × N週以上                        （n>=5 で採用）
  ④ どれも足りない → 予測なし（理由を残す）

使い方: python scripts/misc/update_forecast.py [--dry]
"""
import io
import json
import os
import statistics as st
import sys
from datetime import date

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MA_PATH = os.path.join(ROOT, "src", "machineAnalysis.json")
DRY = "--dry" in sys.argv
MIN_SAMPLE = 5
TOP_TIERS = {"超優良", "優良", "優良(定着型)", "優秀(需要型)"}


def main():
    ma = json.loads(io.open(MA_PATH, encoding="utf-8").read())
    rows = [(n, v["sisRecord"]) for n, v in ma.items() if v.get("sisRecord", {}).get("tier")]
    ended = [(n, r) for n, r in rows if r["status"] == "終了" and r.get("contribWeeks") is not None]
    live = [(n, r) for n, r in rows if r["status"] == "継続中" and r.get("contribWeeks") is not None]
    if not ended:
        print("終了した台が無いため予測を作れない")
        return 1
    as_of = max(r.get("asOf") or "" for _, r in rows) or date.today().isoformat()

    def pool(pred, n):
        return sorted(r["contribWeeks"] for _, r in ended
                      if pred(r) and r["contribWeeks"] >= n)

    changed, skipped = [], []
    for name, r in live:
        tier, cw = r["tier"], r["contribWeeks"]
        levels = [
            ("同じ仕分け（%s）で%d週以上まで到達した終了台" % (tier, cw), lambda x: x["tier"] == tier),
            ("%s判定の台で%d週以上まで到達した終了台" % ("上位" if tier in TOP_TIERS else "下位", cw),
             lambda x: (x["tier"] in TOP_TIERS) == (tier in TOP_TIERS)),
            ("全機種で%d週以上まで到達した終了台" % cw, lambda x: True),
        ]
        got = None
        for basis, pred in levels:
            v = pool(pred, cw)
            if len(v) >= MIN_SAMPLE:
                got = (basis, v)
                break
        if not got:
            # 比較できる終了台が5件未満。無理に数字を出さず理由を残す
            v_all = pool(lambda x: True, cw)
            r.pop("forecast", None)
            r["forecastNote"] = ("予測なし：%d週以上まで到達した終了台が%d件しかなく、母数が足りない"
                                 % (cw, len(v_all)))
            skipped.append((name, tier, cw, len(v_all)))
            continue
        basis, v = got
        q = lambda p: v[min(len(v) - 1, int(len(v) * p))]
        fc = {"weeks": int(st.median(v)), "lo": int(q(.25)), "hi": int(q(.75)),
              "sample": len(v), "basis": basis, "madeAt": as_of, "atWeeks": cw}
        # 予測が現在の貢献週を下回るのは筋が通らない（もう到達している）。下限は現在値に合わせる
        if fc["weeks"] < cw:
            fc["weeks"] = cw
        if fc["lo"] < cw:
            fc["lo"] = cw
        if fc["hi"] < fc["weeks"]:
            fc["hi"] = fc["weeks"]
        old = r.get("forecast")
        r.pop("forecastNote", None)
        # 予測は立てた時点を残す。母数や中央値が変わっただけで madeAt を更新すると
        # 「いつ言ったか」が消えて答え合わせができなくなるので、内容が変わった時だけ更新する
        if old and {k: old.get(k) for k in ("weeks", "lo", "hi")} == {k: fc[k] for k in ("weeks", "lo", "hi")}:
            fc["madeAt"] = old.get("madeAt", as_of)
        r["forecast"] = fc
        changed.append((name, tier, cw, fc))

    print("継続中 %d件 ／ 予測を付けた %d件 ／ 母数不足で見送った %d件（終了台の母集団 %d件）"
          % (len(live), len(changed), len(skipped), len(ended)))
    print()
    print("%-32s %-12s %6s %8s %s" % ("機種", "仕分け", "現在", "予測", "根拠"))
    for name, tier, cw, fc in sorted(changed, key=lambda x: -x[2]):
        rng = "%d週" % fc["weeks"] if fc["lo"] == fc["hi"] else "%d週（%d〜%d）" % (fc["weeks"], fc["lo"], fc["hi"])
        print("%-32s %-12s %5d週 %10s n=%d・%s" % (name[:32], tier, cw, rng, fc["sample"], fc["basis"][:40]))
    if skipped:
        print("\n予測を出さなかった機種:")
        for name, tier, cw, n in skipped:
            print("  %-32s %-10s %d週到達（比較できる終了台 %d件）" % (name[:32], tier, cw, n))

    if DRY:
        print("\n※--dry のため書き込みなし")
        return 0
    io.open(MA_PATH, "w", encoding="utf-8").write(json.dumps(ma, ensure_ascii=False, indent=2) + "\n")
    json.load(io.open(MA_PATH, encoding="utf-8"))
    print("\nmachineAnalysis.json を更新")
    return 0


if __name__ == "__main__":
    sys.exit(main())
