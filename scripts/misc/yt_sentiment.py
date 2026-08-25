# -*- coding: utf-8 -*-
"""④関心度と⑤納得感を、導入8週以内の動画コメントから出す。

条件を全機種でそろえる:
  ・同一4クエリ（機種名＋実践／設定6／天井／初打ち）で候補を集める
  ・導入日＋0〜56日に公開された動画だけを残す（本数は固定しない）
  ・④＝その動画の累計再生数とコメント総数（好評・悪評を区別せず、関心の量として数える）
  ・⑤＝台に触れたコメントの好評率のWilson下限（率が主・母数は信頼度として効く）

判定語:
  ・「ヤバい」「やば」は文脈で正負が変わるので使わない
  ・演者への反応・雑談は台の語を含まないので自動的に外れる

  python scripts/misc/yt_sentiment.py <コメントjson> [<コメントjson> ...]
"""
import io
import json
import math
import re
import sys

MACHINE = ["台", "スペック", "駆け抜け", "バイツ", "BITES", "赫眼", "天井", "設定", "AT", "CZ",
           "演出", "純増", "荒", "出玉", "当たら", "当たり", "上乗せ", "ゲーム性", "打感",
           "筐体", "曲", "BGM", "フリーズ", "上位", "継続", "初当", "コイン", "機械割", "ボーナス"]
POS = ["面白", "楽し", "おもろ", "神台", "好き", "最高", "良台", "名機", "気持ちい", "カッコ",
       "かっこ", "熱い", "アツい", "痺れ", "脳汁", "ワクワク", "傑作", "完成度", "打ちたい",
       "出来良", "良い台", "好評", "神演出", "感動", "рад"]
NEG = ["クソ", "糞", "つまらん", "つまらない", "面白くない", "ゴミ", "無理ゲー", "デキレ", "詐欺",
       "萎え", "苛つ", "イラつ", "ストレス", "不快", "飽き", "退屈", "虚無", "ひどい", "酷い",
       "最悪", "ダメ台", "二度と", "打たない", "地獄"]
Z = 1.96


def likes(x):
    s = str(x.get("likes") or "0").replace(",", "")
    if "万" in s:
        try:
            return int(float(s.replace("万", "")) * 10000)
        except Exception:
            return 0
    return int(re.sub(r"\D", "", s) or 0)


def wilson(pos, n):
    if not n:
        return 0.0
    p = pos / n
    return (p + Z * Z / (2 * n) - Z * math.sqrt(p * (1 - p) / n + Z * Z / (4 * n * n))) / (1 + Z * Z / n)


def score(path):
    c = json.load(io.open(path, encoding="utf-8"))
    m = [x for x in c if any(k in x["text"] for k in MACHINE)]
    p = [x for x in m if any(k in x["text"] for k in POS)]
    ng = [x for x in m if any(k in x["text"] for k in NEG)]
    both = set(id(x) for x in p) & set(id(x) for x in ng)
    n = len(p) + len(ng)
    return {"comments": len(c), "machine": len(m), "pos": len(p), "neg": len(ng),
            "both": len(both), "rate": (100 * len(p) / n if n else 0),
            "wilson": 100 * wilson(len(p), n) if n else 0,
            "toplikes": sorted((likes(x) for x in m), reverse=True)[:3]}


def main():
    print("%-12s %7s %7s %6s %6s %7s %9s" % (
        "機種", "コメ総数", "台の話", "好評", "不評", "好評率", "Wilson下限"))
    rows = []
    for f in sys.argv[1:]:
        name = f.split("C_")[-1].replace(".json", "")
        s = score(f)
        rows.append((name, s))
        print("%-12s %7d %7d %6d %6d %6.0f%% %8.1f%%" % (
            name, s["comments"], s["machine"], s["pos"], s["neg"], s["rate"], s["wilson"]))
    print("\n⑤納得感（Wilson下限）の順位")
    for i, (nm, s) in enumerate(sorted(rows, key=lambda r: -r[1]["wilson"]), 1):
        print("  %d位 %-12s %.1f%%（好評%d/不評%d・母数%d）" % (
            i, nm, s["wilson"], s["pos"], s["neg"], s["pos"] + s["neg"]))
    print("\n④関心度のうちコメント総数の順位")
    for i, (nm, s) in enumerate(sorted(rows, key=lambda r: -r[1]["comments"]), 1):
        print("  %d位 %-12s %d件" % (i, nm, s["comments"]))
    tot = sum(s["both"] for _, s in rows)
    print("\n※好評語と不評語の両方を含むコメントは %d件（両方に数えている）" % tot)


if __name__ == "__main__":
    main()
