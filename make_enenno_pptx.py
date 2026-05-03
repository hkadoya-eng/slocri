"""
Lパチスロ 炎炎ノ消防隊2 機種分析資料  （SANKYO・2026年導入）
出力: proposals/機種分析/炎炎ノ消防隊2/enenno_analysis.pptx
テーマ: 消防紺 × 炎オレンジ × 白
"""
import io, os, sys
from PIL import Image as PILImage, ImageDraw
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

OUT_PATH = os.path.join(os.path.dirname(__file__),
           "proposals", "機種分析", "炎炎ノ消防隊2", "enenno_analysis.pptx")
os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)

# ── カラーパレット（消防紺×炎オレンジ）──────────────────────────
C_BG    = RGBColor(0x05, 0x09, 0x1E)   # 消防紺
C_CARD  = RGBColor(0x0C, 0x12, 0x2C)
C_CARD2 = RGBColor(0x14, 0x1C, 0x3C)
C_ROW   = RGBColor(0x10, 0x16, 0x32)
C_FIRE  = RGBColor(0xDD, 0x55, 0x00)   # 炎オレンジ
C_FIRE2 = RGBColor(0xFF, 0x88, 0x22)   # 明るい炎
C_FLAME = RGBColor(0xFF, 0xBB, 0x44)   # 炎の先端（金色寄り）
C_BLUE  = RGBColor(0x22, 0x77, 0xFF)   # 消防の青
C_CYAN  = RGBColor(0x22, 0xCC, 0xDD)   # 水色
C_WHITE = RGBColor(0xE8, 0xEC, 0xFF)
C_CREAM = RGBColor(0xF0, 0xD8, 0xB0)
C_GRAY  = RGBColor(0x88, 0x88, 0xAA)
C_LTGRY = RGBColor(0x44, 0x44, 0x66)
C_GREEN = RGBColor(0x22, 0xCC, 0x66)
C_RED   = RGBColor(0xCC, 0x22, 0x22)
C_GOLD  = RGBColor(0xC8, 0xA8, 0x40)

FONT_H = "游明朝"
FONT_B = "メイリオ"
SLIDE_W = Inches(10)
SLIDE_H = Inches(5.625)


def make_bg(w=1280, h=720):
    img = PILImage.new("RGB", (w, h), (5, 9, 30))
    draw = ImageDraw.Draw(img)
    # 斜めライン（炎のゆらぎ）
    for i in range(0, w + h, 90):
        draw.line([(i, 0), (0, i)], fill=(8, 14, 44), width=1)
    # 下部オレンジグロー（炎）
    for y in range(h - 90, h):
        t = (y - (h - 90)) / 90
        draw.line([(0, y), (w, y)], fill=(int(30 * t), int(8 * t), 0))
    # 上部
    for y in range(0, 35):
        t = (35 - y) / 35 * 0.4
        draw.line([(0, y), (w, y)], fill=(0, 0, int(15 * t)))
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
    rect(slide, 0, 0, Emu(45000), Inches(0.58), C_FIRE)
    tb(slide, Inches(0.15), Emu(28000), Inches(8.5), Emu(410000),
       title_text, 14, bold=True, color=C_FLAME, font=FONT_H)
    if pg:
        tb(slide, Inches(8.8), Emu(45000), Inches(1.0), Emu(340000),
           pg, 8, color=C_GRAY, align=PP_ALIGN.RIGHT)
    rect(slide, 0, Inches(0.58), SLIDE_W, Emu(7000), C_FIRE)


def note(slide):
    tb(slide, Inches(8.2), Inches(5.38), Inches(1.7), Emu(180000),
       "※ネット解析情報より", 7, color=C_GRAY, align=PP_ALIGN.RIGHT)


def arrow_r(slide, x, cy, col=None):
    shp = slide.shapes.add_shape(13, x, cy - Emu(90000), Emu(200000), Emu(180000))
    shp.fill.solid()
    shp.fill.fore_color.rgb = col or C_FIRE
    shp.line.fill.background()


