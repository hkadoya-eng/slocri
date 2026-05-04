"""
スマスロ ヨルムンガンド 機種分析資料  （山佐・2026年3月導入）
出力: proposals/機種分析/ヨルムンガンド/yormungand_analysis.pptx
テーマ: 深緑黒 × ミリタリー（なぜ不評なのかの設計分析）
"""
import io, os, sys
from PIL import Image as PILImage, ImageDraw
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

OUT_PATH = os.path.join(os.path.dirname(__file__),
           "proposals", "機種分析", "ヨルムンガンド", "yormungand_analysis.pptx")
os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)

# ── カラーパレット（深緑×ミリタリー）───────────────────────────────
C_BG    = RGBColor(0x04, 0x10, 0x08)   # 深緑黒
C_CARD  = RGBColor(0x08, 0x18, 0x0C)
C_CARD2 = RGBColor(0x0C, 0x20, 0x10)
C_ROW   = RGBColor(0x0A, 0x1C, 0x0E)
C_GREEN = RGBColor(0x22, 0xAA, 0x44)   # グリーン（メインカラー）
C_GREEN2= RGBColor(0x44, 0xDD, 0x66)   # 明るいグリーン
C_CYAN  = RGBColor(0x22, 0xCC, 0xDD)   # シアン（PO色）
C_YEL   = RGBColor(0xCC, 0xAA, 0x22)   # 黄土（恥の世紀）
C_RED   = RGBColor(0xCC, 0x22, 0x22)   # 赤（不評・問題）
C_CRIM  = RGBColor(0xFF, 0x44, 0x44)
C_GOLD  = RGBColor(0xC8, 0xA8, 0x40)
C_WHITE = RGBColor(0xE8, 0xE8, 0xF4)
C_CREAM = RGBColor(0xD0, 0xC0, 0xA0)
C_GRAY  = RGBColor(0x88, 0x88, 0xAA)
C_LTGRY = RGBColor(0x44, 0x44, 0x66)

FONT_H = "游明朝"
FONT_B = "メイリオ"
SLIDE_W = Inches(10)
SLIDE_H = Inches(5.625)


def make_bg(w=1280, h=720):
    img = PILImage.new("RGB", (w, h), (4, 16, 8))
    draw = ImageDraw.Draw(img)
    # 斜めライン（ミリタリーグリッド）
    for i in range(0, w + h, 80):
        draw.line([(i, 0), (0, i)], fill=(6, 20, 10), width=1)
    # 下部グリーングロー
    for y in range(h - 80, h):
        t = (y - (h - 80)) / 80
        draw.line([(0, y), (w, y)], fill=(0, int(25 * t), int(10 * t)))
    # 上部薄暗化
    for y in range(0, 40):
        t = (40 - y) / 40 * 0.5
        draw.line([(0, y), (w, y)], fill=(0, int(8 * t), 0))
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
    rect(slide, 0, 0, Emu(45000), Inches(0.58), C_GREEN)
    tb(slide, Inches(0.15), Emu(28000), Inches(8.5), Emu(410000),
       title_text, 14, bold=True, color=C_GREEN2, font=FONT_H)
    if pg:
        tb(slide, Inches(8.8), Emu(45000), Inches(1.0), Emu(340000),
           pg, 8, color=C_GRAY, align=PP_ALIGN.RIGHT)
    rect(slide, 0, Inches(0.58), SLIDE_W, Emu(7000), C_GREEN)


def note(slide):
    tb(slide, Inches(8.2), Inches(5.38), Inches(1.7), Emu(180000),
       "※ネット解析情報より", 7, color=C_GRAY, align=PP_ALIGN.RIGHT)


def arrow_r(slide, x, cy, col=None):
    shp = slide.shapes.add_shape(13, x, cy - Emu(90000), Emu(200000), Emu(180000))
    shp.fill.solid()
    shp.fill.fore_color.rgb = col or C_GREEN
    shp.line.fill.background()


