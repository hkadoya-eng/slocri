"""
スマスロ 北斗の拳 機種分析資料  （サミー・2023年4月導入）
出力: proposals/機種分析/北斗の拳/hokuto_analysis.pptx
テーマ: 暗黒紺 × 血赤 × 金（北斗世界観）
"""
import io, os, sys
from PIL import Image as PILImage, ImageDraw
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

OUT_PATH = os.path.join(os.path.dirname(__file__),
           "proposals", "機種分析", "北斗の拳", "hokuto_analysis.pptx")
os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)

# ── カラーパレット（暗黒紺×血赤×金）───────────────────────────────
C_BG    = RGBColor(0x05, 0x08, 0x18)   # 暗黒紺
C_CARD  = RGBColor(0x0C, 0x12, 0x28)   # カード背景
C_CARD2 = RGBColor(0x14, 0x1C, 0x38)   # やや明るいカード
C_ROW   = RGBColor(0x10, 0x16, 0x30)   # テーブル偶数行
C_RED   = RGBColor(0xBB, 0x11, 0x11)   # 血赤
C_RED2  = RGBColor(0x88, 0x00, 0x00)   # 濃赤
C_CRIM  = RGBColor(0xFF, 0x33, 0x33)   # 明るい赤（強調）
C_GOLD  = RGBColor(0xC8, 0xA8, 0x40)   # 金
C_GOLD2 = RGBColor(0xFF, 0xD7, 0x00)   # 明るい金
C_WHITE = RGBColor(0xE8, 0xE8, 0xF4)   # 本文白
C_CREAM = RGBColor(0xD0, 0xC0, 0xA0)   # クリーム
C_GRAY  = RGBColor(0x88, 0x88, 0xAA)   # グレー
C_LTGRY = RGBColor(0x44, 0x44, 0x66)   # 薄グレー（ダーク版）
C_GREEN = RGBColor(0x22, 0xCC, 0x66)
C_BLUE  = RGBColor(0x22, 0x77, 0xFF)
C_TEAL  = RGBColor(0x22, 0xAA, 0x99)

FONT_H = "游明朝"
FONT_B = "メイリオ"
SLIDE_W = Inches(10)
SLIDE_H = Inches(5.625)


def make_bg(w=1280, h=720):
    img = PILImage.new("RGB", (w, h), (5, 8, 24))
    draw = ImageDraw.Draw(img)
    # 斜めライン（荒野の傷）
    for i in range(0, w + h, 80):
        draw.line([(i, 0), (0, i)], fill=(8, 12, 30), width=1)
    # 下部の赤グロー
    for y in range(h - 80, h):
        t = (y - (h - 80)) / 80
        draw.line([(0, y), (w, y)], fill=(int(20 * t), 0, 0))
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
    rect(slide, 0, 0, Emu(45000), Inches(0.58), C_RED)
    tb(slide, Inches(0.15), Emu(28000), Inches(8.5), Emu(410000),
       title_text, 14, bold=True, color=C_GOLD, font=FONT_H)
    if pg:
        tb(slide, Inches(8.8), Emu(45000), Inches(1.0), Emu(340000),
           pg, 8, color=C_GRAY, align=PP_ALIGN.RIGHT)
    rect(slide, 0, Inches(0.58), SLIDE_W, Emu(7000), C_RED)


def note(slide):
    tb(slide, Inches(8.2), Inches(5.38), Inches(1.7), Emu(180000),
       "※ネット解析情報より", 7, color=C_GRAY, align=PP_ALIGN.RIGHT)


def arrow_r(slide, x, cy, col=None):
    shp = slide.shapes.add_shape(13, x, cy - Emu(90000), Emu(200000), Emu(180000))
    shp.fill.solid()
    shp.fill.fore_color.rgb = col or C_RED
    shp.line.fill.background()


