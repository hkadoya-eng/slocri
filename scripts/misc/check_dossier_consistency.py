# -*- coding: utf-8 -*-
"""レポート内の辻褄を検査する。

2026-08-25、東京喰種で3種類の矛盾を同時に出した。原因は「1サイトずつ要約で値を取って、
そのまま本文に貼っていた」こと。値そのものは出典にあっても、**組み合わせると成り立たない**
状態を検出できていなかった。同じ事故を繰り返さないための検査。

検出するもの:
  ① 管理方式の混在   … 差枚数管理と書いた台に「ゲーム数の減算」等が出ていないか
  ② 上位状態の否定と存在の同居 … 「上位ATを持たない」と書きつつ上位状態を語っていないか
  ③ 用語の役割の食い違い … 同じ名称が章をまたいで別の役割で書かれていないか
                       （用語集の定義と本文の使い方を突合する）
  ④ 数値の食い違い     … 同じ項目の数値が章で違っていないか（純増・天井・成功率）
  ⑤ 出典の裏取り漏れ   … Ⅶ章のlinksが2件未満、または解析サイトが1件しかない
  ⑥ 造語の残存       … 実在しないと確認した言い回しが本文に残っていないか

  python scripts/misc/check_dossier_consistency.py            # 全ドシエ
  python scripts/misc/check_dossier_consistency.py --id ghoul  # 1本だけ
"""
import io
import json
import re
import sys

J = r"C:\Users\h.kadoya\Desktop\slocri\src\machineDossiers.json"
d = json.loads(io.open(J, encoding="utf-8").read())

want = None
for i, a in enumerate(sys.argv[1:]):
    if a == "--id":
        want = sys.argv[i + 2]
    elif a.startswith("--id="):
        want = a.split("=", 1)[1]

# ① 管理方式ごとに、出てはいけない語
CONFLICT = [
    ("差枚数管理", ["ゲーム数の減算", "G数減算", "残りゲーム数が表示", "ゲーム数上乗せ型"],
     "差枚数管理型なのにゲーム数の話が出ている"),
    ("ゲーム数管理", ["差枚が尽き", "差枚数が尽き", "差枚数管理型AT"],
     "ゲーム数管理型なのに差枚の話が出ている"),
]
# ② 上位状態を否定する言い方と、上位状態を指す語
DENY = ["上位ATを持たない", "上位ATは存在しない", "純増が一段しかない", "上位状態を持たない"]
UPPER = ["上位AT", "裏AT", "上位状態", "ENDLESS GIG", "真BB", "真強カワ", "フルダイブ"]
# ④ 同じ項目が複数の値で書かれていたら疑う
NUMPAT = {
    "AT純増": r"純増[約 ]*([0-9]+\.[0-9])枚",
    "CZ天井": r"CZ[間]?天井[^0-9]{0,4}([0-9]{3,4})G",
    "AT天井": r"AT[間]?天井[^0-9]{0,4}([0-9]{3,4})G",
}
# 設定変更後・リセット時の短縮値は別の値なので、複数あって当然。数値の食い違いから除く
SHORTENED = ["設定変更後", "設定変更時", "リセット時", "リセット後", "変更後", "朝イチ", "短縮"]

# ⑥ 実在しないと確認した言い回し（当編集部が生成してしまった造語）。本文に出たら差し替える
FABRICATED = {
    "BITES残0": "解析にも打ち手の発言にも無い。当編集部のprosが出どころだった（2026-08-25確認）",
    "残量ゲージ": "実機にそんな表示はない（SAO2で同じ事故を出した）",
}

