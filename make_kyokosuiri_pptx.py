"""
L虚構推理 機種分析資料  （ディライト（D-LIGHT）・2026年4月6日導入）
出力: proposals/機種分析/虚構推理/kyokosuiri_analysis.pptx
テーマ: 深紺 × ミステリー紫 × シアン（エピソード突破型CZ×ARROW告知）
"""
import io, os, sys
from PIL import Image as PILImage, ImageDraw
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

OUT_PATH = os.path.join(os.path.dirname(__file__),
           "proposals", "機種分析", "虚構推理", "kyokosuiri_analysis.pptx")
os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)

# ── カラーパレット（深紺×ミステリー紫×シアン）───────────────────────────────
C_BG    = RGBColor(0x04, 0x04, 0x18)   # 深紺
C_CARD  = RGBColor(0x08, 0x08, 0x24)
C_CARD2 = RGBColor(0x10, 0x10, 0x2C)
C_ROW   = RGBColor(0x0C, 0x0C, 0x28)
C_PUR   = RGBColor(0x66, 0x22, 0xAA)   # ミステリー紫
C_PUR2  = RGBColor(0x99, 0x44, 0xFF)   # 明るい紫
C_CYAN  = RGBColor(0x22, 0xAA, 0xCC)   # シアン（ARROW告知色）
C_CYAN2 = RGBColor(0x44, 0xDD, 0xFF)
C_RED   = RGBColor(0xCC, 0x11, 0x11)   # 赤（確定告知）
C_CRIM  = RGBColor(0xFF, 0x33, 0x33)
C_GOLD  = RGBColor(0xC8, 0xA8, 0x40)
C_GREEN = RGBColor(0x22, 0xCC, 0x66)
C_WHITE = RGBColor(0xE8, 0xE8, 0xF4)
C_CREAM = RGBColor(0xD0, 0xC0, 0xA0)
C_GRAY  = RGBColor(0x88, 0x88, 0xAA)
C_LTGRY = RGBColor(0x44, 0x44, 0x66)

FONT_H = "游明朝"
FONT_B = "メイリオ"
SLIDE_W = Inches(10)
SLIDE_H = Inches(5.625)


def make_bg(w=1280, h=720):
    img = PILImage.new("RGB", (w, h), (4, 4, 24))
    draw = ImageDraw.Draw(img)
    # 斜めライン
    for i in range(0, w + h, 80):
        draw.line([(i, 0), (0, i)], fill=(8, 8, 32), width=1)
    # 下部の紫グロー
    for y in range(h - 80, h):
        t = (y - (h - 80)) / 80
        draw.line([(0, y), (w, y)], fill=(int(10 * t), 0, int(20 * t)))
    # 上部薄暗化
    for y in range(0, 40):
        t = (40 - y) / 40 * 0.5
        draw.line([(0, y), (w, y)], fill=(0, 0, int(8 * t)))
    buf = io.BytesIO()
    img.save(buf, "PNG")
    buf.seek(0)
    return buf


