# -*- coding: utf-8 -*-
"""ドシエⅢ章用に、機種の週次推移と全国順位をまとめて出す。

dossier_axes の計算をそのまま使う（稼働値の分母は全国実値・欠測日は除外）。
本文の数字はここの出力から書き写す。目で確認できる形で全週を出すのが目的。

  python scripts/misc/dossier_series.py "L東京喰種" "L攻殻機動隊" ...
  python scripts/misc/dossier_series.py --cohort "L真打吉宗"   # 同じ週に入った台と比べる
"""
import io
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dossier_axes as A  # noqa: E402


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    data = A.load()
    ser = A.series(data)
    week = 8

    # 全機種の①②③（8週目）を先に出して順位の母数にする
    allax = {m: A.axes_at(s, week) for m, s in ser.items() if len(s) >= week}
    dem = [v["demand"] for v in allax.values()]
    hal = [v["hall"] for v in allax.values()]

    for m in args:
        if m not in ser:
            print("該当なし: %s" % m)
            continue
        s = ser[m]
        print("\n" + "=" * 78)
        print("■ %s  %d週経過（%s〜%s）" % (m, len(s), s[0]["w"], s[-1]["w"]))
        print("=" * 78)
        print("%4s %-11s %8s %8s %7s %9s" % ("週", "週開始", "稼働値", "アウト", "台数", "総稼働"))
        for i, r in enumerate(s, 1):
            tv = (r["k"] / 100 * r["u"]) if r["u"] else None
            mark = ""
            if i == 1:
                mark = " ←初週"
            elif i == 2:
                mark = " ←2週目(②の分母)"
            elif i == week:
                mark = " ←8週目(①③の測定点)"
            elif i == len(s):
                mark = " ←直近"
            # 全週は多すぎるので、節目と直近12週だけ出す
            if i <= 10 or i % 10 == 0 or i > len(s) - 12 or mark:
                print("%4d %-11s %7.1f%% %8d %7s %8s%s" % (
                    i, r["w"], r["k"], r["out"],
                    ("%.2f" % r["u"]) if r["u"] else "—",
                    ("%.2f" % tv) if tv else "—", mark))

        a = A.axes_at(s, week)
        print("\n  8週目の位置")
        for key, label, pool, unit in (("demand", "①需要", dem, "%"),
                                       ("hall", "③総稼働", hal, "台分")):
            p, rk, n = A.pct(pool, a[key])
            print("    %-8s %8.1f%-4s %3s位 / %d機種（上位%s%%）" % (
                label, a[key], unit, rk, n, p))
        print("    %-8s %8.1f%%" % ("②持続", a["retention"]))

        # 最高週・最低週・平均を出す（本文で「減衰の仕方」を書くため）
        peak = max(s, key=lambda r: r["k"])
        low = min(s, key=lambda r: r["k"])
        over = sum(1 for r in s if r["k"] >= 100)
        print("\n  最高 %.1f%%（%s・%d週目） / 最低 %.1f%%（%s・%d週目）" % (
            peak["k"], peak["w"], s.index(peak) + 1, low["k"], low["w"], s.index(low) + 1))
        print("  100%%以上の週: %d / %d週（%.0f%%）" % (over, len(s), over / len(s) * 100))

        # 同じ週に入った台（コホート）
        same = [(k, v) for k, v in ser.items() if v[0]["w"] == s[0]["w"] and k != m]
        if same:
            print("\n  同じ週に入った台（%d機種）" % len(same))
            rows = []
            for k, v in same:
                rows.append((v[week - 1]["k"] if len(v) >= week else None, len(v), k))
            rows.sort(key=lambda r: -(r[0] or 0))
            for kk, ln, k in rows:
                print("    %-40s 8週目 %s / %d週経過" % (
                    k[:40], ("%.1f%%" % kk) if kk else "8週未満", ln))


if __name__ == "__main__":
    main()
