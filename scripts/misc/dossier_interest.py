# -*- coding: utf-8 -*-
"""ドシエ④関心度を、機種間で比較できる形で測る。

④は累積値なので経過週を揃えられない（だからウェイトは15%）。それに加えて、
**測定日と検索クエリで値が動く**という弱点がある。実際 SAO2 を2026-08-19に測った
7,374,367回は、8-21に別のクエリ集合で測ると順位が入れ替わった。

そこで比較の条件を固定する:
  ・全機種で**同じ4クエリ**（実践／設定6／天井／初打ち）
  ・**同じ日**にまとめて測る
  ・上位20本の再生数合計と、1本あたり中央値を出す
母数が小さいとパーセンタイルの最下位が必ず0になるので、⑤と同じ13機種を母集団にする。

  python scripts/misc/dossier_interest.py            # 13機種を測って表にする
  python scripts/misc/dossier_interest.py --refresh   # キャッシュを捨てて測り直す
"""
import io
import json
import os
import statistics
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(os.environ.get("TEMP", "."), "dossier_interest.json")
FETCH = os.path.join(HERE, "fetch_youtube_clips.py")

# ⑤DMM評価点の母集団（スロットのみ・評価30件以上）と同じ並び。
# 検索に使う呼び名はDBの正式名と違うことがあるので別に持つ。
POOL = [
    ("Lパチスロうみねこのなく頃に2", "スマスロうみねこのなく頃に2"),
    ("パチスロディスクアップ2", "ディスクアップ2"),
    ("A-SLOT+ ディスクアップ ULTRAREMIX", "ディスクアップ ULTRAREMIX"),
    ("沖ドキ！GOLD", "沖ドキGOLD"),
    ("L邪神ちゃんドロップキック", "スマスロ邪神ちゃんドロップキック"),
    ("スマスロ北斗の拳", "スマスロ北斗の拳"),
    ("スロット ソードアート・オンラインⅡ", "スマスロSAO2 ソードアートオンライン"),
    ("L 東京喰種", "スマスロ東京喰種"),
    ("スマスロ とある魔術の禁書目録2", "スマスロとある魔術の禁書目録2"),
    ("L真打吉宗", "スマスロ真打吉宗"),
    ("スマスロ 攻殻機動隊", "スマスロ攻殻機動隊"),
    ("L戦国乙女5 業火を穿つ宿焔の双刃", "戦国乙女5 業火を穿つ宿焔の双刃"),
    ("L ULTRAMAN 最終決戦", "スマスロULTRAMAN最終決戦"),
]
QUERIES = ["%s 実践", "%s 設定6", "%s 天井", "%s 初打ち"]


def measure(name, tmp):
    subprocess.run([sys.executable, FETCH, tmp] + [q % name for q in QUERIES],
                   capture_output=True, text=True, encoding="utf-8")
    if not os.path.exists(tmp):
        return None
    j = json.load(io.open(tmp, encoding="utf-8"))
    items = j if isinstance(j, list) else (j.get("clips") or j.get("items") or [])
    v = sorted((x.get("views") or 0) for x in items)[::-1][:20]
    if not v:
        return None
    return {"n": len(items), "top20": sum(v), "median": int(statistics.median(v)),
            "counted": len(v)}


def main():
    cache = {}
    if os.path.exists(CACHE) and "--refresh" not in sys.argv:
        cache = json.load(io.open(CACHE, encoding="utf-8"))
    tmp = os.path.join(os.environ.get("TEMP", "."), "_di_clips.json")
    for dbname, q in POOL:
        if dbname in cache:
            continue
        if os.path.exists(tmp):
            os.remove(tmp)
        r = measure(q, tmp)
        cache[dbname] = r
        json.dump(cache, io.open(CACHE, "w", encoding="utf-8"), ensure_ascii=False)
        print("  測定 %-34s %s" % (dbname[:34],
              ("%s回 / %d本" % (format(r["top20"], ","), r["n"])) if r else "取得できず"))

    rows = [(v["top20"], v["median"], v["n"], k) for k, v in cache.items() if v]
    rows.sort(reverse=True)
    print("\n④関心度（同一4クエリ・同一日・上位20本の再生計）  母数 %d機種" % len(rows))
    print("%-36s %14s %12s %7s %6s" % ("機種", "上位20本計", "中央値", "取得数", "位置"))
    tot = [r[0] for r in rows]
    for t, med, n, k in rows:
        below = sum(1 for x in tot if x < t)
        print("%-36s %13s回 %11s回 %6d本 %3d位(上位%d%%)" % (
            k[:36], format(t, ","), format(med, ","), n,
            len(tot) - below, round(below / len(tot) * 100)))


if __name__ == "__main__":
    main()
