# -*- coding: utf-8 -*-
"""ドシエの通し点検。①古い表現の残存 ②サイト版とArtifact版の内容差 ③参照切れ ④共通ブロックの解決"""
import io, json, re

J = r"C:\Users\h.kadoya\Desktop\slocri\src\machineDossiers.json"
P = r"C:\Users\HCF92~1.KAD\AppData\Local\Temp\claude\C--Users-h-kadoya-Desktop-slocri\749754dd-562f-4a3c-9aeb-9eb666cc91d2\scratchpad\sao2-dossier.html"
d = json.loads(io.open(J, encoding="utf-8").read())
D = d["dossiers"][0]
S = D["sections"]
html = io.open(P, encoding="utf-8").read()
site = json.dumps(d, ensure_ascii=False)
ng = []

print("=== ① 古い表現・撤回した記述の残存 ===")
BAD = ["残量ゲージ", "ちょうど倍", "評価点2.39", "2.39/5", "2.39・", "面積の大小に意味はない", "はじめての人へ", "評価のものさし",
       "5点評価に頼らない4つの軸", "図4", "核心：", "の解剖", "の正体を3層", "13週か20週",
       "設置9週なのに貢献8週", "ALfheim", "999G", "CZスルー6回目濃厚", "死に台1週", "駆け抜けと呼ばれる"]
for b in BAD:
    a, h = site.count(b), html.count(b)
    if a or h:
        # 意図的に残しているもの（訂正の記録）は除外
        ok = b in ("ALfheim", "999G", "CZスルー6回目濃厚")
        mark = "（訂正の記録として意図的）" if ok else "← 要確認"
        print("  %-22s サイト%d / Artifact%d %s" % (b, a, h, mark))
        if not ok:
            ng.append("残存: %s" % b)

print()
print("=== ② 見出しの一致（サイト版 vs Artifact版）===")
site_h = [s["v"] for s in S if s.get("t") == "h"]
site_h += [x["v"] for x in d["common"]["criteria"] if x.get("t") == "h"]
art_h = re.findall(r"<h[23]>([^<]+)</h[23]>", html)
only_site = [x for x in site_h if x not in art_h]
only_art = [x for x in art_h if x not in site_h]
print("  サイト版のみ:", only_site or "なし")
print("  Artifact版のみ:", only_art or "なし")
if only_site or only_art:
    ng.append("見出しの差分あり")

print()
print("=== ③ 共通ブロックの解決 ===")
print("  common.criteria:", len(d["common"]["criteria"]), "セクション／見出し",
      [x["v"] for x in d["common"]["criteria"] if x.get("t") == "h"])
print("  common.glossaryBase:", [g["group"] for g in d["common"]["glossaryBase"]])
refs = [s for s in S if s.get("t") == "common"]
print("  参照:", [(s["v"], s["v"] in d["common"]) for s in refs])
if not all(s["v"] in d["common"] for s in refs):
    ng.append("common参照の解決に失敗")

print()
print("=== ④ 図と用語集の参照整合 ===")
figs = [s["v"] for s in S if s.get("t") == "fig"]
print("  使用中の図:", figs)
for n in ("図1", "図2", "図3"):
    print("  %s の言及: サイト%d / Artifact%d" % (n, site.count(n), html.count(n)))
gl = next(s for s in S if s.get("t") == "glossary")
terms = [t for g in (d["common"]["glossaryBase"] + gl["v"]) for t, _ in g["items"]]
print("  用語数:", len(terms), "（共通", sum(len(g["items"]) for g in d["common"]["glossaryBase"]),
      "＋機種固有", sum(len(g["items"]) for g in gl["v"]), "）")

print()
print("=== ⑤ 章構成と折りたたみ ===")
for s in S:
    if s.get("t") == "part":
        print("  %s %s ── %s ／ 既定=%s" % (s["num"], s["v"], s["sub"], "閉" if s.get("closed") else "開"))
print("  Artifact側の open 属性:", html.count("part\" id=\"p-") - html.count(" open>"), "章が閉、", html.count(" open>"), "章が開")

print()
print("=== ⑥ 数値の一貫性（主要値がサイト/Artifactの両方に同数あるか）===")
for v in ["201%", "91.2%", "4.0→4.2", "2.38", "7,374,367", "84", "98", "22週", "1/16384", "2,200枚"]:
    a, h = site.count(v), html.count(v)
    flag = "" if (a and h) else "← 片方にしかない"
    print("  %-12s サイト%2d / Artifact%2d %s" % (v, a, h, flag))
    if not (a and h):
        ng.append("数値の片寄り: %s" % v)

print()
print("=== ⑦ 参考動画 ===")
vs = next((s for s in S if s.get("t") == "videos"), None)
if vs:
    items = [it for g in vs["v"] for it in g["items"]]
    urls = [it["url"] for it in items]
    print("  %d本 / %dグループ" % (len(items), len(vs["v"])))
    dup = len(urls) - len(set(urls))
    lack = [it["title"][:30] for it in items if not it.get("len") or not it.get("views") or not it.get("note")]
    print("  重複URL:", dup, "／ 尺・再生数・説明の欠け:", lack or "なし")
    inart = sum(1 for u in set(urls) if u in html)
    print("  Artifact版に載っている本数:", inart, "/", len(set(urls)))
    if dup: ng.append("動画URLの重複 %d件" % dup)
    if lack: ng.append("動画メタの欠け %d件" % len(lack))
    if inart != len(set(urls)): ng.append("動画がArtifact版に未反映 %d本" % (len(set(urls)) - inart))

print()
print("=== 結果 ===")
print("  問題なし" if not ng else "  要確認 %d件:" % len(ng))
for x in ng:
    print("   ⚠", x)