# ══════════════════════════════════════════════════════════════
#  SLIDE 1: タイトル
# ══════════════════════════════════════════════════════════════
def s_title(prs):
    s = new_slide(prs)

    # 左パネル
    rect(s, 0, 0, Inches(5.4), SLIDE_H, RGBColor(0x02, 0x08, 0x04))
    rect(s, 0, 0, Emu(55000), SLIDE_H, C_GREEN)
    rect(s, Inches(5.4), 0, Emu(8000), SLIDE_H, RGBColor(0x10, 0x60, 0x20))

    tb(s, Inches(0.22), Inches(0.52), Inches(5.0), Emu(330000),
       "機種分析資料", 12, color=C_GOLD, font=FONT_H)
    tb(s, Inches(0.22), Inches(1.02), Inches(5.1), Emu(900000),
       "スマスロ\nヨルムンガンド", 32, bold=True, color=C_GREEN2, font=FONT_H)
    tb(s, Inches(0.22), Inches(2.9), Inches(5.0), Emu(330000),
       "── 高性能POと低評価の乖離を解剖する", 11, color=C_CREAM, font=FONT_H)

    tb(s, Inches(0.22), Inches(3.5), Inches(4.9), Emu(230000),
       "メーカー：山佐（YAMASA）　　導入：2026年3月", 9, color=C_GRAY)
    tb(s, Inches(0.22), Inches(3.82), Inches(4.9), Emu(230000),
       "設定：1〜6段階　　AT純増：約2.4枚/G（通常AT）", 9, color=C_GRAY)
    tb(s, Inches(0.22), Inches(4.14), Inches(4.9), Emu(230000),
       "PO純増：約5.0枚/G　　PO初期G数：50G", 9, color=C_GRAY)

    # 右：3つのキーワード
    kws = [
        (C_GREEN,  "ヨルムンガンドラッシュ", "基本AT\nストーリーCZ経由で継続"),
        (C_CYAN,   "パーフェクトオーダー(PO)", "純増5.0枚/G\n恥の世紀でループ"),
        (C_RED,    "評価の現実",               "通常時が渋すぎる\n演出単調・デキレ疑惑"),
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
    cols_w = [Emu(520000), Emu(1200000), Emu(1280000)]
    col_labels = ["設定", "機械割", "特記"]
    rows = [
        ("1", "—",      ""),
        ("2", "—",      ""),
        ("3", "—",      ""),
        ("4", "—",      ""),
        ("5", "—",      ""),
        ("6", "約110%", "設定6のみ期待値プラス"),
    ]
    row_h = Emu(370000)
    hdr_h = Emu(360000)

    rect(s, bx, by, sum(cols_w), hdr_h, RGBColor(0x08, 0x40, 0x18))
    rx = bx
    for cw, label in zip(cols_w, col_labels):
        tb(s, rx + Emu(30000), by + Emu(45000), cw - Emu(50000), hdr_h - Emu(55000),
           label, 8.5, bold=True, color=C_GREEN2, align=PP_ALIGN.CENTER, wrap=False)
        rx += cw

    for i, row in enumerate(rows):
        ry = by + hdr_h + i * row_h
        bg = C_CARD if i % 2 == 0 else C_ROW
        rect(s, bx, ry, sum(cols_w), row_h, bg)
        rx = bx
        hi = row[0] == "6"
        for j, (cw, val) in enumerate(zip(cols_w, row)):
            col = C_GREEN2 if j == 0 and hi else (C_CYAN if j == 1 and hi else C_WHITE)
            bold = j == 0 or (j == 1 and hi)
            tb(s, rx + Emu(30000), ry + Emu(50000), cw - Emu(50000), row_h - Emu(65000),
               val, 8.5, bold=bold, color=col, align=PP_ALIGN.CENTER, wrap=False)
            rx += cw

    # 右：KVカード
    rx2, ry2 = Inches(4.3), Inches(0.78)
    kv = [
        ("通常AT純増",     "約2.4枚/G",                      C_GREEN),
        ("通常AT",         "約90G",                           C_GREEN2),
        ("PO純増",         "約5.0枚/G",                       C_CYAN),
        ("PO初期G数",      "50G（消化中ボーナスはBB以上濃厚）", C_CYAN),
        ("ループ",         "「恥の世紀」でPOループ",            C_YEL),
        ("問題点",         "通常AT→PO到達率が低い",            C_RED),
    ]
    for i, (key, val, ac) in enumerate(kv):
        ry3 = ry2 + i * Emu(530000)
        rect_b(s, rx2, ry3, Inches(5.4), Emu(485000), C_CARD, ac, 1.2)
        rect(s, rx2, ry3, Emu(40000), Emu(485000), ac)
        tb(s, rx2 + Emu(70000), ry3 + Emu(40000), Inches(2.5), Emu(210000),
           key, 8, bold=True, color=ac)
        tb(s, rx2 + Emu(70000), ry3 + Emu(250000), Inches(5.0), Emu(210000),
           val, 9, color=C_WHITE)

    note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 3: ゲームフロー
# ══════════════════════════════════════════════════════════════
def s_flow(prs):
    s = new_slide(prs)
    hdr(s, "ゲームフロー ── CZ → AT → PO の構造と問題点", "3/7")

    # 上段：通常時の問題
    rect(s, Inches(0.3), Inches(0.72), Inches(9.4), Emu(280000), C_CARD2)
    tb(s, Inches(0.45), Inches(0.74), Inches(4.0), Emu(250000),
       "通常時の問題", 8.5, bold=True, color=C_RED)

    issues = [
        ("CZ当選率", "「通常時は当たらない」が頻出"),
        ("ストーリーCZ", "「デキレ感が強い」評価"),
        ("天井", "（概算1000G前後）"),
    ]
    iw = Inches(9.4) / 3
    for i, (it, id_) in enumerate(issues):
        ix = Inches(0.3) + i * iw
        bc = C_RED if i < 2 else C_YEL
        rect_b(s, ix + Emu(30000), Inches(1.04), iw - Emu(50000), Emu(700000),
               C_CARD, bc, 1.2)
        tb(s, ix + Emu(60000), Inches(1.07), iw - Emu(90000), Emu(270000),
           it, 8.5, bold=True, color=bc,
           align=PP_ALIGN.CENTER, wrap=False)
        tb(s, ix + Emu(60000), Inches(1.35), iw - Emu(90000), Emu(330000),
           id_, 7.5, color=C_GRAY, align=PP_ALIGN.CENTER)

    # 下段フロー4ボックス
    boxes = [
        (C_LTGRY,                     C_GRAY,   "通常時",
         "CZ当選を待つ\n当たらないで消耗"),
        (C_CARD2,                     C_GREEN,  "CZ",
         "ストーリーCZ\nデキレ疑惑多数"),
        (RGBColor(0x08, 0x20, 0x10),  C_GREEN2, "ヨルムンガンドラッシュ",
         "通常AT\n90G/2.4枚\n上位を目指す"),
        (RGBColor(0x04, 0x18, 0x20),  C_CYAN,   "PO（パーフェクトオーダー）",
         "純増5.0枚\n初期50G\nBB以上確定ループ"),
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
           bw - Emu(80000), Emu(380000), lbl, 9, bold=True,
           color=bc, align=PP_ALIGN.CENTER, font=FONT_H)
        tb(s, bx0 + Emu(30000), cy - bh / 2 + Emu(450000),
           bw - Emu(60000), Emu(280000), sub, 7.5,
           color=C_GRAY, align=PP_ALIGN.CENTER)
        if i < 3:
            arrow_r(s, bx0 + bw + Emu(10000), cy)

    note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 4: 不評の構造分析
# ══════════════════════════════════════════════════════════════
def s_issues(prs):
    s = new_slide(prs)
    hdr(s, "なぜ不評なのか ── 設計課題の3層構造を解剖する", "4/7")

    # 左上：問題①
    lx, ly = Inches(0.28), Inches(0.72)
    hw = Inches(4.5)
    hh = Emu(2070000)

    rect_b(s, lx, ly, hw, hh, C_CARD, C_RED, 1.5)
    rect(s, lx, ly, Emu(45000), hh, C_RED)
    tb(s, lx + Emu(75000), ly + Emu(45000), hw - Emu(100000), Emu(260000),
       "問題①：通常時の渋さ", 10, bold=True, color=C_RED, font=FONT_H)
    tb(s, lx + Emu(75000), ly + Emu(305000), hw - Emu(100000), hh - Emu(360000),
       "・CZ当選率が体感で低い\n"
       "・「昨今のデキレ・冷遇が可愛く見える」という実戦報告\n"
       "・弱い演出がとことん弱く、当選示唆がない\n"
       "・レア役を引いてもCZが入らない体験が続く",
       8.5, color=C_WHITE)

    # 左下：問題②
    ly2 = ly + hh + Emu(100000)
    hh2 = Emu(2020000)

    rect_b(s, lx, ly2, hw, hh2, C_CARD, C_RED, 1.5)
    rect(s, lx, ly2, Emu(45000), hh2, C_RED)
    tb(s, lx + Emu(75000), ly2 + Emu(45000), hw - Emu(100000), Emu(260000),
       "問題②：AT中の有利区間問題", 10, bold=True, color=C_RED, font=FONT_H)
    tb(s, lx + Emu(75000), ly2 + Emu(305000), hw - Emu(100000), hh2 - Emu(360000),
       "・大量獲得後に有利区間上限でエンディング強制\n"
       "・「上位AT中に残り2000枚でエンディングは虚無」という評価\n"
       "・出玉が伸びるほど終わりが近づく矛盾した設計体験",
       8.5, color=C_WHITE)

    # 右上：問題③
    rx = Inches(5.0)
    rw = Inches(4.7)
    ry = Inches(0.72)
    rh = Emu(2070000)

    rect_b(s, rx, ry, rw, rh, C_CARD, C_RED, 1.5)
    rect(s, rx, ry, Emu(45000), rh, C_RED)
    tb(s, rx + Emu(75000), ry + Emu(45000), rw - Emu(100000), Emu(260000),
       "問題③：ストーリーCZのデキレ感", 10, bold=True, color=C_RED, font=FONT_H)
    tb(s, rx + Emu(75000), ry + Emu(305000), rw - Emu(100000), rh - Emu(360000),
       "・ストーリーCZが「シナリオで結果が決まっている」と感じさせる\n"
       "・自力感のない演出進行\n"
       "・「当たる気がしない演出が続く」という消耗体験",
       8.5, color=C_WHITE)

    # 右下：POの性能は高い
    ry2 = ry + rh + Emu(100000)
    rh2 = Emu(2020000)

    rect_b(s, rx, ry2, rw, rh2, RGBColor(0x04, 0x18, 0x20), C_CYAN, 1.5)
    rect(s, rx, ry2, Emu(45000), rh2, C_CYAN)
    tb(s, rx + Emu(75000), ry2 + Emu(45000), rw - Emu(100000), Emu(260000),
       "PO自体の性能は高い", 10, bold=True, color=C_CYAN, font=FONT_H)
    tb(s, rx + Emu(75000), ry2 + Emu(305000), rw - Emu(100000), rh2 - Emu(360000),
       "・POは純増5.0枚/Gで性能は十分\n"
       "・恥の世紀ループで継続率も悪くない\n"
       "・問題は「到達できない」こと\n"
       "・高性能だが誰も見られない「幻のスペック」化",
       8.5, color=C_WHITE)

    note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 5: ゲーム体験の核心
# ══════════════════════════════════════════════════════════════
def s_experience(prs):
    s = new_slide(prs)
    hdr(s, "ゲーム体験のギャップ ── 設計意図と実態の乖離", "5/7")

    # 上段4ステップ（理想と現実）
    bw = Inches(1.80)
    gap = Inches(0.36)
    bh = Emu(1350000)
    sx0 = Inches(0.20)
    flow_y = Inches(0.72)
    cy = flow_y + bh // 2

    steps = [
        (C_CARD2,                       C_GREEN,  "通常時（理想）",
         "CZ演出で盛り上がり\nAT突入への期待が高まる"),
        (C_CARD,                        C_RED,    "通常時（現実）",
         "弱い演出が続く\n当たらずに消耗する"),
        (RGBColor(0x04, 0x18, 0x20),    C_CYAN,   "PO（理想）",
         "純増5枚の爆発感\n恥の世紀でループする快感"),
        (RGBColor(0x18, 0x04, 0x04),    C_RED,    "有利区間上限（現実）",
         "大量獲得中に強制終了\n「もっと続くはずが...」"),
    ]
    for i, (fill, ac, title, desc) in enumerate(steps):
        bx = sx0 + i * (bw + gap)
        rect_b(s, bx, flow_y, bw, bh, fill, ac, 1.5)
        tb(s, bx + Emu(40000), flow_y + Emu(60000), bw - Emu(60000), Emu(380000),
           title, 9.5, bold=True, color=ac, align=PP_ALIGN.CENTER, font=FONT_H)
        tb(s, bx + Emu(35000), flow_y + Emu(460000), bw - Emu(55000), Emu(780000),
           desc, 8, color=C_WHITE, align=PP_ALIGN.CENTER)
        if i < 3:
            arrow_r(s, bx + bw + Emu(80000), cy)

    # 下段左：自力感の欠如という根本問題
    lx = Inches(0.28)
    ly = flow_y + bh + Emu(120000)
    lw = Inches(4.5)
    lh = Emu(2500000)

    rect_b(s, lx, ly, lw, lh, C_CARD, C_GREEN, 1.5)
    rect(s, lx, ly, Emu(45000), lh, C_GREEN)
    tb(s, lx + Emu(75000), ly + Emu(45000), lw - Emu(100000), Emu(260000),
       "自力感の欠如という根本問題", 11, bold=True, color=C_GREEN, font=FONT_H)
    tb(s, lx + Emu(75000), ly + Emu(300000), lw - Emu(100000), lh - Emu(360000),
       "スロットの面白さは「自分が引いた」という\n"
       "能動体験から生まれる。\n\n"
       "ヨルムンガンドはストーリーCZを採用することで\n"
       "「シナリオが決めた当否」という受け身感を強めてしまった。\n\n"
       "プレイヤーが「自分がやった」と感じられる\n"
       "場面が少ないことが根本的な問題。\n\n"
       "モンキーターンVの「チェリーで自力バトル」や\n"
       "炎炎2の「リールロック段数を見守る3G」のような\n"
       "能動的な緊張感が欠けている。",
       8, color=C_WHITE)

    # 下段右：設計の教訓
    rx = Inches(5.0)
    rw = Inches(4.7)

    rect_b(s, rx, ly, rw, lh, C_CARD, C_GOLD, 1.5)
    rect(s, rx, ly, Emu(45000), lh, C_GOLD)
    tb(s, rx + Emu(75000), ly + Emu(45000), rw - Emu(100000), Emu(260000),
       "設計の教訓", 11, bold=True, color=C_GOLD, font=FONT_H)
    tb(s, rx + Emu(75000), ly + Emu(300000), rw - Emu(100000), lh - Emu(360000),
       "ヨルムンガンドが示す教訓:\n\n"
       "① 上位ATの性能だけでは不十分\n"
       "   → 到達できなければ「幻のスペック」\n\n"
       "② 通常時の自力感が打感を決める\n"
       "   → 「当たった感覚」が来店継続を生む\n\n"
       "③ 有利区間管理の透明性\n"
       "   → 「なぜ終わったのか」が分からないと不信感\n\n"
       "④ 演出の強弱設計\n"
       "   → 弱い演出が続くと希望が薄れる",
       8, color=C_WHITE)

    note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 6: 設定判別 + 天井狙い
# ══════════════════════════════════════════════════════════════
def s_hanbet(prs):
    s = new_slide(prs)
    hdr(s, "設定判別 ── REGキャラ示唆と天井狙いの目安", "6/7")

    cols_x = [Inches(0.28), Inches(3.48), Inches(6.68)]
    cols_w = [Inches(3.0), Inches(3.0), Inches(3.0)]
    col_hdrs = ["REGキャラ示唆", "PO到達率", "恥の世紀発生率"]
    col_colors = [C_GREEN, C_CYAN, C_YEL]
    contents = [
        [
            ("キャラ示唆の読み方",
             "REGボーナス中のキャラ登場で設定示唆。\n高キャラほど高設定が確定。\n複数回確認で精度UP。"),
            ("高キャラ出現率",
             "高設定ほど高キャラ出現率が高い傾向。\n1回だけでなく複数REGで\n総合判断する。"),
            ("キャラ示唆の活用",
             "設定判別の主軸。\nデータカウンターと合わせて\n朝一から記録しておく。"),
        ],
        [
            ("AT複数消化での判断",
             "高設定ほどPO到達率が高い傾向。\n複数AT消化後のPO到達回数を\n比較して判断。"),
            ("PO到達率の差",
             "低設定はATをこなしてもPOに\n届かないケースが多い。\n「AT数/PO数」比率を観察。"),
            ("天井狙いの目安",
             "天井概算1000G前後。\nゾーン狙いよりも\n純粋な天井狙いが有効か検討。"),
        ],
        [
            ("ループ頻度の観察",
             "「恥の世紀」の発生頻度に設定差あり。\nPO中の恥の世紀発生回数を\n複数セット観察する。"),
            ("高設定の目安",
             "恥の世紀が複数回発生する台は\n高設定の可能性あり。\n単発では判断しない。"),
            ("複合判断",
             "REGキャラ + PO到達率 +\n恥の世紀発生率の3点で\n総合的に設定を推測する。"),
        ],
    ]

    for ci, (col_x, col_w, col_hdr, col_col, items) in enumerate(
            zip(cols_x, cols_w, col_hdrs, col_colors, contents)):
        rect(s, col_x, Inches(0.72), col_w - Inches(0.12), Emu(360000), col_col)
        tb(s, col_x + Emu(30000), Inches(0.72) + Emu(45000),
           col_w - Inches(0.17), Emu(275000),
           col_hdr, 9.5, bold=True, color=C_BG, align=PP_ALIGN.CENTER, wrap=False)

        for ri, (title, body) in enumerate(items):
            ry0 = Inches(0.72) + Emu(360000) + ri * Emu(1270000)
            bg = C_CARD if ri % 2 == 0 else C_ROW
            rect_b(s, col_x, ry0, col_w - Inches(0.12), Emu(1210000), bg, col_col, 0.5)
            tb(s, col_x + Emu(50000), ry0 + Emu(55000), col_w - Inches(0.2), Emu(255000),
               title, 8.5, bold=True, color=col_col)
            tb(s, col_x + Emu(50000), ry0 + Emu(305000), col_w - Inches(0.2), Emu(780000),
               body, 8, color=C_WHITE)

    note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 7: まとめ
# ══════════════════════════════════════════════════════════════
def s_matome(prs):
    s = new_slide(prs)
    hdr(s, "まとめ ── 不評機種から学べる設計の教訓", "7/7")

    bx, by = Inches(0.28), Inches(0.72)
    bw3 = Inches(4.5)

    # 左：学べること3要素
    rect(s, bx, by, bw3, Emu(300000), RGBColor(0x08, 0x30, 0x14))
    tb(s, bx + Emu(60000), by + Emu(50000), bw3 - Emu(80000), Emu(230000),
       "不評機種から学べること", 11, bold=True, color=C_GREEN2, font=FONT_H)

    elems = [
        (C_RED,  "自力感なき演出は打感を破壊する",
         "ストーリーCZのデキレ感が示すように\n"
         "結果が「決められている」と感じさせる演出は\n"
         "プレイヤーの能動性を奪い打感を著しく低下させる。"),
        (C_CYAN, "高性能ATは「見えないと」意味がない",
         "PO純増5.0枚という高い性能も\n"
         "通常時の渋さで到達できなければ存在しないも同然。\n"
         "性能と到達可能性のバランスが設計の核心。"),
        (C_YEL,  "有利区間の「見えない壁」がユーザーを離れさせる",
         "大量獲得中の強制終了は\n"
         "最大の失望体験を生む。\n"
         "透明性の確保が長期稼働の前提条件。"),
    ]
    for i, (ac, t, b) in enumerate(elems):
        ey = by + Emu(300000) + i * Emu(1270000)
        rect_b(s, bx, ey, bw3, Emu(1200000), C_CARD, ac, 1.5)
        rect(s, bx, ey, Emu(45000), Emu(1200000), ac)
        tb(s, bx + Emu(75000), ey + Emu(50000), bw3 - Emu(95000), Emu(260000),
           t, 9, bold=True, color=ac)
        tb(s, bx + Emu(75000), ey + Emu(305000), bw3 - Emu(95000), Emu(800000),
           b, 8, color=C_WHITE)

    # 右：設計原則 + 総括
    rx, ry = Inches(5.0), Inches(0.72)
    rw = Inches(4.7)

    rect(s, rx, ry, rw, Emu(280000), C_CARD2)
    tb(s, rx + Emu(50000), ry + Emu(45000), rw - Emu(70000), Emu(210000),
       "設計原則", 11, bold=True, color=C_GREEN2, font=FONT_H)

    principles = [
        (C_GREEN,  "通常時の自力感がAT到達への期待感を生む"),
        (C_CYAN,   "高性能ATは到達可能性が担保されて初めて機能する"),
        (C_RED,    "有利区間管理の不透明さは不信感の温床になる"),
        (C_YEL,    "演出の強弱設計が「当たる気がする台」を作る"),
    ]
    for i, (ac, p) in enumerate(principles):
        py0 = ry + Emu(280000) + i * Emu(540000)
        rect(s, rx, py0, Emu(20000), Emu(490000), ac)
        tb(s, rx + Emu(50000), py0 + Emu(75000), rw - Emu(60000), Emu(380000),
           p, 8.5, color=C_WHITE)

    # 総括
    rect_b(s, rx, ry + Emu(2450000), rw, Emu(800000),
           RGBColor(0x04, 0x14, 0x08), C_GREEN, 1.5)
    tb(s, rx + Emu(55000), ry + Emu(2500000), rw - Emu(75000), Emu(260000),
       "総括", 9, bold=True, color=C_GREEN2)
    tb(s, rx + Emu(55000), ry + Emu(2760000), rw - Emu(75000), Emu(430000),
       "ヨルムンガンドは「高性能だが刺さらない台」の典型例。\n"
       "不評の分析が優れた台設計への重要な道標になる。",
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
    s_issues(prs)
    s_experience(prs)
    s_hanbet(prs)
    s_matome(prs)

    prs.save(OUT_PATH)
    print(f"Saved: {OUT_PATH}")


if __name__ == "__main__":
    main()
