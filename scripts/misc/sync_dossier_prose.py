# -*- coding: utf-8 -*-
"""Artifact版の散文（10週目の内容）をサイトJSONから同期する。

表とスコアカードは gen_artifact_regions.py が生成するが、散文は手書き区画なので
ここで対応するブロックを個別に差し替える。対象:
  ・リード文 ・最新週の全国順位（見出し文＋表） ・前作との対比 ・同日デビュー3台 ・予測の答え合わせ
  ・週次表のキャプション ・母数と出典
"""
import io, json, re, html as H

J = r"C:\Users\h.kadoya\Desktop\slocri\src\machineDossiers.json"
P = (r"C:\Users\HCF92~1.KAD\AppData\Local\Temp\claude"
     r"\C--Users-h-kadoya-Desktop-slocri\749754dd-562f-4a3c-9aeb-9eb666cc91d2\scratchpad\sao2-dossier.html")

d = json.loads(io.open(J, encoding="utf-8").read())
D = next(x for x in d["dossiers"] if x["id"] == "sao2")  # 並び順に依存しない
S = D["sections"]
t = io.open(P, encoding="utf-8").read()


def rich(x):
    x = H.escape(str(x))
    x = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", x)
    return x.replace("\n", "<br>")


def swap(start_marker, end_marker, new, label, after=0):
    """start_marker から end_marker までを new で置換"""
    global t
    try:
        a = t.index(start_marker, after)
        b = t.index(end_marker, a) + len(end_marker)
    except ValueError:
        print("  ⚠ 見つからず:", label)
        return
    t = t[:a] + new + t[b:]
    print("  置換:", label)


done = []

# 1. Ⅰ章の冒頭段落は sync_dossier_verdict.py が担当（ここでは触らない）

# 2. h1 と chips（9週すべて → 10週すべて）
t = t.replace("<h1>9週すべて全国平均超え。", "<h1>10週すべて全国平均超え。")
for old, new in (('<span class="chip good">9週すべて全国平均超え</span>',
                  '<span class="chip good">10週すべて全国平均超え</span>'),):
    if old in t:
        t = t.replace(old, new)
        print("  置換: chip（10週すべて）")

# 3. 週次表のキャプション
t18 = next(x for x in S if x.get("t") == "table" and x["head"][0] == "週")
i = next(t.index(m) for m in ('<p class="cap">出玉率は',) if m in t)
j = t.index("</p>", i) + 4
t = t[:i] + '<p class="cap">%s</p>' % rich(t18["note"]) + t[j:]
print("  置換: 週次表のキャプション")

# 4. グラフのキャプションとaria-label（前作との対比はここに入っている）
t = t.replace(
    "aria-label=\"経過週ごとの稼働値推移。SAO2は9週目で201%、戦国乙女5は152%、からくりサーカス2は5週で108%、前作初代SAOは9週で124%。\"",
    "aria-label=\"経過週ごとの稼働値推移。SAO2は10週目で185%、戦国乙女5は151%、からくりサーカス2は5週で108%、前作初代SAOは9週で124%。\"")
i = t.index('<figcaption class="cap">全数値は下の表と同じ。')  # 冪等（同じ書き出しを維持）
j = t.index("</figcaption>", i) + len("</figcaption>")
t = t[:i] + ('<figcaption class="cap">全数値は下の表と同じ。横軸は<b>各機種の導入からの経過週</b>'
             '（からくりサーカス2は7/6導入、前作は2023年導入なので暦日は揃わない）。ホバー（タップ）で各週の値を表示。<br>'
             '<b>前作との対比</b>：初代SAO（2023年5月導入）は9週で282%→124%（−56%）まで落ち、'
             '<b>貢献17週で終わったのにその後152週も設置され続けた</b>（死に台152週）。'
             'SAO2は10週目で185%、しかも台数は増えている。</figcaption>') + t[j:]
print("  置換: グラフのキャプション（前作との対比を含む）")

# 5. 最新週の全国順位（見出し文＋表）
t21 = next(x for x in S if x.get("t") == "table" and x["head"][0] == "順位")
i = next(t.index(m) for m in ('<p class="prose">2026年8月3日週・週次SIS',
                             '<p class="prose">2026年8月10日週') if m in t)