def new_slide(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    bg = make_bg()
    pic = s.shapes.add_picture(bg, 0, 0, SLIDE_W, SLIDE_H)
    s.shapes._spTree.remove(pic._element)
    s.shapes._spTree.insert(2, pic._element)
    return s


def tb(slide, x, y, w, h, text, size=10, bold=False, color=None,
       align=PP_ALIGN.LEFT, font=None, wrap=True):
    tf = slide.shapes.add_textbox(x, y, w, h).text_frame
    tf.word_wrap = wrap
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color or C_WHITE
    run.font.name = font or FONT_B


def rect(slide, x, y, w, h, color):
    shp = slide.shapes.add_shape(1, x, y, w, h)
    shp.fill.solid()
    shp.fill.fore_color.rgb = color
    shp.line.fill.background()
    return shp


def rect_b(slide, x, y, w, h, fill, border, bw=1.0):
    shp = slide.shapes.add_shape(1, x, y, w, h)
    shp.fill.solid()
    shp.fill.fore_color.rgb = fill
    shp.line.color.rgb = border
    shp.line.width = Pt(bw)
    return shp


def hdr(slide, title_text, pg=""):
    rect(slide, 0, 0, SLIDE_W, Inches(0.58), C_CARD)
    rect(slide, 0, 0, Emu(45000), Inches(0.58), C_PUR)
    tb(slide, Inches(0.15), Emu(28000), Inches(8.5), Emu(410000),
       title_text, 14, bold=True, color=C_CYAN, font=FONT_H)
    if pg:
        tb(slide, Inches(8.8), Emu(45000), Inches(1.0), Emu(340000),
           pg, 8, color=C_GRAY, align=PP_ALIGN.RIGHT)
    rect(slide, 0, Inches(0.58), SLIDE_W, Emu(7000), C_PUR)


def note(slide):
    tb(slide, Inches(8.2), Inches(5.38), Inches(1.7), Emu(180000),
       "※ネット解析情報より", 7, color=C_GRAY, align=PP_ALIGN.RIGHT)


def arrow_r(slide, x, cy, col=None):
    shp = slide.shapes.add_shape(13, x, cy - Emu(90000), Emu(200000), Emu(180000))
    shp.fill.solid()
    shp.fill.fore_color.rgb = col or C_PUR
    shp.line.fill.background()


# ══════════════════════════════════════════════════════════════
#  SLIDE 1: タイトル
# ══════════════════════════════════════════════════════════════
def s_title(prs):
    s = new_slide(prs)

    # 左パネル
    rect(s, 0, 0, Inches(5.4), SLIDE_H, RGBColor(0x02, 0x02, 0x10))
    rect(s, 0, 0, Emu(55000), SLIDE_H, C_PUR)
    rect(s, Inches(5.4), 0, Emu(8000), SLIDE_H, RGBColor(0x44, 0x11, 0x77))

    tb(s, Inches(0.22), Inches(0.52), Inches(5.0), Emu(330000),
       "機種分析資料", 12, color=C_GOLD, font=FONT_H)
    tb(s, Inches(0.22), Inches(1.02), Inches(5.1), Emu(900000),
       "L虚構推理", 36, bold=True, color=C_PUR2, font=FONT_H)
    tb(s, Inches(0.22), Inches(2.9), Inches(5.0), Emu(330000),
       "── エピソード突破型CZ × ARROW告知の独自ゲーム性", 11, color=C_CREAM, font=FONT_H)

    tb(s, Inches(0.22), Inches(3.5), Inches(4.9), Emu(230000),
       "メーカー：ディライト（D-LIGHT）　　導入：2026年4月6日", 9, color=C_GRAY)
    tb(s, Inches(0.22), Inches(3.82), Inches(4.9), Emu(230000),
       "設定：1〜6段階　　天井：虚構真偽間1000G（リセット後700G）", 9, color=C_GRAY)
    tb(s, Inches(0.22), Inches(4.14), Inches(4.9), Emu(230000),
       "CZ：鋼人七瀬攻略議会（6G / 初回7G）", 9, color=C_GRAY)

    # 右：3つのキーワード
    kws = [
        (C_PUR,   "エピソード突破CZ",  "5エピソード制\n失敗は次回CZへキャリーオーバー"),
        (C_CYAN,  "ARROW告知",         "最終G判定結果を色で告知\n白→赤→紫の興奮演出"),
        (C_GREEN, "虚構連モード",       "Short/Middle/Long 3種\n高確率ボーナス抽選ループ"),
    ]
    for i, (ac, kw, desc) in enumerate(kws):
        y0 = Inches(0.7 + i * 1.55)
        rect_b(s, Inches(5.65), y0, Inches(4.1), Inches(1.25), C_CARD, ac, 2.0)
        rect(s, Inches(5.65), y0, Emu(60000), Inches(1.25), ac)
        tb(s, Inches(5.85), y0 + Emu(55000), Inches(3.8), Emu(320000),
           kw, 13, bold=True, color=ac, font=FONT_H)
        tb(s, Inches(5.85), y0 + Emu(370000), Inches(3.8), Emu(420000),
           desc, 8.5, color=C_WHITE)

    note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 2: スペック
# ══════════════════════════════════════════════════════════════
def s_spec(prs):
    s = new_slide(prs)
    hdr(s, "スペック ── 基本数値", "2/7")

    bx, by = Inches(0.3), Inches(0.78)
    cols_w = [Emu(520000), Emu(1020000), Emu(980000), Emu(1280000)]
    col_labels = ["設定", "機械割", "CZ突入", "特記"]
    rows = [
        ("1", "—",       "—",  ""),
        ("2", "—",       "—",  ""),
        ("3", "—",       "—",  ""),
        ("4", "—",       "—",  ""),
        ("5", "—",       "—",  ""),
        ("6", "約111%",  "—",  "設定6 機械割約111%"),
    ]
    row_h = Emu(370000)
    hdr_h = Emu(360000)

    rect(s, bx, by, sum(cols_w), hdr_h, RGBColor(0x44, 0x11, 0x77))
    rx = bx
    for cw, label in zip(cols_w, col_labels):
        tb(s, rx + Emu(30000), by + Emu(45000), cw - Emu(50000), hdr_h - Emu(55000),
           label, 8.5, bold=True, color=C_CYAN, align=PP_ALIGN.CENTER, wrap=False)
        rx += cw

    for i, row in enumerate(rows):
        ry = by + hdr_h + i * row_h
        bg = C_CARD if i % 2 == 0 else C_ROW
        rect(s, bx, ry, sum(cols_w), row_h, bg)
        rx = bx
        hi = row[0] == "6"
        for j, (cw, val) in enumerate(zip(cols_w, row)):
            col = C_PUR2 if j == 0 and hi else (C_GOLD if j == 1 and hi else C_WHITE)
            bold = j == 0 or (j == 1 and hi)
            tb(s, rx + Emu(30000), ry + Emu(50000), cw - Emu(50000), row_h - Emu(65000),
               val, 8.5, bold=bold, color=col, align=PP_ALIGN.CENTER, wrap=False)
            rx += cw

    # 右：KVカード
    rx2, ry2 = Inches(4.6), Inches(0.78)
    kv = [
        ("CZ",               "鋼人七瀬攻略議会（6G、初回7G）",              C_PUR),
        ("CZエピソード",     "5エピソード制（失敗=キャリーオーバー）",       C_PUR2),
        ("天井",             "虚構真偽間1000G（リセット後700G）",            C_CYAN),
        ("虚構連モード",     "Short/Middle/Long 3種",                        C_GREEN),
        ("ARROW告知",        "最終G判定結果を色告知",                         C_CYAN2),
        ("特記",             "設定変更後CZ初成功時 約50%高確スタート",        C_GOLD),
    ]
    for i, (key, val, ac) in enumerate(kv):
        ry3 = ry2 + i * Emu(530000)
        rect_b(s, rx2, ry3, Inches(5.1), Emu(485000), C_CARD, ac, 1.2)
        rect(s, rx2, ry3, Emu(40000), Emu(485000), ac)
        tb(s, rx2 + Emu(70000), ry3 + Emu(40000), Inches(2.5), Emu(210000),
           key, 8, bold=True, color=ac)
        tb(s, rx2 + Emu(70000), ry3 + Emu(250000), Inches(4.6), Emu(210000),
           val, 9, color=C_WHITE)

    note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 3: ゲームフロー
# ══════════════════════════════════════════════════════════════
def s_flow(prs):
    s = new_slide(prs)
    hdr(s, "ゲームフロー ── 通常時 → CZ → ボーナス → 虚構連モード", "3/7")

    # 上段：通常時の特徴
    rect(s, Inches(0.3), Inches(0.72), Inches(9.4), Emu(280000), C_CARD2)
    tb(s, Inches(0.45), Inches(0.74), Inches(2.0), Emu(250000),
       "通常時 ── 3つの特徴", 8.5, bold=True, color=C_CYAN)
    modes = [
        ("エピソード進行", "通常時に話が\n進んでいく"),
        ("虚構真偽",       "高確率ゾーン\n（CZ頻発）"),
        ("規定G数",        "モード管理で\n天井短縮"),
    ]
    mw = Inches(9.4) / 3
    for i, (mt, md) in enumerate(modes):
        mx = Inches(0.3) + i * mw
        bc = C_CYAN if i == 1 else (C_PUR if i == 0 else C_GOLD)
        rect_b(s, mx + Emu(30000), Inches(1.04), mw - Emu(50000), Emu(700000),
               C_CARD, bc, 1.2)
        tb(s, mx + Emu(60000), Inches(1.07), mw - Emu(90000), Emu(270000),
           mt, 8.5, bold=True, color=bc,
           align=PP_ALIGN.CENTER, wrap=False)
        tb(s, mx + Emu(60000), Inches(1.35), mw - Emu(90000), Emu(330000),
           md, 7.5, color=C_GRAY, align=PP_ALIGN.CENTER)

    # 下段フロー4ボックス
    boxes = [
        (C_LTGRY, C_WHITE,  "通常時",
         "エピソードが進行\n規定G数でCZ突入"),
        (C_PUR,   C_PUR2,   "CZ「鋼人七瀬攻略議会」",
         "6G/初回7G\n5エピソード突破型\nARROW告知で結果判定"),
        (C_CARD2, C_PUR2,   "ボーナス",
         "スペシャルボーナス等\n各種ボーナス"),
        (RGBColor(0x04, 0x14, 0x0C), C_GREEN, "虚構連モード",
         "Short/Middle/Long\n高確率ボーナス抽選\nループ継続"),
    ]
    bw, bh = Inches(1.8), Inches(1.4)
    gap = Inches(0.28)
    total = 4 * bw + 3 * gap
    sx = (Inches(10) - total) / 2
    cy = Inches(3.85)

    for i, (fill, bc, lbl, sub) in enumerate(boxes):
        bx0 = sx + i * (bw + gap)
        rect_b(s, bx0, cy - bh / 2, bw, bh, fill, bc, 1.8)
        tb(s, bx0 + Emu(40000), cy - bh / 2 + Emu(80000),
           bw - Emu(80000), Emu(380000), lbl, 9.5, bold=True,
           color=bc, align=PP_ALIGN.CENTER, font=FONT_H)
        tb(s, bx0 + Emu(30000), cy - bh / 2 + Emu(450000),
           bw - Emu(60000), Emu(380000), sub, 7.5,
           color=C_GRAY, align=PP_ALIGN.CENTER)
        if i < 3:
            arrow_r(s, bx0 + bw + Emu(10000), cy, col=C_PUR)

    note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 4: CZ × ARROW告知の核心
# ══════════════════════════════════════════════════════════════
def s_cz(prs):
    s = new_slide(prs)
    hdr(s, "CZ構成 ── エピソード突破 × ARROW告知の独自設計", "4/7")

    # 左上
    lx, ly = Inches(0.28), Inches(0.72)
    lw = Inches(4.5)
    qh = Emu(2080000)

    rect_b(s, lx, ly, lw, qh, C_CARD, C_PUR, 1.5)
    rect(s, lx, ly, Emu(45000), qh, C_PUR)
    tb(s, lx + Emu(75000), ly + Emu(45000), lw - Emu(100000), Emu(260000),
       "CZ「鋼人七瀬攻略議会」の仕組み", 9.5, bold=True, color=C_PUR, font=FONT_H)
    tb(s, lx + Emu(75000), ly + Emu(300000), lw - Emu(100000), qh - Emu(360000),
       "6G消化（初回7G）のショートCZ\n\n"
       "エピソード突破型: 5エピソードの壁を越えることでCZ成功\n\n"
       "失敗したエピソードは次回CZに持越し（キャリーオーバー）\n\n"
       "つまり「諦めなければ必ずいつか成功する」設計",
       8, color=C_WHITE)

    # 左下
    ly2 = ly + qh + Emu(60000)
    qh2 = Emu(2050000)
    rect_b(s, lx, ly2, lw, qh2, C_CARD, C_PUR2, 1.5)
    rect(s, lx, ly2, Emu(45000), qh2, C_PUR2)
    tb(s, lx + Emu(75000), ly2 + Emu(45000), lw - Emu(100000), Emu(260000),
       "キャリーオーバー設計の価値", 9.5, bold=True, color=C_PUR2, font=FONT_H)
    tb(s, lx + Emu(75000), ly2 + Emu(300000), lw - Emu(100000), qh2 - Emu(360000),
       "エピソード失敗が「無駄」にならない設計\n\n"
       "前回の失敗がストックされ次回の成功可能性を高める\n\n"
       "「あと1エピソード」という粘る動機を生む\n\n"
       "通常のCZ失敗と違い「前進感」を演出できる",
       8, color=C_WHITE)

    # 右上
    rx, ry = Inches(5.0), Inches(0.72)
    rw = Inches(4.7)

    rect_b(s, rx, ry, rw, qh, C_CARD, C_CYAN, 1.5)
    rect(s, rx, ry, Emu(45000), qh, C_CYAN)
    tb(s, rx + Emu(75000), ry + Emu(45000), rw - Emu(100000), Emu(260000),
       "ARROW告知の演出設計", 9.5, bold=True, color=C_CYAN, font=FONT_H)
    tb(s, rx + Emu(75000), ry + Emu(300000), rw - Emu(100000), qh - Emu(360000),
       "筐体上部に搭載された専用の告知デバイス\n\n"
       "最終G（判定ゲーム）にARROWの色が変わる\n\n"
       "色の段階: 白→青→黄→緑→赤→紫点滅→赤点滅\n\n"
       "赤・紫点滅はほぼ確定告知レベルの高期待度",
       8, color=C_WHITE)

    # 右下
    ry2 = ry + qh + Emu(60000)
    rect_b(s, rx, ry2, rw, qh2, C_CARD, C_CYAN2, 1.5)
    rect(s, rx, ry2, Emu(45000), qh2, C_CYAN2)
    tb(s, rx + Emu(75000), ry2 + Emu(45000), rw - Emu(100000), Emu(260000),
       "ARROWが生む緊張の瞬間", 9.5, bold=True, color=C_CYAN2, font=FONT_H)
    tb(s, rx + Emu(75000), ry2 + Emu(300000), rw - Emu(100000), qh2 - Emu(360000),
       "通常の画面演出だけでなく「外部デバイス」が告知する設計\n\n"
       "視野の端でARROWの色を確認しながら打つ体験\n\n"
       "最終Gにすべての情報が集約される「1点集中の緊張感」\n\n"
       "「ARROWが赤く光った瞬間に声が出た」という体験報告が続く",
       8, color=C_WHITE)

    note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 5: ゲーム体験の核心
# ══════════════════════════════════════════════════════════════
def s_experience(prs):
    s = new_slide(prs)
    hdr(s, "ゲーム体験の核心 ── 推理する・待つ・告知される3段の緊張設計", "5/7")

    # 上段5ステップフロー
    bw = Inches(1.60)
    gap = Inches(0.36)
    bh = Emu(1380000)
    sx0 = Inches(0.20)
    flow_y = Inches(0.72)
    cy = flow_y + bh // 2

    steps = [
        (C_CARD2,                          C_PUR,   "CZ突入",
         "鋼人七瀬攻略議会\n6Gの推理が始まる"),
        (RGBColor(0x0C, 0x08, 0x24),       C_PUR2,  "エピソード進行",
         "突破するたびに\n物語が進む快感"),
        (RGBColor(0x04, 0x08, 0x1C),       C_CYAN,  "最終G判定",
         "ARROWに視線が集まる\n「何色が光るか」"),
        (RGBColor(0x18, 0x04, 0x04),       C_RED,   "赤以上告知！",
         "確定告知の瞬間\n世界が変わる体感"),
        (RGBColor(0x04, 0x14, 0x0C),       C_GREEN, "虚構連モード",
         "Short/Middle/Long\n高確率ループで積み上げ"),
    ]
    for i, (fill, ac, title, desc) in enumerate(steps):
        bx = sx0 + i * (bw + gap)
        rect_b(s, bx, flow_y, bw, bh, fill, ac, 1.5)
        tb(s, bx + Emu(40000), flow_y + Emu(60000), bw - Emu(60000), Emu(380000),
           title, 9.5, bold=True, color=ac, align=PP_ALIGN.CENTER, font=FONT_H)
        tb(s, bx + Emu(35000), flow_y + Emu(460000), bw - Emu(55000), Emu(820000),
           desc, 8, color=C_WHITE, align=PP_ALIGN.CENTER)
        if i < 4:
            arrow_r(s, bx + bw + Emu(80000), cy, col=C_PUR)

    # 下段左
    lx = Inches(0.28)
    ly = flow_y + bh + Emu(120000)
    lw = Inches(4.5)
    lh = Emu(2650000)

    rect_b(s, lx, ly, lw, lh, C_CARD, C_PUR, 1.5)
    rect(s, lx, ly, Emu(45000), lh, C_PUR)
    tb(s, lx + Emu(75000), ly + Emu(45000), lw - Emu(100000), Emu(260000),
       "失敗が「前進」になる設計", 11, bold=True, color=C_PUR, font=FONT_H)
    tb(s, lx + Emu(75000), ly + Emu(300000), lw - Emu(100000), lh - Emu(360000),
       "一般的なCZは失敗すると「無」に戻る。\n\n"
       "虚構推理のエピソードキャリーオーバーは\n"
       "失敗しても「エピソード進行」が残る。\n\n"
       "この設計が:\n"
       "① 「諦めなくていい」という心理的安堵感を生む\n"
       "② 次回CZへの動機（「あと○エピソード」）を与える\n"
       "③ 長期投資を「前進感」で正当化できる\n\n"
       "失敗を「ロス」ではなく「積み上げ」に変換する\n"
       "心理設計として非常に優れている。",
       8, color=C_WHITE)

    # 下段右
    rx = Inches(5.0)
    rw = Inches(4.7)

    rect_b(s, rx, ly, rw, lh, C_CARD, C_CYAN, 1.5)
    rect(s, rx, ly, Emu(45000), lh, C_CYAN)
    tb(s, rx + Emu(75000), ly + Emu(45000), rw - Emu(100000), Emu(260000),
       "ARROWという独自体験の価値", 11, bold=True, color=C_CYAN, font=FONT_H)
    tb(s, rx + Emu(75000), ly + Emu(300000), rw - Emu(100000), lh - Emu(360000),
       "ARROWは「筐体が告知する」という\n"
       "視覚的・空間的な演出装置。\n\n"
       "通常の画面演出と違い:\n"
       "① 「視野の端」で色変化を察知する体験\n"
       "② 「外部デバイス」が反応する非日常感\n"
       "③ 周囲の人にも見えるため「話題になる」効果\n\n"
       "ARROWが赤く光ったことを\n"
       "隣の人と共有できる設計は\n"
       "ホールでの会話・コミュニティを生む。",
       8, color=C_WHITE)

    note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 6: 評価の二極化 + 設定判別
# ══════════════════════════════════════════════════════════════
def s_evaluation(prs):
    s = new_slide(prs)
    hdr(s, "評価の二極化 ── 独自ゲーム性への評価と設定判別", "6/7")

    bx, by = Inches(0.28), Inches(0.72)
    bw_full = Inches(9.44)

    # 上段：評価の現実（横長ボックス）
    rect_b(s, bx, by, bw_full, Emu(900000), C_CARD, C_RED, 1.5)
    rect(s, bx, by, Emu(45000), Emu(900000), C_RED)
    tb(s, bx + Emu(75000), by + Emu(45000), bw_full - Emu(100000), Emu(260000),
       "評価の現実", 9.5, bold=True, color=C_CRIM, font=FONT_H)
    tb(s, bx + Emu(75000), by + Emu(300000), bw_full - Emu(100000), Emu(550000),
       "DMMレビュー平均1.4点（134件）という低評価が示す課題: "
       "強チェリーを引いてもCZに入らない、CZ中の演出が弱い、"
       "虚構連モードへの到達が渋い、という声が多数。"
       "ただし高設定での9400枚一撃事例も確認されており、"
       "スペック上の爆発力は本物。",
       8.5, color=C_WHITE)

    # 下段3列
    cols_x = [Inches(0.28), Inches(3.48), Inches(6.68)]
    cols_w = [Inches(3.0), Inches(3.0), Inches(3.0)]
    col_data = [
        (C_PUR,   "ボーナス直撃率",
         "設定差あり・高設定ほど直撃当選確率が高い・CZを経由しない当選を記録"),
        (C_CYAN,  "CZ成功率",
         "高設定ほどCZ成功（エピソード突破）が早い・5エピソード到達G数を記録"),
        (C_GREEN, "虚構連モード",
         "モード種別（Short/Middle/Long）の発生比率に設定差・Long率が高い台は高設定の可能性"),
    ]

    top_y = by + Emu(900000) + Emu(80000)
    row_h = Emu(3000000)
    for ci, (col_x, col_w, (col_col, col_hdr, col_body)) in enumerate(
            zip(cols_x, cols_w, col_data)):
        rect_b(s, col_x, top_y, col_w - Inches(0.12), row_h, C_CARD, col_col, 1.5)
        rect(s, col_x, top_y, Emu(45000), row_h, col_col)
        tb(s, col_x + Emu(75000), top_y + Emu(50000), col_w - Inches(0.2), Emu(270000),
           col_hdr, 9.5, bold=True, color=col_col, font=FONT_H)
        tb(s, col_x + Emu(75000), top_y + Emu(330000), col_w - Inches(0.2), row_h - Emu(390000),
           col_body, 8.5, color=C_WHITE)

    note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 7: まとめ
# ══════════════════════════════════════════════════════════════
def s_matome(prs):
    s = new_slide(prs)
    hdr(s, "まとめ ── 独自設計から学べること", "7/7")

    bx, by = Inches(0.28), Inches(0.72)
    bw3 = Inches(4.5)

    rect(s, bx, by, bw3, Emu(300000), RGBColor(0x44, 0x11, 0x77))
    tb(s, bx + Emu(60000), by + Emu(50000), bw3 - Emu(80000), Emu(230000),
       "独自設計から学べる3要素", 11, bold=True, color=C_CYAN, font=FONT_H)

    elems = [
        (C_PUR,   "① エピソードキャリーオーバーという設計的発明",
         "失敗を「無」にせず「前進」に変える設計は\n"
         "プレイヤーの継続動機として機能する。\n"
         "長期投資を正当化できる仕組みとして革新的。"),
        (C_CYAN,  "② ARROWという外部告知デバイスの価値",
         "画面外に告知デバイスを持たせることで\n"
         "「別次元の体験」を生む独自アイデア。\n"
         "ホールでの話題性・コミュニティ形成に貢献。"),
        (C_GREEN, "③ 虚構連モードの「種別」が長期稼働を支える",
         "Short/Middle/Longという分かりやすい\n"
         "上位状態の可視化が「今どのモードか」を\n"
         "プレイヤーに意識させ来店継続に繋がる。"),
    ]
    for i, (ac, t, b) in enumerate(elems):
        ey = by + Emu(300000) + i * Emu(1270000)
        rect_b(s, bx, ey, bw3, Emu(1200000), C_CARD, ac, 1.5)
        rect(s, bx, ey, Emu(45000), Emu(1200000), ac)
        tb(s, bx + Emu(75000), ey + Emu(50000), bw3 - Emu(95000), Emu(260000),
           t, 9, bold=True, color=ac)
        tb(s, bx + Emu(75000), ey + Emu(305000), bw3 - Emu(95000), Emu(800000),
           b, 8, color=C_WHITE)

    rx, ry = Inches(5.0), Inches(0.72)
    rw = Inches(4.7)

    rect(s, rx, ry, rw, Emu(280000), C_CARD2)
    tb(s, rx + Emu(50000), ry + Emu(45000), rw - Emu(70000), Emu(210000),
       "設計原則", 11, bold=True, color=C_CYAN, font=FONT_H)

    principles = [
        (C_PUR,   "失敗キャリーオーバーで「前進感」を生む設計は他機種にない独自価値"),
        (C_CYAN,  "外部デバイスARROWが非日常体験と話題性を同時に生む"),
        (C_PUR2,  "エピソード突破という推理×物語の融合が知的楽しさを加える"),
        (C_CRIM,  "到達可能性の改善がより多くのプレイヤーに高評価をもたらす鍵"),
    ]
    for i, (ac, p) in enumerate(principles):
        py0 = ry + Emu(280000) + i * Emu(540000)
        rect(s, rx, py0, Emu(20000), Emu(490000), ac)
        tb(s, rx + Emu(50000), py0 + Emu(75000), rw - Emu(60000), Emu(380000),
           p, 8.5, bold=(i == 3), color=C_CRIM if i == 3 else C_WHITE)

    rect_b(s, rx, ry + Emu(2450000), rw, Emu(800000),
           RGBColor(0x06, 0x04, 0x1C), C_PUR, 1.5)
    tb(s, rx + Emu(55000), ry + Emu(2500000), rw - Emu(75000), Emu(260000),
       "総括", 9, bold=True, color=C_PUR2)
    tb(s, rx + Emu(55000), ry + Emu(2760000), rw - Emu(75000), Emu(430000),
       "独自の設計思想を持つ意欲作。\n"
       "到達性の改善次第で化ける可能性を持つ唯一無二の台。",
       8, color=C_WHITE)

    note(s)


# ══════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════
def main():
    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H

    s_title(prs)
    s_spec(prs)
    s_flow(prs)
    s_cz(prs)
    s_experience(prs)
    s_evaluation(prs)
    s_matome(prs)

    prs.save(OUT_PATH)
    print(f"Saved: {OUT_PATH}")


if __name__ == "__main__":
    main()