ng_all = []
for dd in d["dossiers"]:
    if want and dd["id"] != want:
        continue
    s = json.dumps(dd, ensure_ascii=False)
    body = re.sub(r"[\"{}\[\],]", " ", s)
    # 他機種と比べる表・行は自分の仕様ではないので、管理方式の検査から外す
    others = [x.get("machine", "") for x in d["dossiers"] if x["id"] != dd["id"]]
    own = []
    for sec in dd["sections"]:
        j = json.dumps(sec, ensure_ascii=False)
        if sec.get("t") == "table":
            head0 = (sec.get("head") or [""])[0]
            if head0 in ("機種", "比べる相手"):
                continue                      # 他機種比較の表はまるごと除く
            rows = [r for r in sec.get("rows", [])
                    if not any(o and o[:6] in str(r[0]) for o in others)
                    and not any(w in str(r[0]) for w in ["L東京喰種", "SAO2", "L真打吉宗",
                                                          "L攻殻機動隊", "L戦国乙女5"])]
            j = json.dumps({**sec, "rows": rows}, ensure_ascii=False)
        own.append(j)
    mine = re.sub(r"[\"{}\[\],]", " ", " ".join(own))
    print("\n■ %s（%s）" % (dd["id"], dd.get("machine", "")))
    ng = []

    # ① 管理方式の混在。方式はスペック表の「タイプ」行から読む
    # （本文にキーワードがあるかで判定すると、他方式と比べている記述を誤検出する）
    kind = None
    for sec in dd["sections"]:
        if sec.get("t") == "table" and (sec.get("head") or [""])[0] == "項目":
            for r in sec.get("rows", []):
                if "タイプ" in str(r[0]):
                    val = str(r[1]) + str(r[2] if len(r) > 2 else "")
                    if "差枚数管理" in val:
                        kind = "差枚数管理"
                    elif "ゲーム数" in val:
                        kind = "ゲーム数管理"
    if kind:
        print("   管理方式: %s（スペック表より）" % kind)
        bad = dict((m, b) for m, b, _ in [(c[0], c[1], c[2]) for c in CONFLICT])[kind]
        msg = dict((c[0], c[2]) for c in CONFLICT)[kind]
        for b in bad:
            if b in mine:
                ng.append("① %s：「%s」の台に「%s」が出ている" % (msg, kind, b))
    else:
        print("   管理方式: スペック表から読めなかった")

    # ② 上位状態の否定と存在の同居
    for dn in DENY:
        if dn in body:
            found = [u for u in UPPER if u in body]
            if found:
                ng.append("② 「%s」と書きながら上位状態を語っている（%s）" % (dn, "・".join(found[:3])))

    # ③ 用語集の定義と本文の使い方を突合
    gl = next((x for x in dd["sections"] if x.get("t") == "glossary"), None)
    if gl:
        for term, defi in gl["v"][0]["items"]:
            if len(term) < 3:
                continue
            # 用語集で「AT中の」と定義されているものが、本文で通常時のCZとして出ていないか
            if "AT中の" in defi:
                for m in re.finditer(r"(通常時のCZ|メインCZ)「?%s" % re.escape(term), body):
                    ng.append("③ 「%s」はAT中の要素だが、通常時のCZとして書かれている" % term)
            # 用語集で上位CZと定義されているものがメインCZとして出ていないか
            if "上位CZ" in defi:
                if re.search(r"メインCZ「?%s" % re.escape(term), body):
                    ng.append("③ 「%s」は上位CZだが、メインCZとして書かれている" % term)

    # ④ 同じ項目に複数の値
    for label, pat in NUMPAT.items():
        # 短縮値の文脈にある数字は拾わない
        vals = sorted({m.group(1) for m in re.finditer(pat, body)
                       if not any(w in body[max(0, m.start() - 40):m.start()] for w in SHORTENED)})
        if len(vals) > 1:
            # 上位ATの純増など、複数あるのが正しい場合は除く
            if label == "AT純増" and len(vals) <= 4:
                continue
            ng.append("④ %s に複数の値がある: %s" % (label, "／".join(vals)))

    # ⑥ 造語の残存
    for w, why in FABRICATED.items():
        if w in body:
            ng.append("⑥ 実在しない言い回し「%s」が残っている（%s）" % (w, why))

    # ⑤ 出典の数
    lk = next((x for x in dd["sections"] if x.get("t") == "links"), None)
    if lk:
        urls = [x["url"] for x in lk["v"]]
        kaiseki = [u for u in urls if any(k in u for k in
                   ["chonborista", "1geki", "pachiseven", "nana-press", "slopachi", "amuse-p", "dechau"])]
        print("   出典 %d件（解析サイト %d件）" % (len(urls), len(kaiseki)))
        if len(kaiseki) < 2:
            ng.append("⑤ 解析サイトの出典が%d件しかない（2件以上で突合する）" % len(kaiseki))
    else:
        ng.append("⑤ Ⅶ章のlinksが無い")

    if ng:
        for x in ng:
            print("   ⚠ " + x)
        ng_all += [(dd["id"], x) for x in ng]
    else:
        print("   矛盾なし")

print("\n=== 結果 ===")
if ng_all:
    print("  要修正 %d件" % len(ng_all))
    for i, x in ng_all:
        print("   [%s] %s" % (i, x))
else:
    print("  全ドシエで矛盾なし")