# ══════════════════════════════════════════════════════════════
#  SLIDE 1: タイトル
# ══════════════════════════════════════════════════════════════
def s_title(prs):
    s = new_slide(prs)

    rect(s, 0, 0, Inches(5.4), SLIDE_H, RGBColor(0x04, 0x07, 0x1A))
    rect(s, 0, 0, Emu(55000), SLIDE_H, C_FIRE)
    rect(s, Inches(5.4), 0, Emu(8000), SLIDE_H, C_FIRE)

    tb(s, Inches(0.22), Inches(0.52), Inches(5.0), Emu(330000),
       "機種分析資料", 12, color=C_FIRE2, font=FONT_H)
    tb(s, Inches(0.22), Inches(1.02), Inches(5.1), Emu(900000),
       "炎炎ノ消防隊2", 36, bold=True, color=C_FIRE, font=FONT_H)
    tb(s, Inches(0.22), Inches(2.9), Inches(5.0), Emu(330000),
       "── 高純増×二段階天井の現代型AT設計", 11, color=C_CREAM, font=FONT_H)

    tb(s, Inches(0.22), Inches(3.5), Inches(4.9), Emu(230000),
       "メーカー：SANKYO　　導入：2026年", 9, color=C_GRAY)
    tb(s, Inches(0.22), Inches(3.82), Inches(4.9), Emu(230000),
       "設定：1〜6段階　　設定6機械割：114.9%", 9, color=C_GRAY)
    tb(s, Inches(0.22), Inches(4.14), Inches(4.9), Emu(230000),
       "AT純増：約5.8枚/G（業界最高水準）", 9, color=C_GRAY)
    tb(s, Inches(0.22), Inches(4.46), Inches(4.9), Emu(230000),
       "天井：850G（ボーナス間）／2,000G（炎炎激闘間）", 9, color=C_GRAY)

    kws = [
        (C_FIRE,  "炎炎激闘",      "基本AT（1セット15G+α）\nストック型で連チャンを積み上げる"),
        (C_FLAME, "(超)炎炎大戦",  "上位AT・ループ率80〜90%\n期待枚数2,760枚以上"),
        (C_BLUE,  "二段階天井",    "850G+2,000Gの多層設計\n天井狙いの計画が立てやすい"),
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

    bx, by = Inches(0.28), Inches(0.78)
    cols_w = [Emu(480000), Emu(960000), Emu(960000), Emu(1200000)]
    col_labels = ["設定", "機械割", "ボーナス確率", "特記"]
    rows = [
        ("1", "─",      "─",  ""),
        ("2", "─",      "─",  ""),
        ("3", "─",      "─",  ""),
        ("4", "─",      "─",  "設定4以上でプラスと推定"),
        ("5", "─",      "─",  ""),
        ("6", "114.9%", "◎",  "業界最高水準（公式発表）"),
    ]
    row_h = Emu(370000)
    hdr_h = Emu(360000)

    rect(s, bx, by, sum(cols_w), hdr_h, RGBColor(0x99, 0x33, 0x00))
    rx = bx
    for cw, label in zip(cols_w, col_labels):
        tb(s, rx + Emu(30000), by + Emu(45000), cw - Emu(50000), hdr_h - Emu(55000),
           label, 8.5, bold=True, color=C_FLAME, align=PP_ALIGN.CENTER, wrap=False)
        rx += cw

    for i, row in enumerate(rows):
        ry = by + hdr_h + i * row_h
        bg = C_CARD if i % 2 == 0 else C_ROW
        rect(s, bx, ry, sum(cols_w), row_h, bg)
        rx = bx
        hi = row[0] == "6"
        for j, (cw, val) in enumerate(zip(cols_w, row)):
            col = C_FIRE if j == 0 and hi else (C_FLAME if j == 1 and hi else C_WHITE)
            bold = j == 0 or (j == 1 and hi)
            tb(s, rx + Emu(30000), ry + Emu(50000), cw - Emu(50000), row_h - Emu(65000),
               val, 8.5, bold=bold, color=col, align=PP_ALIGN.CENTER, wrap=False)
            rx += cw

    # 右：主要スペック
    rx2, ry2 = Inches(4.6), Inches(0.78)
    kv = [
        ("AT純増速度",          "約5.8枚/G（業界最高水準）",     C_FIRE),
        ("天井①（ボーナス間）",  "最大850G → リセット後650G",     C_FIRE2),
        ("天井②（炎炎激闘間）", "最大2,000G → リセット後1,500G", C_BLUE),
        ("炎炎激闘",            "1セット15G+α（ストック型）",    C_FLAME),
        ("(超)炎炎大戦 ループ率", "約80〜90%",                   C_CYAN),
        ("アドラバースト",       "期待枚数約2,760枚",              C_GOLD),
    ]
    for i, (key, val, ac) in enumerate(kv):
        ry3 = ry2 + i * Emu(530000)
        rect_b(s, rx2, ry3, Inches(5.12), Emu(485000), C_CARD, ac, 1.2)
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
    hdr(s, "ゲームフロー ── ボーナス → 炎炎激闘 → (超)炎炎大戦", "3/7")

    # 上：ボーナス種類
    rect(s, Inches(0.28), Inches(0.72), Inches(9.44), Emu(280000), C_CARD2)
    tb(s, Inches(0.43), Inches(0.74), Inches(3.0), Emu(250000),
       "ボーナス種類（AT契機）", 8.5, bold=True, color=C_FLAME)

    bonuses = [
        ("REGボーナス",   "設定判別に使う\n最重要ボーナス"),
        ("炎炎ブースト",  "継続率90%\nAT高継続"),
        ("アドラバースト", "期待約2,760枚\n最強クラス"),
        ("EX BONUS",     "最大3,000枚\n超レア"),
    ]
    bw_b = Inches(9.44) / 4
    for i, (bt, desc) in enumerate(bonuses):
        bx0 = Inches(0.28) + i * bw_b
        bc = C_FIRE if i == 0 else (C_FLAME if i == 2 else (C_GOLD if i == 3 else C_FIRE2))
        rect_b(s, bx0 + Emu(20000), Inches(1.04), bw_b - Emu(35000), Emu(700000),
               C_CARD, bc, 1.3)
        tb(s, bx0 + Emu(50000), Inches(1.07), bw_b - Emu(70000), Emu(280000),
           bt, 8.5, bold=True, color=bc, align=PP_ALIGN.CENTER, wrap=False)
        tb(s, bx0 + Emu(50000), Inches(1.35), bw_b - Emu(70000), Emu(320000),
           desc, 7.5, color=C_GRAY, align=PP_ALIGN.CENTER)

    # 下：メインフロー（4ボックス）
    boxes = [
        (C_CARD2,                      C_FIRE2, "通常遊技",      "十字目変換で\nボーナス抽選"),
        (RGBColor(0x18, 0x08, 0x02),   C_FIRE,  "ボーナス\n各種",  "REG/炎炎ブースト\n/アドラバースト"),
        (RGBColor(0x10, 0x14, 0x2C),   C_CYAN,  "炎炎激闘\n(基本AT)", "15G+α\nストック型ST"),
        (RGBColor(0x1A, 0x08, 0x02),   C_FLAME, "(超)炎炎大戦\n(上位AT)", "ループ80〜90%\n期待2,760枚以上"),
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
           bw - Emu(80000), Emu(380000), lbl, 10, bold=True,
           color=bc, align=PP_ALIGN.CENTER, font=FONT_H)
        tb(s, bx0 + Emu(30000), cy - bh / 2 + Emu(450000),
           bw - Emu(60000), Emu(280000), sub, 7.5,
           color=C_GRAY, align=PP_ALIGN.CENTER)
        if i < 3:
            arrow_r(s, bx0 + bw + Emu(10000), cy)

    note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 4: AT構成（核心スライド）
# ══════════════════════════════════════════════════════════════
def s_at(prs):
    s = new_slide(prs)
    hdr(s, "AT構成 ── 炎炎激闘 × (超)炎炎大戦 × アドラバースト", "4/7")

    # 左上：炎炎激闘
    lx, ly = Inches(0.28), Inches(0.72)
    lw = Inches(4.5)

    rect(s, lx, ly, lw, Emu(280000), RGBColor(0x99, 0x33, 0x00))
    tb(s, lx + Emu(50000), ly + Emu(45000), lw - Emu(70000), Emu(210000),
       "炎炎激闘（基本AT）", 9, bold=True, color=C_FLAME)

    ats = [
        (C_FIRE,  "炎炎激闘",        "1セット15G+α",
         "【核心：十字目変換フロー】\n"
         "リプレイで小V停止\n"
         "→ PUSHで十字目に変換（炎色で期待度）\n"
         "  白約20% / 青約40% / 赤=確定\n"
         "→ 成功→伝導者決戦（ボーナス抽選）\n"
         "2連続外れ→3回目は必ず変換成功。\n"
         "15G以内未変換→15G再セット。"),
        (C_CYAN,  "(超)炎炎大戦",    "ループ率 80〜90%",
         "炎炎激闘から突入する上位AT。\n継続率80〜90%で大量枚数を狙う。\n「超」炎炎大戦は最高継続率バージョン。"),
    ]
    for i, (ac, t, dur, body) in enumerate(ats):
        py = ly + Emu(280000) + i * Emu(1120000)
        rect_b(s, lx, py, lw, Emu(1060000), C_CARD, ac, 1.5)
        rect(s, lx, py, Emu(45000), Emu(1060000), ac)
        tb(s, lx + Emu(75000), py + Emu(45000), Inches(1.8), Emu(260000),
           t, 10, bold=True, color=ac, font=FONT_H)
        tb(s, lx + Emu(75000) + Inches(1.8), py + Emu(55000), Inches(2.4), Emu(220000),
           dur, 9, color=C_FLAME)
        tb(s, lx + Emu(75000), py + Emu(300000), lw - Emu(110000), Emu(670000),
           body, 8, color=C_WHITE)

    # 右上：特殊ボーナス
    rx, ry = Inches(5.0), Inches(0.72)
    rw = Inches(4.7)

    rect(s, rx, ry, rw, Emu(280000), RGBColor(0x99, 0x33, 0x00))
    tb(s, rx + Emu(50000), ry + Emu(45000), rw - Emu(70000), Emu(210000),
       "特殊ボーナス", 9, bold=True, color=C_FLAME)

    specials = [
        (C_FIRE2, "炎炎ブースト",   "継続率90%",      0.90),
        (C_FLAME, "アドラバースト", "期待約2,760枚",   1.00),
        (C_GOLD,  "EX BONUS",     "最大3,000枚",     1.00),
    ]
    bar_max = rw - Emu(300000)
    for i, (ac, name, val, pct) in enumerate(specials):
        iy = ry + Emu(280000) + i * Emu(590000)
        rect(s, rx, iy, rw, Emu(560000), C_CARD if i % 2 == 0 else C_ROW)
        tb(s, rx + Emu(50000), iy + Emu(45000), Inches(1.7), Emu(260000),
           name, 9, bold=True, color=ac)
        tb(s, rx + Emu(50000) + Inches(1.7), iy + Emu(55000), Inches(2.6), Emu(220000),
           val, 10, bold=True, color=C_FLAME)
        rect(s, rx + Emu(50000), iy + Emu(320000), bar_max, Emu(80000), C_LTGRY)
        rect(s, rx + Emu(50000), iy + Emu(320000), int(bar_max * pct), Emu(80000), ac)

    # 下段：アドラリンク + 設計のポイント
    by2 = Inches(3.73)
    lw2 = Inches(4.5)
    rw2 = Inches(4.7)

    rect_b(s, lx, by2, lw2, Emu(1430000), C_CARD, C_CYAN, 1.5)
    rect(s, lx, by2, Emu(45000), Emu(1430000), C_CYAN)
    tb(s, lx + Emu(75000), by2 + Emu(40000), lw2 - Emu(100000), Emu(260000),
       "アドラリンク", 11, bold=True, color=C_CYAN, font=FONT_H)
    tb(s, lx + Emu(75000), by2 + Emu(290000), lw2 - Emu(100000), Emu(1020000),
       "AT中に自力でボーナスを当選させる仕組み。\n"
       "アドラリンクからアドラバースト等に繋がれば\n"
       "さらなる上乗せが期待できる。\n"
       "運任せでなく「自力継続」の感覚を演出する設計。",
       8, color=C_WHITE)

    rect_b(s, rx, by2, rw2, Emu(1430000),
           RGBColor(0x12, 0x08, 0x02), C_FLAME, 2.0)
    rect(s, rx, by2, Emu(45000), Emu(1430000), C_FLAME)
    tb(s, rx + Emu(75000), by2 + Emu(40000), rw2 - Emu(100000), Emu(260000),
       "5.8枚/Gの出玉設計", 11, bold=True, color=C_FLAME, font=FONT_H)
    tb(s, rx + Emu(75000), by2 + Emu(290000), rw2 - Emu(100000), Emu(1020000),
       "AT中の純増5.8枚/Gは現行機で最高水準。\n"
       "炎炎大戦80〜90%ループ中に出玉が爆発的に積み上がる。\n"
       "1ループ≒1,200枚 × 継続 = 短時間で数千枚を狙える\n"
       "「速く大きく」が最大の来店動機になる。",
       8, color=C_WHITE)

    note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 5: ゲーム体験の核心
# ══════════════════════════════════════════════════════════════
def s_experience(prs):
    s = new_slide(prs)
    hdr(s, "ゲーム体験の核心 ── 自力感×昇格×爆発の3段設計", "5/8")

    # ── 上段：4ステップ体験フロー ──────────────────────────
    bw = Inches(2.10)
    gap = Inches(0.30)
    bh = Emu(1300000)
    sx0 = Inches(0.28)
    flow_y = Inches(0.72)
    cy = flow_y + bh // 2

    steps = [
        (C_CARD2,                    C_FIRE2, "通常遊技",
         "十字目変換・レア役で\n前兆に移行\n規定Gでもボーナスへ"),
        (RGBColor(0x08, 0x12, 0x28), C_CYAN,  "アドラリンク\n（3G自力CZ）",
         "リールロック段数で\n期待度が上昇\n成功率約50%\n「自力で掴む」感覚"),
        (RGBColor(0x18, 0x08, 0x02), C_FIRE,  "炎炎激闘\n（15G+α）",
         "リプレイ小V→十字目変換\n→伝導者決戦がループ\n3回目は変換必ず成功"),
        (RGBColor(0x14, 0x06, 0x00), C_FLAME, "(超)炎炎大戦\n→アドラバースト",
         "ループ率80〜90%\n最上位で約2,760枚\n常に「上」が見える設計"),
    ]
    for i, (fill, ac, title, desc) in enumerate(steps):
        bx = sx0 + i * (bw + gap)
        rect_b(s, bx, flow_y, bw, bh, fill, ac, 1.5)
        tb(s, bx + Emu(50000), flow_y + Emu(60000), bw - Emu(80000), Emu(380000),
           title, 10, bold=True, color=ac, align=PP_ALIGN.CENTER, font=FONT_H)
        tb(s, bx + Emu(40000), flow_y + Emu(450000), bw - Emu(70000), Emu(750000),
           desc, 8, color=C_WHITE, align=PP_ALIGN.CENTER)
        if i < 3:
            arrow_r(s, bx + bw + Emu(50000), cy)

    # ── 下段左：アドラリンクの自力感 ───────────────────────
    lx = Inches(0.28)
    ly = flow_y + bh + Emu(120000)
    lw = Inches(4.5)
    lh = Emu(2720000)

    rect_b(s, lx, ly, lw, lh, C_CARD, C_CYAN, 1.5)
    rect(s, lx, ly, Emu(45000), lh, C_CYAN)
    tb(s, lx + Emu(75000), ly + Emu(45000), lw - Emu(100000), Emu(260000),
       "アドラリンクの「自力感」設計", 11, bold=True, color=C_CYAN, font=FONT_H)
    tb(s, lx + Emu(75000), ly + Emu(300000), lw - Emu(100000), lh - Emu(360000),
       "アドラリンクは通常遊技中に割り込む\n"
       "3GのプチCZ。\n\n"
       "【リールロック段数による演出設計】\n"
       "1段ロック → チャンス\n"
       "2段ロック → 期待度大幅アップ\n"
       "3段ロック → 激アツ（成功率大幅上昇）\n\n"
       "「何段ロックがかかるか」を見守る\n"
       "3Gの緊張感が打感の核心を作る。\n\n"
       "→ ボーナスを「もらう」ではなく\n"
       "  「自分で掴んだ」感覚を生む設計",
       8, color=C_WHITE)

    # ── 下段右：昇格・爆発の多層設計 ────────────────────────
    rx = Inches(5.0)
    rw = Inches(4.7)

    rect_b(s, rx, ly, rw, lh, RGBColor(0x12, 0x08, 0x02), C_FLAME, 1.5)
    rect(s, rx, ly, Emu(45000), lh, C_FLAME)
    tb(s, rx + Emu(75000), ly + Emu(45000), rw - Emu(100000), Emu(260000),
       "昇格・爆発の多層設計", 11, bold=True, color=C_FLAME, font=FONT_H)
    tb(s, rx + Emu(75000), ly + Emu(300000), rw - Emu(100000), lh - Emu(360000),
       "常に「上の状態」が存在することで\n"
       "プレイヤーの目標が途切れない。\n\n"
       "炎炎激闘（15G+α）\n"
       "  ↓ ストック×ボーナスループ80%以上\n"
       "(超)炎炎大戦（ループ率80〜90%）\n"
       "  ↓ 特殊ルートで\n"
       "アドラバースト（期待約2,760枚）\n\n"
       "【ストック型の心理的安心感】\n"
       "1セット15Gで終わっても\n"
       "ストックがあれば「また来る」という\n"
       "安堵感が投資継続につながる。",
       8, color=C_WHITE)

    note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 6: 二段階天井
# ══════════════════════════════════════════════════════════════
def s_ceiling(prs):
    s = new_slide(prs)
    hdr(s, "二段階天井 ── 850G + 2,000Gの多層セーフティ", "6/8")

    bx, by = Inches(0.28), Inches(0.72)
    bw2 = Inches(4.5)

    rect(s, bx, by, bw2, Emu(300000), RGBColor(0x99, 0x33, 0x00))
    tb(s, bx + Emu(60000), by + Emu(50000), bw2 - Emu(80000), Emu(230000),
       "2種類の天井が存在する意義", 11, bold=True, color=C_FLAME, font=FONT_H)

    items = [
        (C_FIRE,  "天井①：ボーナス間 850G",
         "通常遊技でボーナスが850G来ない場合に発動。\n"
         "リセット後は650Gに短縮。\n"
         "日常的に狙える「基本の天井」として機能。"),
        (C_BLUE,  "天井②：炎炎激闘間 2,000G",
         "炎炎激闘（AT）が2,000G来ない場合に発動。\n"
         "リセット後は1,500Gに短縮。\n"
         "長期ハマり時の最終出口として機能。"),
        (C_GREEN, "二段階の相乗効果",
         "第1天井で短期保険、第2天井で長期保険。\n"
         "「次の天井まで」という投資計画が立てやすく\n"
         "プレイヤーのリスク管理を支援する設計。"),
    ]
    for i, (ac, t, b) in enumerate(items):
        iy = by + Emu(300000) + i * Emu(1280000)
        rect_b(s, bx, iy, bw2, Emu(1210000), C_CARD, ac, 1.5)
        rect(s, bx, iy, Emu(45000), Emu(1210000), ac)
        tb(s, bx + Emu(80000), iy + Emu(50000), bw2 - Emu(100000), Emu(260000),
           t, 9, bold=True, color=ac)
        tb(s, bx + Emu(80000), iy + Emu(300000), bw2 - Emu(100000), Emu(800000),
           b, 8, color=C_WHITE)

    rx, ry = Inches(5.0), Inches(0.72)
    rw = Inches(4.7)

    rect(s, rx, ry, rw, Emu(280000), C_CARD2)
    tb(s, rx + Emu(50000), ry + Emu(45000), rw - Emu(70000), Emu(210000),
       "天井狙い：立ち回り別の目安", 11, bold=True, color=C_FLAME, font=FONT_H)

    targets = [
        (C_FIRE,  "天井①狙い",  "550G〜（リセット後 400G〜）",
         "最もシンプルな狙い方。\n期待値が取りやすく台数も多い。"),
        (C_BLUE,  "天井②狙い",  "1,500G〜（リセット後 1,200G〜）",
         "投資が大きいが発動時の出玉も大きい。\n期待収支プラスになりやすい。"),
        (C_CYAN,  "両天井複合", "状況に応じた判断が必要",
         "天井①+②の距離を計算した\n高度な立ち回り。データ確認が必須。"),
    ]
    for i, (ac, t, cond, b) in enumerate(targets):
        py0 = ry + Emu(280000) + i * Emu(1330000)
        rect_b(s, rx, py0, rw, Emu(1270000), C_CARD, ac, 1.2)
        rect(s, rx, py0, Emu(40000), Emu(1270000), ac)
        tb(s, rx + Emu(70000), py0 + Emu(40000), rw - Emu(90000), Emu(240000),
           t, 9, bold=True, color=ac)
        tb(s, rx + Emu(70000), py0 + Emu(270000), rw - Emu(90000), Emu(220000),
           cond, 8, color=C_GRAY)
        tb(s, rx + Emu(70000), py0 + Emu(490000), rw - Emu(90000), Emu(650000),
           b, 8, color=C_WHITE)

    note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 6: 設定判別
# ══════════════════════════════════════════════════════════════
def s_hanbet(prs):
    s = new_slide(prs)
    hdr(s, "設定判別 ── REGボーナスのキャラシナリオが最重要", "7/8")

    # 最重要：キャラシナリオ
    tx, ty = Inches(0.28), Inches(0.72)
    tw = Inches(9.44)

    rect(s, tx, ty, tw, Emu(310000), C_FIRE)
    tb(s, tx + Emu(50000), ty + Emu(50000), tw - Emu(70000), Emu(240000),
       "REGボーナス中 ── キャラ紹介シナリオによる設定示唆（最重要）", 10, bold=True, color=C_BG)

    chara = [
        (C_FIRE2, "黒野",          "設定4以上\n確定"),
        (C_GOLD,  "ジョーカー",    "設定5以上\n確定"),
        (C_FLAME, "シンラ\n（死ノ圧）", "設定6\n確定"),
    ]
    cw = Inches(9.44) / 3
    for i, (ac, name, effect) in enumerate(chara):
        cx0 = tx + i * cw
        rect_b(s, cx0 + Emu(20000), ty + Emu(310000),
               cw - Emu(35000), Emu(800000), C_CARD, ac, 2.0)
        rect(s, cx0 + Emu(20000), ty + Emu(310000), Emu(45000), Emu(800000), ac)
        tb(s, cx0 + Emu(90000), ty + Emu(360000), cw - Emu(120000), Emu(330000),
           name, 12, bold=True, color=ac, align=PP_ALIGN.CENTER, font=FONT_H)
        tb(s, cx0 + Emu(90000), ty + Emu(700000), cw - Emu(120000), Emu(340000),
           effect, 10, bold=True, color=C_FLAME, align=PP_ALIGN.CENTER)

    # 下段：その他判別ポイント 3列
    sy = ty + Emu(310000) + Emu(800000) + Emu(60000)
    sw = Inches(9.44) / 3

    other = [
        (C_FIRE,  "炎炎激闘の初当たり率",
         [("最重要の設定差", "炎炎激闘の初当たり率が\n設定によって大きく異なる。"),
          ("長時間実戦で差が出る", "数百G以上の実戦で\n感じられるレベルの差。")]),
        (C_CYAN,  "伝導者の罠 成功率",
         [("成功期待度約40%（全体）", "高設定ほど成功率が高い。\n通過回数を記録して判断。"),
          ("十字目変換率にも差", "ボーナス契機となる\n十字目変換率も高設定優遇。")]),
        (C_BLUE,  "ボーナス終了画面",
         [("各ボーナス後に示唆", "ボーナス終了後の\n画面に設定示唆あり。"),
          ("複数回確認で精度UP", "単発では判断難しいため\n複数回のデータを積む。")]),
    ]
    for ci, (ac, col_hdr, pts) in enumerate(other):
        sx0 = tx + ci * sw
        rect(s, sx0 + Emu(20000), sy, sw - Emu(35000), Emu(330000), ac)
        tb(s, sx0 + Emu(50000), sy + Emu(50000), sw - Emu(80000), Emu(250000),
           col_hdr, 9, bold=True, color=C_BG, align=PP_ALIGN.CENTER, wrap=False)
        for ri, (pt_title, pt_body) in enumerate(pts):
            py0 = sy + Emu(330000) + ri * Emu(1100000)
            bg = C_CARD if ri == 0 else C_ROW
            rect_b(s, sx0 + Emu(20000), py0, sw - Emu(35000), Emu(1060000), bg, ac, 0.5)
            tb(s, sx0 + Emu(55000), py0 + Emu(55000), sw - Emu(90000), Emu(255000),
               pt_title, 8.5, bold=True, color=ac)
            tb(s, sx0 + Emu(55000), py0 + Emu(300000), sw - Emu(90000), Emu(680000),
               pt_body, 8, color=C_WHITE)

    note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 7: まとめ
# ══════════════════════════════════════════════════════════════
def s_matome(prs):
    s = new_slide(prs)
    hdr(s, "まとめ ── 設計から学べること", "8/8")

    bx, by = Inches(0.28), Inches(0.72)
    bw3 = Inches(4.5)

    rect(s, bx, by, bw3, Emu(300000), RGBColor(0x99, 0x33, 0x00))
    tb(s, bx + Emu(60000), by + Emu(50000), bw3 - Emu(80000), Emu(230000),
       "炎炎ノ消防隊2の設計的強み", 11, bold=True, color=C_FLAME, font=FONT_H)

    strengths = [
        (C_FIRE,  "5.8枚/G という圧倒的な出玉体験",
         "短時間で大量獲得できる高純増は\n「勝った実感」を最大化する。\nリピート来店の動機になりやすい。"),
        (C_BLUE,  "二段階天井による投資計画の立てやすさ",
         "850G + 2,000Gのダブルセーフティで\nプレイヤーが「どこまで投資するか」を\n事前計画しやすい安心設計。"),
        (C_CYAN,  "REGボーナスに設定確定演出を集中させた明快さ",
         "黒野→設定4+、ジョーカー→設定5+、\nシンラ(死ノ圧)→設定6確定という\n段階的な確定システムが分かりやすい。"),
    ]
    for i, (ac, t, b) in enumerate(strengths):
        iy = by + Emu(300000) + i * Emu(1280000)
        rect_b(s, bx, iy, bw3, Emu(1210000), C_CARD, ac, 1.5)
        rect(s, bx, iy, Emu(45000), Emu(1210000), ac)
        tb(s, bx + Emu(80000), iy + Emu(50000), bw3 - Emu(100000), Emu(260000),
           t, 8.5, bold=True, color=ac)
        tb(s, bx + Emu(80000), iy + Emu(300000), bw3 - Emu(100000), Emu(800000),
           b, 8, color=C_WHITE)

    rx, ry = Inches(5.0), Inches(0.72)
    rw = Inches(4.7)

    rect(s, rx, ry, rw, Emu(280000), C_CARD2)
    tb(s, rx + Emu(50000), ry + Emu(45000), rw - Emu(70000), Emu(210000),
       "設計原則", 11, bold=True, color=C_FLAME, font=FONT_H)

    principles = [
        (C_FIRE,  "純増5.8枚/Gは「速い出玉体験」を差別化の武器にする"),
        (C_BLUE,  "二段階天井は「投資計画の見える化」につながる"),
        (C_CYAN,  "段階的な設定確定演出は「信頼できる高設定感」を生む"),
        (C_GOLD,  "自力当選（アドラリンク）が「プレイヤーの能動感」を演出"),
    ]
    for i, (ac, p) in enumerate(principles):
        py0 = ry + Emu(280000) + i * Emu(540000)
        rect(s, rx, py0, Emu(20000), Emu(490000), ac)
        tb(s, rx + Emu(50000), py0 + Emu(75000), rw - Emu(60000), Emu(380000),
           p, 8.5, color=C_WHITE)

    rect_b(s, rx, ry + Emu(2450000), rw, Emu(800000),
           RGBColor(0x16, 0x08, 0x02), C_FIRE, 1.5)
    tb(s, rx + Emu(55000), ry + Emu(2500000), rw - Emu(75000), Emu(260000),
       "総括", 9, bold=True, color=C_FIRE)
    tb(s, rx + Emu(55000), ry + Emu(2760000), rw - Emu(75000), Emu(430000),
       "高純増×二段階天井×明快な設定確定演出の三位一体。\n"
       "2026年導入機の中で設計完成度が高い一台。", 8, color=C_WHITE)

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
    s_at(prs)
    s_experience(prs)
    s_ceiling(prs)
    s_hanbet(prs)
    s_matome(prs)

    prs.save(OUT_PATH)
    print(f"Saved: {OUT_PATH}")


if __name__ == "__main__":
    main()
