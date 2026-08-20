# -*- coding: utf-8 -*-
"""Artifact版の「数値が動く区画」をサイトJSONから生成して差し替える。

同じ箇所を手で3回直して食い違いを出したので、以後は生成に切り替える。
生成対象（本文の対応セクションから作る）:
  A. 5軸スコアカード（section id="radar" の中身ぜんぶ：スコア・表・レーダーSVG・読み方）
  B. 結論の直後のKPIタイル
  C. 指標と基準の5軸表／ウェイト表／③のnote
文章そのものはサイトJSONが唯一の正。ここでは HTML への変換だけを行う。
"""
import io, json, math, re, html as H

J = r"C:\Users\h.kadoya\Desktop\slocri\src\machineDossiers.json"
P = (r"C:\Users\HCF92~1.KAD\AppData\Local\Temp\claude"
     r"\C--Users-h-kadoya-Desktop-slocri\749754dd-562f-4a3c-9aeb-9eb666cc91d2\scratchpad\sao2-dossier.html")

d = json.loads(io.open(J, encoding="utf-8").read())
S = d["dossiers"][0]["sections"]
C = d["common"]["criteria"]


def rich(x):
    x = H.escape(str(x))
    x = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", x)
    return x.replace("\n", "<br>")


def table_html(t, cls="", tcls="", right=False):
    o = ['    <div class="card tight%s">' % (" " + cls if cls else ""), '      <div class="scroll">',
         '        <table%s>' % ((' class="%s"' % tcls) if tcls else "")]
    o.append("          <thead><tr>" + "".join("<th>%s</th>" % rich(h) for h in t["head"]) + "</tr></thead>")
    o.append("          <tbody>")
    for i, row in enumerate(t["rows"]):
        me = ' class="me"' if t.get("hi") == i else ""
        tds = []
        for j, c in enumerate(row):
            al = "" if j == 0 else (' style="text-align:right"' if right else ' style="text-align:left"')
            tds.append("<td%s>%s</td>" % (al, rich(c)))
        o.append("          <tr%s>%s</tr>" % (me, "".join(tds)))
    o += ["          </tbody>", "        </table>", "      </div>"]
    if t.get("note"):
        o.append('      <p class="cap">%s</p>' % rich(t["note"]))
    o.append("    </div>")
    return "\n".join(o)


def radar_svg(spec):
    cx, cy, R = 285, 232, 138
    vals = spec["series"][0]["values"]
    ax = spec["axes"]
    n = len(ax)

    def ang(i):
        return math.radians(-90 + i * (360 / n))

    def pt(i, v):
        return (round(cx + R * (v / 100) * math.cos(ang(i)), 1), round(cy + R * (v / 100) * math.sin(ang(i)), 1))

    def poly(vs):
        return " ".join("%s,%s" % pt(i, v) for i, v in enumerate(vs) if v is not None)

    o = []
    aria = "、".join("%sが%s" % (a["name"], "測定不能" if vals[i] is None else "上位%d%%" % (100 - vals[i]))
                    for i, a in enumerate(ax))
    o.append('          <svg class="fig radar" viewBox="0 0 570 470" role="img" '
             'aria-label="評価5軸の5角形チャート。%s。外側ほど上位。">' % aria)
    for g in (25, 50, 75, 100):
        o.append('            <polygon points="%s" class="rgrid%s" />'
                 % (poly([g] * n), " outer" if g == 100 else ""))
    for i in range(n):
        x, y = pt(i, 100)
        o.append('            <line x1="%d" y1="%d" x2="%s" y2="%s" class="rgrid" />' % (cx, cy, x, y))
    for g in (25, 50, 75, 100):
        _, y = pt(0, g)
        o.append('            <text x="%d" y="%s" class="rsc">%d</text>' % (cx + 4, round(y + 3, 1), g))
    o.append('            <polygon points="%s" class="rpoly rs-brand" />' % poly(vals))
    for i, v in enumerate(vals):
        if v is None:
            continue
        x, y = pt(i, v)
        o.append('            <circle cx="%s" cy="%s" r="4" class="rdot rs-brand" />' % (x, y))
    for i, a in enumerate(ax):
        x, y = pt(i, 100)
        dx, dy = math.cos(ang(i)), math.sin(ang(i))
        anchor = "middle" if abs(dx) < 0.2 else ("start" if dx > 0 else "end")
        lx = round(x + dx * 20, 1)
        ly = round(y + dy * 22 + ((-4 if dy < 0 else 14) if abs(dx) < 0.2 else 0), 1)
        nm = a["name"] + ("※" if a.get("small") else "")
        v = vals[i]
        o.append('            <text x="%s" y="%s" text-anchor="%s" class="rax">%s</text>' % (lx, ly, anchor, nm))
        o.append('            <text x="%s" y="%s" text-anchor="%s" class="rpc">%s</text>'
                 % (lx, round(ly + 15, 1), anchor, "測定不能" if v is None else "上位%d%%" % (100 - v)))
    o.append("          </svg>")
    return "\n".join(o)


# ---------------- A. スコアカード区画 ----------------
rad = next(x for x in S if x.get("t") == "radar")["v"]
intro = next(x for x in S if x.get("t") == "p" and "結論を1枚" in str(x.get("v", "")))["v"] \
    if any(x.get("t") == "p" and "結論を1枚" in str(x.get("v", "")) for x in S) else None
