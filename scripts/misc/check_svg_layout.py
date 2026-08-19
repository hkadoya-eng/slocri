# -*- coding: utf-8 -*-
"""SVG図のレイアウト自動チェック。
   ① ボックス内のテキストが枠から出ていないか（幅の見積もり）
   ② テキストが viewBox の外に出ていないか
   ③ 近すぎるラベル同士（重なりの候補）
   文字幅の見積もり: 全角=1.0em / 半角=0.55em
使い方: python svg_layout_check.py <ファイル>...   （.jsx と .html の両方に対応）"""
import re, sys, io

def w_of(text, size):
    n = 0.0
    for ch in text:
        n += 0.55 if ord(ch) < 0x2000 else 1.0
    return n * size


def check_jsx(path):
    s = io.open(path, encoding="utf-8").read()
    ng = []
    # <Box x={..} y={..} w={..} h={..} title="..." ... lines={[...]}
    for m in re.finditer(r'<Box x=\{(\d+)\} y=\{(\d+)\} w=\{(\d+)\} h=\{(\d+)\} title="([^"]+)"([^>]*?)/>', s, re.S):
        x, y, w, h, title, rest = int(m[1]), int(m[2]), int(m[3]), int(m[4]), m[5], m[6]
        tw = w_of(title, 12.5)
        if tw > w - 16:
            ng.append("Box「%s」タイトル幅%.0f > 枠%d-16" % (title[:20], tw, w))
        lm = re.search(r'lines=\{\[(.*?)\]\}', rest, re.S)
        lines = re.findall(r'"([^"]*)"', lm.group(1)) if lm else []
        for l in lines:
            lw = w_of(l, 10.5)
            if lw > w - 14:
                ng.append("Box「%s」本文『%s』幅%.0f > 枠%d-14" % (title[:12], l[:24], lw, w))
        need = 19 + 14 * len(lines) + 8
        if need > h:
            ng.append("Box「%s」本文%d行に必要な高さ%d > 枠%d" % (title[:12], len(lines), need, h))
    return ng


def check_svg_text(path):
    s = io.open(path, encoding="utf-8").read()
    ng = []
    for sm in re.finditer(r'<svg[^>]*viewBox="([-\d.\s]+)"(.*?)</svg>', s, re.S):
        vb = [float(v) for v in sm.group(1).split()]
        if len(vb) != 4:
            continue
        x0, y0, W, H = vb
        body = sm.group(2)
        for tm in re.finditer(r'<text x=[{"]?([-\d.]+)[}"]? y=[{"]?([-\d.]+)[}"]?([^>]*)>(.*?)</text>', body, re.S):
            x, y, attrs, inner = float(tm[1]), float(tm[2]), tm[3], re.sub(r"<[^>]+>", "", tm[4])
            inner = re.sub(r"\s+", " ", inner).strip()
            if not inner:
                continue
            size = 11.0
            fs = re.search(r"fontSize: ([\d.]+)|font-size:\s*([\d.]+)", attrs)
            if fs:
                size = float(fs.group(1) or fs.group(2))
            wd = w_of(inner, size)
            anchor = "start"
            if 'textAnchor="middle"' in attrs or 'text-anchor="middle"' in attrs:
                anchor = "middle"
            elif 'textAnchor="end"' in attrs or 'text-anchor="end"' in attrs:
                anchor = "end"
            right = x + wd if anchor == "start" else (x + wd / 2 if anchor == "middle" else x)
            left = x if anchor == "start" else (x - wd / 2 if anchor == "middle" else x - wd)
            if right > x0 + W + 2:
                ng.append("『%s』が右にはみ出し(右端%.0f > %.0f)" % (inner[:26], right, x0 + W))
            if left < x0 - 2:
                ng.append("『%s』が左にはみ出し(左端%.0f < %.0f)" % (inner[:26], left, x0))
            if y > y0 + H - 4:
                ng.append("『%s』が下にはみ出し(y=%.0f > %.0f)" % (inner[:26], y, y0 + H - 4))
    return ng


if __name__ == "__main__":
    bad = 0
    for p in sys.argv[1:]:
        ng = (check_jsx(p) if p.endswith(".jsx") else []) + check_svg_text(p)
        print("■", p.split("\\")[-1], "→", "問題なし" if not ng else "%d件" % len(ng))
        for x in ng:
            print("   ⚠", x)
        bad += len(ng)
    sys.exit(1 if bad else 0)