j = t.index("</p>", i) + 4
t = t[:i] + ('<p class="prose">2026年8月10日週（お盆）・週次SISのL機種（スロット）全125機種でパチンコは含まない。'
             '<b>上位8台のうち6台が導入2週目の新台</b>で、10週以上経った台はSAO2と戦国乙女5、'
             'そして28週のうみねこ2だけである。</p>') + t[j:]
ts = t.index("<thead><tr><th>順位</th>")
s = t.rindex("<table>", 0, ts)
e = t.index("</table>", ts) + 8
rows = []
for n, row in enumerate(t21["rows"]):
    me = ' class="me"' if t21.get("hi") == n else ""
    tds = "".join('<td%s>%s</td>' % (' class="n"' if k in (0, 2, 3, 4) else "", rich(c))
                  for k, c in enumerate(row))
    rows.append("          <tr%s>%s</tr>" % (me, tds))
tbl = ("<table>\n          <thead><tr>%s</tr></thead>\n          <tbody>\n%s\n          </tbody>\n        </table>"
       % ("".join("<th>%s</th>" % rich(h) for h in t21["head"]), "\n".join(rows)))
t = t[:s] + tbl + t[e:]
ci = t.index('<p class="cap">', s)
ce = t.index("</p>", ci)
t = t[:ci] + '<p class="cap">%s' % rich(t21["note"]) + t[ce:]
print("  置換: 最新週の全国順位（見出し文・表・注）")

# 6. 同日デビュー3台
b22 = next(x for x in S if x.get("t") == "bullets" and "同日デビュー" in str(x.get("title", "")))
i = t.index("同日デビュー3台の答え合わせ")
s = t.rindex('<div class="card', 0, i)
e = t.index("</div>", t.index("</ul>", i) if "</ul>" in t[i:i + 4000] else i) + 6
blk = ['      <div class="card">',
       '        <h3 style="margin-top:0">%s</h3>' % rich(b22["title"]), "        <ul>"]
for it in b22["items"]:
    blk.append("          <li>%s" % rich(it["t"]))
    if it.get("sub"):
        blk.append("            <ul>" + "".join("<li>%s</li>" % rich(x) for x in it["sub"]) + "</ul>")
    blk.append("          </li>")
blk.append("        </ul>")
blk.append('        <p class="cap">%s</p>' % rich(b22["tail"]))
blk.append("      </div>")
t = t[:s] + "\n".join(blk) + t[e:]
print("  置換: 同日デビュー3台")

def swap_note(t, marks, note, label, style=""):
    """HTMLの目印を含む<p class="note">を丸ごと差し替える。目印が無ければ何もしない。"""
    if note is None:
        print("  飛ばす: %s（サイト側のnoteが見つからない）" % label)
        return t
    i = next((t.index(m) for m in marks if m in t), None)
    if i is None:
        print("  飛ばす: %s（HTML側の目印が見つからない）" % label)
        return t
    s = t.rindex('<p class="note"', 0, i)
    e = t.index("</p>", i) + 4
    print("  置換:", label)
    return t[:s] + '<p class="note"%s>%s</p>' % (style, rich(note)) + t[e:]


# 7. 予測の答え合わせ
n84 = next((x["v"] for x in S if x.get("t") == "note"
            and "22週" in str(x.get("v", "")) and "予測" in str(x.get("v", ""))), None)
t = swap_note(t, ("次の2〜3週の分岐点", "当編集部は8月3日のコラムでSAO2の稼働貢献週"),
              n84, "予測の答え合わせ", ' style="margin-bottom:0"')

# 8. 母数と出典
n96 = next((x["v"] for x in S if x.get("t") == "note" and "母数と出典" in str(x.get("v", ""))), None)
t = swap_note(t, ("<b>母数と出典。</b>",), n96, "母数と出典")

io.open(P, "w", encoding="utf-8").write(t)
bad = [g for g in ("div", "table", "section", "details", "figure", "svg", "p", "ul", "li")
       if len(re.findall(r"<%s[\s>]" % g, t)) != t.count("</%s>" % g)]
print("タグ整合:", "OK" if not bad else "不一致 %s" % bad)
