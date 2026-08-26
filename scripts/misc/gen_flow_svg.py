# -*- coding: utf-8 -*-
"""ゲームフロー図（flowData）を Artifact版のSVGとして生成する。

サイト版は MachineDossier.jsx の FigFlowData が描く。Artifact版を手書きすると
必ずずれるので、**同じ spec から同じ座標でSVGを吐く**。定数と経路の決め方は
FigFlowData と check_dossier_consistency.py の⑦に合わせてある（3箇所を同時に直す）。

  python scripts/misc/gen_flow_svg.py <ドシエID> [出力HTMLのパス]

出力HTMLの <!-- gen:flow --> ... <!-- /gen:flow --> を置き換える。
マーカーが無ければ標準出力にSVGだけ書き出す。
"""
import io
import json
import re
import sys
import html as H

J = r"C:\Users\h.kadoya\Desktop\slocri\src\machineDossiers.json"
ART = {"sao2": (r"C:\Users\HCF92~1.KAD\AppData\Local\Temp\claude"
                r"\C--Users-h-kadoya-Desktop-slocri\749754dd-562f-4a3c-9aeb-9eb666cc91d2"
                r"\scratchpad\sao2-dossier.html")}

CW, CH, BW, BH, PAD = 250, 124, 194, 78, 16
GX, GY = CW - BW, CH - BH
INK, MUTED, HAIR = "#2C2A28", "#9A938C", "#D8D2CC"
TONE = {"hair": "#C9C2BB", "blue": "#5B8AA6", "brand": "#D97B4A", "tier": "#8C6BB1"}


def rich(x):
    x = H.escape(str(x))
    x = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", x)
    return x.replace("\n", "<br>")


def box(n):
    x, y = PAD + n["col"] * CW, PAD + n["row"] * CH
    return x, y, x + BW, y + BH


def wid(s):
    return sum(5.6 if ord(c) < 128 else 10 for c in s)


def route(nodes, a, b, off):
    """FigFlowData と同じ規則で折れ点・ラベル位置・寄せ方を返す。"""
    ax, ay, ar, ab = box(a)
    bx, by, br, bb = box(b)
    acy, bcy = ay + BH / 2, by + BH / 2
    acx, bcx = ax + BW / 2, bx + BW / 2
    occ = {(n["col"], n["row"]) for n in nodes}
    blocked = False
    if a["col"] == b["col"]:
        lo, hi = sorted([a["row"], b["row"]])
        blocked = any((a["col"], r) in occ for r in range(lo + 1, hi))
    elif a["row"] == b["row"]:
        lo, hi = sorted([a["col"], b["col"]])
        blocked = any((c, a["row"]) in occ for c in range(lo + 1, hi))
    if a["col"] == b["col"] and not blocked:
        down = by > ay
        x = acx + off
        y1, y2 = (ab, by) if down else (ay, bb)
        lx = x + (0 if not off else (-6 if off < 0 else 6))
        an = "middle" if not off else ("end" if off < 0 else "start")
        return [(x, y1), (x, y2)], lx, (y1 + y2) / 2 + 3.5, an
    if a["row"] == b["row"] and not blocked:
        right = bx > ax
        y = acy + off
        x1, x2 = (ar, bx) if right else (ax, br)
        return [(x1, y), (x2, y)], (x1 + x2) / 2, y + (13 if off > 0 else -8), "middle"
    if a["col"] == b["col"]:
        gx = ax - GX / 2
        return [(ax, acy), (gx, acy), (gx, bcy), (bx, bcy)], gx, (acy + bcy) / 2 + 3.5, "middle"
    right = bx > ax
    x1 = ar if right else ax
    gx = (ar + GX / 2) if right else (ax - GX / 2)
    if a["row"] == b["row"]:
        y2 = by - GY / 2
        return ([(x1, acy), (gx, acy), (gx, y2), (bcx, y2), (bcx, by)],
                gx, (acy + y2) / 2 + 3.5, "middle")
    return ([(x1, acy), (gx, acy), (gx, bcy), ((bx if right else br), bcy)],
            gx, (acy + bcy) / 2 + 3.5, "middle")


