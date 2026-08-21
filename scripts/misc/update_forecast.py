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

expectedError … 同じ仕分けの終了台の実測誤差（±週）。予測の確からしさを示す。
                危険±1.1 / 注意±2.2 / 優良±3.5 / 超優良±17.8 のように長い台ほど大きい

**要因分析でわかったこと（採用しなかったものも残す）**
  ・競合圧（導入から8週の新台数）と市場水準は誤差と-0.20/-0.24の相関が出るが、
    **導入年の交絡**だった。導入年 vs 貢献週が r=-0.64（2023年導入は平均81週・2026年は7.3週）で、
    年内に限ると相関は消える（2025年 r=-0.09）。要因として採用しない
  ・初動（初週の稼働値）と設置規模は誤差と+0.31/+0.30。①〜③と重複する可能性があるため保留
  ・母集団は「N週以上まで到達した終了台」で条件付ける現行方式を維持する。全期間だと古い長寿台に
    引っ張られて上振れ、直近に絞ると「まだ終わっていない長寿台」が抜けて下振れするため

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
# 許容差は編集部予測と同じ規則（予測週数÷5の切り捨て）。物差しを2つ持たない
TOLERANCE_STEP = 5
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

    # 仕分けごとの実測誤差＝その仕分けの終了台が「仕分けの中央値」からどれだけずれたかの平均。
    # 予測の数字だけ出すと確からしさが伝わらないため、これを添える。
    # 分析では 危険±1.1週 → 注意±2.2週 → 優良±3.5週 → 超優良±17.8週 と、
    # 長い台ほど誤差が爆発することが確認できている（確定60機種）。
    tier_err = {}
    for tr in {r["tier"] for _, r in ended if r.get("tier")}:
        v = [r["contribWeeks"] for _, r in ended if r.get("tier") == tr]
        if len(v) >= 2:
            med = st.median(v)
            tier_err[tr] = round(sum(abs(x - med) for x in v) / len(v), 1)

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
        for li, (basis, pred) in enumerate(levels):
            v = pool(pred, cw)
            if len(v) >= MIN_SAMPLE:
                got = (basis, v, li)
                break
        if not got:
            # 比較できる終了台が5件未満。無理に数字を出さず理由を残す
            v_all = pool(lambda x: True, cw)
            r.pop("forecast", None)
            r["forecastNote"] = ("予測なし：%d週以上まで到達した終了台が%d件しかなく、母数が足りない"
                                 % (cw, len(v_all)))
            skipped.append((name, tier, cw, len(v_all)))
            continue
        basis, v, level = got
        q = lambda p: v[min(len(v) - 1, int(len(v) * p))]
        fc = {"weeks": int(st.median(v)), "lo": int(q(.25)), "hi": int(q(.75)),
              "sample": len(v), "basis": basis, "madeAt": as_of, "atWeeks": cw}
        fc["tolerance"] = int(fc["weeks"] // TOLERANCE_STEP)
        # 実測誤差は「同じ仕分けの母集団で予測できたとき」だけ添える。
        # 仕分け外の母集団（上位/下位や全機種）に落ちた台にその仕分けの誤差を出すと、
        # 別の母集団から出した数字に別の誤差を貼ることになり噛み合わない
        if level == 0 and tier in tier_err:
            fc["expectedError"] = tier_err[tier]
        else:
            fc["errorNote"] = "同じ仕分けの母集団で予測できていないため、実測誤差は出せない"
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
        err = ("±%.1f" % fc["expectedError"]) if fc.get("expectedError") is not None else "測れず"
        print("%-32s %-12s %5d週 %10s 実測誤差%6s n=%d・%s"
              % (name[:32], tier, cw, rng, err, fc["sample"], fc["basis"][:34]))
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