read = next(x for x in S if x.get("t") == "note" and "この図の読み方" in str(x.get("v", "")))["v"]
sc = rad["score"]

A = ['    <h2>5軸スコアカード</h2>']
if intro:
    A.append('    <p class="prose">%s</p>' % rich(intro))
A.append('    <div class="scgrid">')
A.append('      <div class="scscore">')
A.append('        <div class="sctot"><span class="lbl">総合スコア</span><b>%d</b><span class="den">/ 100</span></div>'
         % sc["total"])
for p in sc["parts"]:
    A.append('        <div class="scpart"><span>%s</span><b>%s</b></div>' % (rich(p["k"]), p["v"]))
A.append('        <span class="scnote">%s</span>' % rich(rad["table"]["note"]))
A.append("      </div>")
A.append(table_html(rad["table"], tcls="sctb", right=True).replace('    <div class="card tight">', '      <div class="card tight">'))
A.append('      <div class="card">')
A.append("        <figure>")
A.append(radar_svg(rad))
A.append('          <figcaption class="cap">%s</figcaption>' % rich(rad["caption"]))
A.append("        </figure>")
A.append("      </div>")
A.append("    </div>")
A.append('    <div class="card tight"><p class="note" style="margin:0">%s</p></div>' % rich(read))
A = "\n".join(A)

t = io.open(P, encoding="utf-8").read()
a = t.index('    <h2>5軸スコアカード</h2>')
b = t.index("    </section>", a)
t = t[:a] + A + "\n" + t[b:]

# ---------------- B. KPIタイル ----------------
k = next(x for x in S if x.get("t") == "kpis")["v"]
B = "\n".join('      <div class="kpi"><div class="k">%s</div><div class="v">%s</div><div class="n">%s</div></div>'
              % (rich(x["k"]), rich(x["v"]), rich(x.get("n", ""))) for x in k)
a = t.index('      <div class="kpi">')
b = t.index("    </div>", a)
t = t[:a] + B + "\n" + t[b:]

# ---------------- C. 共通の表とnote ----------------
def replace_table_by_head(t, head0, newtable, indent="    "):
    """head の先頭セルで探して table 要素だけ差し替える"""
    marker = "<thead><tr><th>%s</th>" % head0
    i = t.index(marker)
    s = t.rindex("<table>", 0, i)
    e = t.index("</table>", i) + len("</table>")
    inner = "\n".join(l for l in newtable.split("\n")
                      if not l.strip().startswith(('<div class="card', "</div>", '<p class="cap"', '<div class="scroll')))
    return t[:s] + inner.strip() + t[e:], i


C15 = next(x for x in C if x.get("t") == "table" and len(x["head"]) == 4 and "何を測っているか" in x["head"])
W = next(x for x in C if x.get("t") == "table" and "ウェイト" in x["head"])
for tb, head0 in ((C15, "軸"), (W, "軸")):
    pass  # 下で個別処理

miss = []
# 5軸表（head: 軸 / SAO2の値 / 他機種と比べた位置 / 何を測っているか）
old_start = t.index("<thead><tr><th>軸</th><th>SAO2の値")
s = t.rindex("<table>", 0, old_start)
e = t.index("</table>", old_start) + 8
body = table_html(C15)
inner = body[body.index("<table>"):body.index("</table>") + 8]
t = t[:s] + inner + t[e:]
# 直後の cap も更新
cap_i = t.index('<p class="cap">', e - (len(inner) - (e - s)))
cap_e = t.index("</p>", cap_i)
t = t[:cap_i] + '<p class="cap">%s' % rich(C15["note"]) + t[cap_e:]

# ウェイト表
ws = t.index("<thead><tr><th>軸</th><th>ウェイト</th>")
s2 = t.rindex("<table>", 0, ws)
e2 = t.index("</table>", ws) + 8
body = table_html(W)
inner = body[body.index("<table>"):body.index("</table>") + 8]
t = t[:s2] + inner + t[e2:]
cap_i = t.index('<p class="cap">', s2)
cap_e = t.index("</p>", cap_i)
t = t[:cap_i] + '<p class="cap">%s' % rich(W["note"]) + t[cap_e:]

# ③のnote
n_hall = next(x for x in C if x.get("t") == "note" and str(x.get("v", "")).startswith("**③"))
hs = next(t.index(m) for m in ("<b>③に台数比を", "<b>③に「台数」", "<strong>③の定義を") if m in t)
s3 = t.rindex('<p class="note"', 0, hs)
e3 = t.index("</p>", hs) + 4
t = t[:s3] + '<p class="note" style="margin:0">%s</p>' % rich(n_hall["v"]) + t[e3:]

# 持続率の表
t4 = next(x for x in S if x.get("t") == "table" and x["head"][0].startswith("指標"))
ts = t.index("<thead><tr><th>指標")
s4 = t.rindex("<table>", 0, ts)
e4 = t.index("</table>", ts) + 8
body = table_html(t4)
inner = body[body.index("<table>"):body.index("</table>") + 8]
t = t[:s4] + inner + t[e4:]
cap_i = t.index('<p class="cap">', s4)
cap_e = t.index("</p>", cap_i)
t = t[:cap_i] + '<p class="cap">%s' % rich(t4["note"]) + t[cap_e:]

io.open(P, "w", encoding="utf-8").write(t)
print("Artifact版: スコアカード・KPI・5軸表・ウェイト表・③note・持続率表をサイトJSONから生成して差し替え")
