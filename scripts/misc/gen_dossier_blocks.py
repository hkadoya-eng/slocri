# -*- coding: utf-8 -*-
"""Artifact版に「生成ブロック」を導入する。

サイトJSONの連続したセクション列をHTMLへ変換して、
  <!-- gen:NAME --> ... <!-- /gen:NAME -->
の間に流し込む。以後この区画は毎回まるごと再生成するので手で触らない。
今回入れるブロック:
  gen:traj  総稼働の軌跡（Ⅲ章）
  gen:comp  競合の新台圧の検証（Ⅱ章）
  gen:ret   ②の定義変更の説明（Ⅱ章）
"""
import io, json, re, html as H

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


def render(secs):
    o = []
    for s in secs:
        t = s.get("t")
        if t == "h":
            o.append("    <h%d>%s</h%d>" % (s.get("lv", 2), rich(s["v"]), s.get("lv", 2)))
        elif t == "p":
            o.append('    <p class="prose">%s</p>' % rich(s["v"]))
        elif t == "note":
            o.append('    <div class="card tight"><p class="note" style="margin:0">%s</p></div>' % rich(s["v"]))
        elif t == "table":
            o.append('    <div class="card tight">')
            o.append('      <div class="scroll">')
            o.append("        <table>")
            o.append("          <thead><tr>" + "".join("<th>%s</th>" % rich(h) for h in s["head"]) + "</tr></thead>")
            o.append("          <tbody>")
            for i, row in enumerate(s["rows"]):
                me = ' class="me"' if s.get("hi") == i else ""
                tds = "".join("<td%s>%s</td>" % ("" if j == 0 else ' style="text-align:left"', rich(c))
                              for j, c in enumerate(row))
                o.append("          <tr%s>%s</tr>" % (me, tds))
            o += ["          </tbody>", "        </table>", "      </div>"]
            if s.get("note"):
                o.append('      <p class="cap">%s</p>' % rich(s["note"]))
            o.append("    </div>")
    return "\n".join(o)


def grab(lst, start_pred, count):
    i = next(k for k, x in enumerate(lst) if start_pred(x))
    return lst[i:i + count]


BLOCKS = {
    "traj": render(grab(S, lambda x: x.get("t") == "h" and "総稼働の落ち方" in str(x.get("v", "")), 4)),
    "extra": render(grab(S, lambda x: x.get("t") == "h" and "軸にはしていない3つ" in str(x.get("v", "")), 3)),
    "comp": render(grab(C, lambda x: x.get("t") == "h" and "競合の新台圧" in str(x.get("v", "")), 4)),
    "ret": render(grab(C, lambda x: x.get("t") == "note" and "②を「4週目÷初週" in str(x.get("v", "")), 1)),
    "rej": render(grab(C, lambda x: x.get("t") == "h" and "軸にしなかった指標" in str(x.get("v", "")), 4)),
}

t = io.open(P, encoding="utf-8").read()

# 挿入位置（初回だけ。2回目以降はマーカーの間を差し替える）
ANCHORS = {
    "traj": '    <h2>最新週の全国順位</h2>',
    "extra": '    <h2>最新週の全国順位</h2>',
    "comp": '    <h3>軸のウェイトと「測定不能」の扱い</h3>',
    "ret": '    <h3>軸のウェイトと「測定不能」の扱い</h3>',
    "rej": '    <h2>評価は平均、稼働は突出</h2>',
}
# 文書内の順序: Ⅱ章（ret → comp → ウェイト → rej）／Ⅲ章（traj → extra → 全国順位）
ORDER = ["traj", "extra", "ret", "comp", "rej"]

for name in ORDER:
    body = BLOCKS[name]
    s_mark, e_mark = "<!-- gen:%s -->" % name, "<!-- /gen:%s -->" % name
    block = "%s\n%s\n%s\n" % (s_mark, body, e_mark)
    if s_mark in t:
        a = t.index(s_mark)
        b = t.index(e_mark) + len(e_mark) + 1
        t = t[:a] + block + t[b:]
        print("  再生成:", name)
    else:
        anc = ANCHORS[name]
        i = t.index(anc)
        t = t[:i] + block + t[i:]
        print("  新規挿入:", name)

io.open(P, "w", encoding="utf-8").write(t)
bad = [g for g in ("div", "table", "section", "details", "figure", "svg", "p")
       if len(re.findall(r"<%s[\s>]" % g, t)) != t.count("</%s>" % g)]
print("タグ整合:", "OK" if not bad else "不一致 %s" % bad)