# ══════════════════════════════════════════════════════════════
#  SLIDE 1: タイトル
# ══════════════════════════════════════════════════════════════
def s_title(prs):
    s = new_slide(prs)

    # 左パネル
    rect(s, 0, 0, Inches(5.4), SLIDE_H, RGBColor(0x02, 0x05, 0x14))
    rect(s, 0, 0, Emu(55000), SLIDE_H, C_RED)
    rect(s, Inches(5.4), 0, Emu(8000), SLIDE_H, C_RED2)

    tb(s, Inches(0.22), Inches(0.52), Inches(5.0), Emu(330000),
       "機種分析資料", 12, color=C_GOLD, font=FONT_H)
    tb(s, Inches(0.22), Inches(1.02), Inches(5.1), Emu(900000),
       "スマスロ\n北斗の拳", 36, bold=True, color=C_CRIM, font=FONT_H)
    tb(s, Inches(0.22), Inches(2.9), Inches(5.0), Emu(330000),
       "── 4号機世代が帰還した伝説のIP", 11, color=C_CREAM, font=FONT_H)

    tb(s, Inches(0.22), Inches(3.5), Inches(4.9), Emu(230000),
       "メーカー：サミー　　導入：2023年4月3日", 9, color=C_GRAY)
    tb(s, Inches(0.22), Inches(3.82), Inches(4.9), Emu(230000),
       "設定：1〜6段階　　機械割：設定1 98.0% ／ 設定6 113.0%", 9, color=C_GRAY)
    tb(s, Inches(0.22), Inches(4.14), Inches(4.9), Emu(230000),
       "天井：最大 1,268G　　BB継続率：66〜89%（無想転生バトル 94%）", 9, color=C_GRAY)
    tb(s, Inches(0.22), Inches(4.46), Inches(4.9), Emu(230000),
       "設置：5,634店　89週連続 稼働ランキング3位（2024年時点）", 9, color=C_GRAY)

    # 右：3つのキーワード
    kws = [
        (C_RED,   "バトルボーナス",  "4号機の世界観を継承した\nBB型ATシステム"),
        (C_GOLD,  "無想転生バトル",  "BB最上位・継続率94%\n平均 2,500枚以上"),
        (C_TEAL,  "IP × 世代回帰",  "30〜40代の休眠層が\nスマスロで戻ってきた"),
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
    col_labels = ["設定", "機械割", "BB初当り", "特記"]
    rows = [
        ("1", "98.0%",  "1/383",  ""),
        ("2", "99.0%",  "1/360",  ""),
        ("3", "102.0%", "1/330",  ""),
        ("4", "105.5%", "1/300",  "設定4以上でプラス"),
        ("5", "109.0%", "1/265",  ""),
        ("6", "113.0%", "1/235",  "設定6 実戦勝率 94.2%"),
    ]
    row_h = Emu(370000)
    hdr_h = Emu(360000)

    rect(s, bx, by, sum(cols_w), hdr_h, C_RED2)
    rx = bx
    for cw, label in zip(cols_w, col_labels):
        tb(s, rx + Emu(30000), by + Emu(45000), cw - Emu(50000), hdr_h - Emu(55000),
           label, 8.5, bold=True, color=C_GOLD, align=PP_ALIGN.CENTER, wrap=False)
        rx += cw

    for i, row in enumerate(rows):
        ry = by + hdr_h + i * row_h
        bg = C_CARD if i % 2 == 0 else C_ROW
        rect(s, bx, ry, sum(cols_w), row_h, bg)
        rx = bx
        hi = row[0] in ("4", "5", "6")
        for j, (cw, val) in enumerate(zip(cols_w, row)):
            col = C_CRIM if j == 0 and hi else (C_GOLD if j == 1 and hi else C_WHITE)
            bold = j == 0 or (j == 1 and hi)
            tb(s, rx + Emu(30000), ry + Emu(50000), cw - Emu(50000), row_h - Emu(65000),
               val, 8.5, bold=bold, color=col, align=PP_ALIGN.CENTER, wrap=False)
            rx += cw

    # 右：天井・スペック
    rx2, ry2 = Inches(4.6), Inches(0.78)
    kv = [
        ("天井（通常時）",    "最大 1,268G + α → BB確定", C_RED),
        ("777G通過",         "北斗揃い高確率・短縮の目安",  C_GOLD),
        ("天井（リセット後）", "800G + α に短縮",           C_TEAL),
        ("1セット純増",      "約 110枚 / BB",               C_WHITE),
        ("BBバトルパート",   "8G（+復活あり）",              C_GRAY),
        ("小役パート",       "30G + α",                    C_GRAY),
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
    hdr(s, "ゲームフロー ── 4モード → BB → 無想転生バトル", "3/7")

    # 上段：通常時4モード
    rect(s, Inches(0.3), Inches(0.72), Inches(9.4), Emu(280000), C_CARD2)
    tb(s, Inches(0.45), Inches(0.74), Inches(2.0), Emu(250000),
       "通常時 ── 4つのモード", 8.5, bold=True, color=C_GOLD)
    modes = [
        ("地獄モード", "BB当選が重い\n最も厳しい"),
        ("通常モード", "スイカでモード\nアップを目指す"),
        ("天国モード", "スイカで前兆→\nBBほぼ確定"),
        ("前兆モード", "最大32G以内に\nBB確定"),
    ]
    mw = Inches(9.4) / 4
    for i, (mt, md) in enumerate(modes):
        mx = Inches(0.3) + i * mw
        bc = C_RED if i == 3 else (C_GOLD if i == 2 else C_LTGRY)
        rect_b(s, mx + Emu(30000), Inches(1.04), mw - Emu(50000), Emu(700000),
               C_CARD, bc, 1.2)
        tb(s, mx + Emu(60000), Inches(1.07), mw - Emu(90000), Emu(270000),
           mt, 8.5, bold=True, color=bc if i >= 2 else C_WHITE,
           align=PP_ALIGN.CENTER, wrap=False)
        tb(s, mx + Emu(60000), Inches(1.35), mw - Emu(90000), Emu(330000),
           md, 7.5, color=C_GRAY, align=PP_ALIGN.CENTER)

    # 下段：BB → 無想転生フロー（ボックス4つ）
    boxes = [
        (C_RED2,  C_CRIM,  "バトルボーナス\n(BB)",        "小役パート30G\n→バトルパート8G"),
        (C_CARD2, C_GOLD,  "継続率\n抽選",               "66/79/84/89%\nの4段階"),
        (C_CARD2, C_TEAL,  "Vストック\n（宿命バトル）",  "次セット継続確定\nレイ/トキ協力あり"),
        (RGBColor(0x1A,0x06,0x06), C_CRIM,
                            "無想転生バトル",             "94%継続\n期待2,500枚以上"),
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

    # 無想転生バトルへの確率
    tb(s, sx + 3 * (bw + gap), cy + bh / 2 + Emu(30000),
       bw, Emu(220000),
       "※無想転生チャンス(15G)から約33%", 7, color=C_GRAY, align=PP_ALIGN.CENTER)

    note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 4: バトルボーナス構成（核心スライド）
# ══════════════════════════════════════════════════════════════
def s_bb(prs):
    s = new_slide(prs)
    hdr(s, "バトルボーナス構成 ── 2パート × 4段継続率 × Vストック", "4/7")

    # ─── 左上：2パート構成 ───────────────────────
    lx, ly = Inches(0.28), Inches(0.72)
    lw = Inches(4.5)

    rect(s, lx, ly, lw, Emu(280000), C_RED2)
    tb(s, lx + Emu(50000), ly + Emu(45000), lw - Emu(70000), Emu(210000),
       "BB の2パート構成（1セット ≈ 110枚）", 9, bold=True, color=C_GOLD)

    parts = [
        (C_TEAL, "小役パート",  "30G + α",
         "レア役でVストックや継続率アップを抽選。\n宿命バトル勝利でVストック獲得。"),
        (C_RED,  "バトルパート", "8G（復活あり）",
         "ケンシロウがラオウと戦う。\n消化中のレア役→継続への書き換え抽選。\n"
         "8G目レア役→ユリア復活確定（継続率84%以上が確定）。\n敗北後も復活演出あり。"),
    ]
    for i, (ac, t, dur, body) in enumerate(parts):
        py = ly + Emu(280000) + i * Emu(1100000)
        rect_b(s, lx, py, lw, Emu(1040000), C_CARD, ac, 1.5)
        rect(s, lx, py, Emu(45000), Emu(1040000), ac)
        tb(s, lx + Emu(75000), py + Emu(45000), Inches(1.5), Emu(260000),
           t, 10, bold=True, color=ac, font=FONT_H)
        tb(s, lx + Emu(75000) + Inches(1.5), py + Emu(55000), Inches(2.6), Emu(220000),
           dur, 9, color=C_GOLD)
        tb(s, lx + Emu(75000), py + Emu(300000), lw - Emu(110000), Emu(650000),
           body, 8, color=C_WHITE)

    # ─── 右上：継続率4段階 ───────────────────────
    rx, ry = Inches(5.0), Inches(0.72)
    rw = Inches(4.7)

    rect(s, rx, ry, rw, Emu(280000), C_RED2)
    tb(s, rx + Emu(50000), ry + Emu(45000), rw - Emu(70000), Emu(210000),
       "継続率 4段階", 9, bold=True, color=C_GOLD)

    rates = [
        ("66%", "最低継続率。最も脱出されやすい", C_GRAY,  0.66),
        ("79%", "中継続率。2〜3連程度が平均的",   C_WHITE, 0.79),
        ("84%", "高継続率。長連チャンに期待",      C_GOLD,  0.84),
        ("89%", "最高継続率。北斗揃い等で確定",    C_CRIM,  0.89),
    ]
    bar_max_w = rw - Emu(300000)
    for i, (rate, desc, tc, pct) in enumerate(rates):
        iy = ry + Emu(280000) + i * Emu(570000)
        rect(s, rx, iy, rw, Emu(540000), C_CARD if i % 2 == 0 else C_ROW)
        tb(s, rx + Emu(50000), iy + Emu(50000), Emu(450000), Emu(240000),
           rate, 11, bold=True, color=tc)
        # バー
        rect(s, rx + Emu(550000), iy + Emu(130000), bar_max_w, Emu(100000), C_LTGRY)
        rect(s, rx + Emu(550000), iy + Emu(130000), int(bar_max_w * pct), Emu(100000), tc)
        tb(s, rx + Emu(550000), iy + Emu(250000), bar_max_w, Emu(240000),
           desc, 7.5, color=C_GRAY)

    # ─── 下段：Vストックと無想転生バトル ───────────────────────
    by2 = Inches(3.72)
    bw2h = Inches(4.5)
    bw2r = Inches(4.7)

    rect_b(s, lx, by2, bw2h, Emu(1450000), C_CARD, C_TEAL, 1.5)
    rect(s, lx, by2, Emu(45000), Emu(1450000), C_TEAL)
    tb(s, lx + Emu(75000), by2 + Emu(40000), bw2h - Emu(100000), Emu(260000),
       "Vストック", 11, bold=True, color=C_TEAL, font=FONT_H)
    tb(s, lx + Emu(75000), by2 + Emu(290000), bw2h - Emu(100000), Emu(980000),
       "宿命バトル（小役パート中）に勝利すると獲得。\n"
       "Vストックがあれば次セット継続が確定。\n"
       "さらにレイ／トキの協力が約40%で発生し、\n"
       "協力ループ率12.5% ／ 50% ／ 66%で連鎖する。",
       8, color=C_WHITE)

    rect_b(s, rx, by2, bw2r, Emu(1450000),
           RGBColor(0x1A, 0x04, 0x04), C_CRIM, 2.0)
    rect(s, rx, by2, Emu(45000), Emu(1450000), C_CRIM)
    tb(s, rx + Emu(75000), by2 + Emu(40000), bw2r - Emu(100000), Emu(260000),
       "無想転生バトル", 11, bold=True, color=C_CRIM, font=FONT_H)
    tb(s, rx + Emu(75000), by2 + Emu(290000), bw2r - Emu(100000), Emu(980000),
       "無想転生チャンス（15G限定ゾーン）から約33%で突入。\n"
       "継続率94%・期待獲得2,500枚以上。\n"
       "有利区間終了後も84%以上の高継続BBが再セットされ、\n"
       "「終わったと思ったらまだ続く」体験が生まれる。",
       8, color=C_WHITE)

    note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 5: ゲーム体験の核心
# ══════════════════════════════════════════════════════════════
def s_experience(prs):
    s = new_slide(prs)
    hdr(s, "ゲーム体験の核心 ── 緊張・自力感・理不尽が共存する設計", "5/8")

    # ── 上段：5ステップ体験フロー ──────────────────────────
    bw = Inches(1.60)
    gap = Inches(0.36)
    bh = Emu(1380000)
    sx0 = Inches(0.20)
    flow_y = Inches(0.72)
    cy = flow_y + bh // 2

    steps = [
        (C_CARD2,                    C_GOLD,  "BB開始",
         "オーラ色が示される\n継続率が「宣言」\n（白〜虹の6段階）"),
        (RGBColor(0x14, 0x04, 0x04), C_RED,   "小役パート\n（宿命バトル）",
         "レア役を引いて勝利\n→ Vストック獲得\n「自力感の核心」"),
        (RGBColor(0x06, 0x0C, 0x20), C_TEAL,  "バトルパート",
         "ケンシロウが\nラオウと戦う\n勝敗は次の瞬間に"),
        (RGBColor(0x1A, 0x04, 0x04), C_CRIM,  "第3停止を\n離す瞬間",
         "この瞬間に勝敗確定\n「緊張の極点」\n復活演出の可能性も"),
        (RGBColor(0x12, 0x0A, 0x02), C_GOLD2, "継続 or\n無想転生",
         "継続→次セットBB\n約33%で無想転生\nチャンスへ突入"),
    ]
    for i, (fill, ac, title, desc) in enumerate(steps):
        bx = sx0 + i * (bw + gap)
        rect_b(s, bx, flow_y, bw, bh, fill, ac, 1.5)
        tb(s, bx + Emu(40000), flow_y + Emu(60000), bw - Emu(60000), Emu(380000),
           title, 9.5, bold=True, color=ac, align=PP_ALIGN.CENTER, font=FONT_H)
        tb(s, bx + Emu(35000), flow_y + Emu(460000), bw - Emu(55000), Emu(820000),
           desc, 8, color=C_WHITE, align=PP_ALIGN.CENTER)
        if i < 4:
            arrow_r(s, bx + bw + Emu(80000), cy)

    # ── 下段左：自力感の設計 ───────────────────────────────
    lx = Inches(0.28)
    ly = flow_y + bh + Emu(120000)
    lw = Inches(4.5)
    lh = Emu(2650000)

    rect_b(s, lx, ly, lw, lh, C_CARD, C_TEAL, 1.5)
    rect(s, lx, ly, Emu(45000), lh, C_TEAL)
    tb(s, lx + Emu(75000), ly + Emu(45000), lw - Emu(100000), Emu(260000),
       "「自力感」の設計", 11, bold=True, color=C_TEAL, font=FONT_H)
    tb(s, lx + Emu(75000), ly + Emu(300000), lw - Emu(100000), lh - Emu(360000),
       "【宿命バトルの役どころ】\n"
       "リプレイ成立 → チャンス（勝利を期待）\n"
       "レア役成立   → 勝利確定\n"
       "中段チェリー/リーチ目 → アミババトル確定\n\n"
       "継続率はオーラで事前に「宣言」されるが、\n"
       "宿命バトルで自分が役を引くことで\n"
       "「自分が勝った」能動体験が生まれる。\n\n"
       "【バトルパート8G目の特別仕様】\n"
       "8G目にレア役→ユリア復活確定\n"
       "（継続率84%以上が確定する最大の自力演出）",
       8, color=C_WHITE)

    # ── 下段右：理不尽を飲み込ませる設計 ────────────────────
    rx = Inches(5.0)
    rw = Inches(4.7)

    rect_b(s, rx, ly, rw, lh, RGBColor(0x16, 0x04, 0x04), C_CRIM, 1.5)
    rect(s, rx, ly, Emu(45000), lh, C_CRIM)
    tb(s, rx + Emu(75000), ly + Emu(45000), rw - Emu(100000), Emu(260000),
       "「理不尽」を飲み込ませる設計", 11, bold=True, color=C_CRIM, font=FONT_H)
    tb(s, rx + Emu(75000), ly + Emu(300000), rw - Emu(100000), lh - Emu(360000),
       "虹オーラ（89%継続）でも11%は終了する。\n"
       "これは設計的欠陥でなく「北斗の味」。\n\n"
       "なぜ受け入れられるか？\n"
       "① 「北斗あるある」という共有体験になる\n"
       "   → ホールでの会話・コミュニティ形成\n\n"
       "② 理不尽があるから連続継続の喜びが大きい\n"
       "   → リスクと報酬のメリハリが生まれる\n\n"
       "③ 4号機北斗の記憶と接続し\n"
       "   「それが北斗だ」とユーザー自身が\n"
       "   納得するIPの力",
       8, color=C_WHITE)

    note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 6: 有利区間・冷遇問題
# ══════════════════════════════════════════════════════════════
def s_issue(prs):
    s = new_slide(prs)
    hdr(s, "有利区間問題 ── 不透明な差枚管理への不満", "6/8")

    bx, by = Inches(0.28), Inches(0.72)
    bw2 = Inches(4.5)

    issues = [
        (C_RED, "差枚管理の不透明さ",
         "有利区間内で差枚が上限付近（2,000枚前後）になると\n"
         "当選が重くなる「冷遇区間」の存在が語られる。\n"
         "公式は確率を一切公開していない。"),
        (C_LTGRY, "天然終了か冷遇終了か判断できない",
         "有利区間終了の原因が差枚管理なのか\n"
         "単純な不運なのか、ユーザーには区別できない。\n"
         "この不透明さがデキレ・冷遇論争を継続させる。"),
        (C_LTGRY, "無想転生後の「壁」体験",
         "大量獲得後に急に当たらなくなる体験が\n"
         "「冷遇だ」と解釈される。実際の確率変動か\n"
         "運なのかは不明のまま。"),
    ]
    for i, (ac, t, b) in enumerate(issues):
        iy = by + i * Emu(1430000)
        rect_b(s, bx, iy, bw2, Emu(1360000), C_CARD, ac, 1.5)
        rect(s, bx, iy, Emu(45000), Emu(1360000), ac)
        tb(s, bx + Emu(80000), iy + Emu(50000), bw2 - Emu(100000), Emu(260000),
           t, 9, bold=True, color=ac)
        tb(s, bx + Emu(80000), iy + Emu(305000), bw2 - Emu(100000), Emu(950000),
           b, 8, color=C_WHITE)

    rx, ry = Inches(5.0), Inches(0.72)
    rw = Inches(4.7)

    rect(s, rx, ry, rw, Emu(530000), C_RED2)
    tb(s, rx + Emu(60000), ry + Emu(55000), rw - Emu(80000), Emu(240000),
       "なぜ議論が続くのか？", 11, bold=True, color=C_GOLD, font=FONT_H)
    tb(s, rx + Emu(60000), ry + Emu(290000), rw - Emu(80000), Emu(210000),
       "有利区間の「見えない壁」が信頼を侵食する", 8.5, color=C_CREAM)

    pts = [
        (C_WHITE, "スロット台への期待感は「公平性への信頼」が前提"),
        (C_WHITE, "確率非公開 + 差枚管理 = 陰謀論が育つ環境"),
        (C_WHITE, "設定6でも負ける体験が「デキレ」解釈を生む"),
        (C_WHITE, "長期稼働にはなっているが、コアユーザーの不信感は残る"),
        (C_CRIM,  "→ 透明性の欠如は設計上のリスクファクター"),
    ]
    for i, (tc, pt) in enumerate(pts):
        py0 = ry + Emu(530000) + i * Emu(540000)
        rect(s, rx, py0, Emu(18000), Emu(490000), C_RED if i == 4 else C_LTGRY)
        tb(s, rx + Emu(50000), py0 + Emu(80000), rw - Emu(60000), Emu(380000),
           pt, 8.5, bold=(i == 4), color=tc)

    note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 6: 設定判別
# ══════════════════════════════════════════════════════════════
def s_hanbet(prs):
    s = new_slide(prs)
    hdr(s, "設定判別 ── 実戦で使えるポイント", "7/8")

    cols_x = [Inches(0.28), Inches(3.48), Inches(6.68)]
    cols_w = [Inches(3.0), Inches(3.0), Inches(3.0)]
    col_hdrs = ["BB後モード移行", "特定獲得枚数", "BB中の演出示唆"]
    col_colors = [C_RED, C_GOLD, C_TEAL]
    contents = [
        [
            ("天国モード移行率", "BB後に天国モード移行率が\n高設定ほど高い。\n複数BB後の展開速度で判断。"),
            ("地獄モード率", "低設定ほどBB後に地獄モードへ\n落ちやすい。当選が遅い場合は\n低設定の可能性。"),
            ("前兆の発生タイミング", "天国→前兆が頻繁に発生する台は\n高設定の可能性あり。\n通常時のゲーム数に注目。"),
        ],
        [
            ("456枚以上獲得", "BB1回で456枚以上獲得した場合、\n設定4以上が確定。\nBB中の表示枚数に注目。"),
            ("666枚以上獲得", "BB1回で666枚以上獲得した場合、\n設定6が確定。\n最強の設定確定演出。"),
            ("複数回の確認で精度UP", "単発では偶然もあるため、\n複数BB後のデータを積み上げて\n総合的に判断する。"),
        ],
        [
            ("宿命バトル中のレア役", "小役パート中のレア役出現率に\n設定差。高設定ほど\n宿命バトルに勝ちやすい傾向。"),
            ("Vストック獲得率", "Vストック取得頻度が高い台は\n高設定の可能性。\n協力ループ発生率も参考に。"),
            ("無想転生チャンス", "無想転生チャンス成功率に\n設定差あり。設定6ほど\n突入しやすい。"),
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
    hdr(s, "まとめ ── 設計から学べること", "8/8")

    bx, by = Inches(0.28), Inches(0.72)
    bw3 = Inches(4.5)

    rect(s, bx, by, bw3, Emu(300000), C_RED2)
    tb(s, bx + Emu(60000), by + Emu(50000), bw3 - Emu(80000), Emu(230000),
       "長期稼働を支えた3要素", 11, bold=True, color=C_GOLD, font=FONT_H)

    elems = [
        (C_RED,  "① IP力（知名度×ノスタルジア）",
         "4号機「北斗の拳」を原体験とする30〜40代が\n"
         "スマスロ版をきっかけにパチスロを再開。\n"
         "IP単独では成立しない。実機の完成度が前提。"),
        (C_GOLD, "② バトルボーナス × 無想転生バトル",
         "66〜89%の4段継続率＋Vストックで\n"
         "「次も続くかも」を繰り返す設計。\n"
         "無想転生バトル94%が来店目標として機能。"),
        (C_TEAL, "③ 5,634店・89週の安心感",
         "設置台数と稼働期間の長さが\n「まだ打てる台」という消極的安心感を醸成。\n長期稼働自体が来店動機になる循環。"),
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
       "設計原則", 11, bold=True, color=C_GOLD, font=FONT_H)

    principles = [
        (C_RED,   "強IPは「休眠層の呼び水」になる"),
        (C_GOLD,  "BB継続率の4段階が「次への期待感」を精密制御する"),
        (C_TEAL,  "Vストックが「敗北の恐怖」を和らげる緩衝材になる"),
        (C_CRIM,  "透明性の欠如（差枚非公開）は長期的な信頼リスク"),
    ]
    for i, (ac, p) in enumerate(principles):
        py0 = ry + Emu(280000) + i * Emu(540000)
        rect(s, rx, py0, Emu(20000), Emu(490000), ac)
        tb(s, rx + Emu(50000), py0 + Emu(75000), rw - Emu(60000), Emu(380000),
           p, 8.5, bold=(i == 3), color=C_CRIM if i == 3 else C_WHITE)

    rect_b(s, rx, ry + Emu(2450000), rw, Emu(800000),
           RGBColor(0x18, 0x04, 0x04), C_RED, 1.5)
    tb(s, rx + Emu(55000), ry + Emu(2500000), rw - Emu(75000), Emu(260000),
       "総括", 9, bold=True, color=C_RED)
    tb(s, rx + Emu(55000), ry + Emu(2760000), rw - Emu(75000), Emu(430000),
       "IP×BB継続率設計×Vストックの三位一体が奇跡的に揃った事例。\n"
       "ただし差枚管理の不透明さは次世代設計で解決すべき課題。", 8, color=C_WHITE)

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
    s_bb(prs)
    s_experience(prs)
    s_issue(prs)
    s_hanbet(prs)
    s_matome(prs)

    prs.save(OUT_PATH)
    print(f"Saved: {OUT_PATH}")


if __name__ == "__main__":
    main()