def svg(sp):
    nodes, edges = sp["nodes"], sp["edges"]
    N = {n["id"]: n for n in nodes}
    cols = max(n["col"] for n in nodes) + 1
    rows = max(n["row"] for n in nodes) + 1
    W = PAD * 2 + (cols - 1) * CW + BW
    Hh = PAD * 2 + (rows - 1) * CH + BH
    cnt = {}
    for e in edges:
        k = "|".join(sorted([e["from"], e["to"]]))
        cnt[k] = cnt.get(k, 0) + 1
    nth, lines, marks = {}, [], []
    for e in edges:
        a, b = N[e["from"]], N[e["to"]]
        k = "|".join(sorted([e["from"], e["to"]]))
        nth[k] = nth.get(k, 0) + 1
        off = 0 if cnt[k] < 2 else (-7 if nth[k] == 1 else 7)
        pts, lx, ly, an = route(nodes, a, b, off)
        d = " ".join(("M" if i == 0 else "L") + " %g %g" % p for i, p in enumerate(pts))
        lines.append('      <path d="%s" fill="none" stroke="%s" stroke-width="1.5"%s marker-end="url(#flAr)"/>'
                     % (d, MUTED, ' stroke-dasharray="5 4"' if e.get("dashed") else ""))
        if e.get("label"):
            marks.append((lx, ly, an, e["label"], e.get("hot")))
    o = ['    <div class="scroll">',
         '    <svg viewBox="0 0 %d %d" role="img" style="width:100%%;min-width:%dpx;height:auto" aria-label="%s">'
         % (W, Hh, min(W, 780), H.escape(sp.get("aria", "台の状態遷移の図"))),
         '      <defs><marker id="flAr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" '
         'orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="%s"/></marker></defs>' % MUTED]
    o += lines
    for n in nodes:
        x, y, r, b2 = box(n)
        c = TONE.get(n.get("tone"), TONE["blue"])
        o.append('      <g><rect x="%g" y="%g" width="%d" height="%d" rx="6" fill="#fff" stroke="%s" stroke-width="1.6"/>'
                 '<rect x="%g" y="%g" width="5" height="%d" rx="2" fill="%s"/>' % (x, y, BW, BH, c, x, y, BH, c))
        o.append('      <text x="%g" y="%g" style="font-size:11.5px;fill:%s;font-weight:700">%s</text>'
                 % (x + 13, y + 20, INK, H.escape(n["name"])))
        for i, (f, col, sz) in enumerate([("meta", c, 10), ("body", MUTED, 10), ("body2", MUTED, 10)]):
            if n.get(f):
                o.append('      <text x="%g" y="%g" style="font-size:%gpx;fill:%s%s">%s</text>'
                         % (x + 13, y + [37, 54, 68][i], sz, col,
                            ";font-weight:700" if f == "meta" else "", H.escape(n[f])))
        o.append("      </g>")
    for lx, ly, an, label, hot in marks:
        w = wid(label)
        rx = lx - w if an == "end" else (lx if an == "start" else lx - w / 2)
        o.append('      <g><rect x="%g" y="%g" width="%g" height="14" rx="3" fill="#fff"/>'
                 '<text x="%g" y="%g" text-anchor="%s" style="font-size:10px;fill:%s;font-weight:700">%s</text></g>'
                 % (rx - 3, ly - 11, w + 6, lx, ly, an, TONE["brand"] if hot else MUTED, H.escape(label)))
    o += ["    </svg>", "    </div>"]
    if sp.get("caption"):
        o.append('    <p class="cap">%s</p>' % rich(sp["caption"]))
    return "\n".join(o)


def main():
    did = sys.argv[1] if len(sys.argv) > 1 else "sao2"
    d = json.loads(io.open(J, encoding="utf-8").read())
    D = next(x for x in d["dossiers"] if x["id"] == did)
    sp = next(s["spec"] for s in D["sections"] if s.get("t") == "fig" and s.get("v") == "flowData")
    body = svg(sp)
    p = sys.argv[2] if len(sys.argv) > 2 else ART.get(did)
    if not p:
        sys.stdout.write(body + "\n")
        return
    t = io.open(p, encoding="utf-8").read()
    s_mark, e_mark = "<!-- gen:flow -->", "<!-- /gen:flow -->"
    block = "%s\n%s\n%s\n" % (s_mark, body, e_mark)
    if s_mark in t:
        a = t.index(s_mark)
        b = t.index(e_mark) + len(e_mark) + 1
        t = t[:a] + block + t[b:]
        print("再生成: gen:flow")
    else:
        raise SystemExit("<!-- gen:flow --> が無い。図の差し替え位置を先に用意すること")
    io.open(p, "w", encoding="utf-8").write(t)
    bad = [g for g in ("div", "table", "section", "p", "ul", "li", "svg", "g", "text")
           if len(re.findall(r"<%s[\s>]" % g, t)) != t.count("</%s>" % g)]
    print("タグ整合:", "OK" if not bad else "不一致 %s" % bad)


if __name__ == "__main__":
    main()
