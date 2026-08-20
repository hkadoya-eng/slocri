# -*- coding: utf-8 -*-
"""Artifact版の Ⅰ章（結論）をサイトJSONに合わせる。
   ・KPIタイルを結論の見出し直後へ移す（数字を先に見せる）
   ・リード文と結論の各段落を差し替える
"""
import io, json, re, html as H

J = r"C:\Users\h.kadoya\Desktop\slocri\src\machineDossiers.json"
P = (r"C:\Users\HCF92~1.KAD\AppData\Local\Temp\claude"
     r"\C--Users-h-kadoya-Desktop-slocri\749754dd-562f-4a3c-9aeb-9eb666cc91d2\scratchpad\sao2-dossier.html")

d = json.loads(io.open(J, encoding="utf-8").read())
D = d["dossiers"][0]
S = D["sections"]
t = io.open(P, encoding="utf-8").read()


def rich(x):
    x = H.escape(str(x))
    x = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", x)
    return x.replace("\n", "<br>")


# 1. リード文
i = t.index('<p class="lede">') if '<p class="lede">' in t else None
if i is None:
    # クラス名を探す
    m = re.search(r'<p class="(lede|sub|deck)">', t)
    i = m.start() if m else None
if i is not None:
    j = t.index("</p>", i) + 4
    cls = re.match(r'<p class="(\w+)">', t[i:]).group(1)
    t = t[:i] + '<p class="%s">%s</p>' % (cls, rich(D["lede"])) + t[j:]
    print("  置換: リード文")
else:
    print("  ⚠ リード文の位置が見つからず")

# 2. KPIタイルを結論見出しの直後へ移す
ks = t.index('<div class="kpis">')
ke = t.index("</div>", t.index("</div>", ks) + 6)  # 最後のkpiの後の閉じ
# kpis ブロック全体を取り出す（次の "    </div>" まで）
ke = t.index("\n    </div>", ks) + len("\n    </div>")
kpis_block = t[ks:ke]
t = t[:ks] + t[ke:]
anchor = "    <h2>結論</h2>\n"
a = t.index(anchor) + len(anchor)
t = t[:a] + "    " + kpis_block.strip() + "\n" + t[a:]
print("  移動: KPIタイル → 結論の直後")

# 3. 結論の各段落
paras = [s["v"] for s in S if s.get("t") == "p"][:0]  # 使わない
def para_by_head(head):
    return next(s["v"] for s in S if s.get("t") == "p" and s["v"].startswith(head))

PAIRS = [
 ('<p class="prose">ダイトー（パオン・ディーピー）が2026年6月8日に出した',
  para_by_head("**稼働値は10週すべて")),
 ('<p class="prose">減衰の仕方に特徴がある。',
  para_by_head("**2週目までは")),
 ('<p class="prose">評価点は<strong>2.38/5（324件',
  para_by_head("評価点**2.38/5（324件")),
 ('<p class="prose">整理すると、<strong>評価は平均的・稼働は突出</strong>',
  para_by_head("称賛は演出・楽曲・バレットサークルに")),
 ('<p class="prose">結論を1枚にすると次のようになる。',
  para_by_head("当編集部は機種の評価を")),
]
for start, new in PAIRS:
    if start not in t:
        print("  ⚠ 見つからず:", start[:44])
        continue
    a = t.index(start)
    b = t.index("</p>", a) + 4
    t = t[:a] + '<p class="prose">%s</p>' % rich(new) + t[b:]
    print("  置換:", new[:26])

io.open(P, "w", encoding="utf-8").write(t)
bad = [g for g in ("div", "table", "section", "details", "figure", "svg", "p")
       if len(re.findall(r"<%s[\s>]" % g, t)) != t.count("</%s>" % g)]
print("タグ整合:", "OK" if not bad else "不一致 %s" % bad)
print("残り ——:", t.count("——"))
