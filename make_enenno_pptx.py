"""
Lパチスロ 炎炎ノ消防隊2 機種分析資料
出力: proposals/機種分析/炎炎ノ消防隊2/enenno_analysis.pptx
テーマ: 白基調 × 炎オレンジ × 青
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

# ── カラーパレット（白×炎×青）──────────────────────────────────
C_BG    = RGBColor(0xFC, 0xFC, 0xFF)
C_CARD  = RGBColor(0xEE, 0xF2, 0xF8)
C_CARD2 = RGBColor(0xE2, 0xE8, 0xF4)
C_ROW   = RGBColor(0xF5, 0xF7, 0xFC)
C_FIRE  = RGBColor(0xDD, 0x55, 0x00)   # 炎オレンジ
C_FIRE2 = RGBColor(0xFF, 0x88, 0x11)   # 明るい炎
C_FLAME = RGBColor(0xCC, 0x33, 0x00)   # 濃い炎
C_BLUE  = RGBColor(0x11, 0x44, 0xBB)   # 消防の青
C_BLUE2 = RGBColor(0x22, 0x66, 0xDD)
C_NAVY  = RGBColor(0x0A, 0x14, 0x28)
C_MID   = RGBColor(0x33, 0x33, 0x55)
C_GRAY  = RGBColor(0x66, 0x66, 0x77)
C_LTGRY = RGBColor(0xCC, 0xCC, 0xDD)
C_WHITE = RGBColor(0xFF, 0xFF, 0xFF)
C_GREEN = RGBColor(0x11, 0x88, 0x44)
C_GOLD  = RGBColor(0xB8, 0x96, 0x20)

FONT_H = "游明朝"
FONT_B = "メイリオ"
SLIDE_W = Inches(10)
SLIDE_H = Inches(5.625)


def make_bg(w=1280, h=720):
    img = PILImage.new("RGB", (w, h), (252, 252, 255))
    draw = ImageDraw.Draw(img)
    # 上部炎ライン（グラデ風）
    colors = [(221, 85, 0), (200, 60, 0), (170, 40, 0)]
    for y in range(0, 7):
        c = colors[min(y // 3, 2)]
        draw.line([(0, y), (w, y)], fill=c)
    # 下部薄グラデ
    for y in range(h - 45, h):
        t = (y - (h - 45)) / 45
        c = int(248 - 12 * t)
        draw.line([(0, y), (w, y)], fill=(c, c + 1, c + 3))
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
    run.font.color.rgb = color or C_NAVY
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
    rect(slide, 0, 0, SLIDE_W, Inches(0.58), C_CARD2)
    rect(slide, 0, 0, Emu(45000), Inches(0.58), C_FIRE)
    tb(slide, Inches(0.15), Emu(28000), Inches(8.5), Emu(410000),
       title_text, 14, bold=True, color=C_NAVY, font=FONT_H)
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

    rect(s, 0, 0, Inches(5.4), SLIDE_H, RGBColor(0xFA, 0xF6, 0xF2))
    rect(s, 0, 0, Emu(50000), SLIDE_H, C_FIRE)
    rect(s, Inches(5.4), 0, Emu(8000), SLIDE_H, C_LTGRY)

    tb(s, Inches(0.22), Inches(0.55), Inches(5.0), Emu(350000),
       "機種分析資料", 12, color=C_FIRE2, font=FONT_H)
    tb(s, Inches(0.22), Inches(1.05), Inches(5.0), Emu(900000),
       "炎炎ノ消防隊2", 34, bold=True, color=C_FLAME, font=FONT_H)
    tb(s, Inches(0.22), Inches(2.75), Inches(5.0), Emu(340000),
       "── 高純増×二段階天井の現代型設計", 11, color=C_MID, font=FONT_H)

    tb(s, Inches(0.22), Inches(3.42), Inches(4.9), Emu(240000),
       "メーカー：SANKYO　　設定数：6段階", 9, color=C_GRAY)
    tb(s, Inches(0.22), Inches(3.77), Inches(4.9), Emu(240000),
       "機械割：設定6 114.9%（トップクラス）", 9, color=C_GRAY)
    tb(s, Inches(0.22), Inches(4.12), Inches(4.9), Emu(240000),
       "純増速度：約5.8枚/G（業界最高水準）", 9, color=C_GRAY)
    tb(s, Inches(0.22), Inches(4.47), Inches(4.9), Emu(240000),
       "2026年導入", 9, color=C_GRAY)

    kws = [
        ("5.8枚/G 純増", "業界トップクラスの高速出玉。\n短時間で大量獲得が可能。"),
        ("二段階天井", "850G + 2000Gの二重セーフティ。\n天井狙いの選択肢が広がる。"),
        ("炎炎ループ80%+", "上位AT継続率80%超。\n強い連チャン体験を提供。"),
    ]
    cols = [C_FIRE, C_BLUE, C_GREEN]
    for i, (kw, desc) in enumerate(kws):
        y0 = Inches(0.7 + i * 1.55)
        rect_b(s, Inches(5.65), y0, Inches(4.1), Inches(1.25),
               C_CARD, cols[i], 2.0)
        rect(s, Inches(5.65), y0, Inches(0.08), Inches(1.25), cols[i])
        tb(s, Inches(5.85), y0 + Emu(60000), Inches(3.8), Emu(340000),
           kw, 13, bold=True, color=cols[i], font=FONT_H)
        tb(s, Inches(5.85), y0 + Emu(380000), Inches(3.8), Emu(420000),
           desc, 8.5, color=C_MID)

    note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 2: スペック
# ══════════════════════════════════════════════════════════════
def s_spec(prs):
    s = new_slide(prs)
    hdr(s, "スペック ── 基本数値と天井", "2/7")

    # 設定別テーブル（左）
    bx, by = Inches(0.3), Inches(0.78)
    cols_w = [Emu(500000), Emu(1050000), Emu(1100000), Emu(1100000)]
    col_labels = ["設定", "機械割", "AT初当り", "特記"]
    rows = [
        ("1", "─",      "─",     ""),
        ("2", "─",      "─",     ""),
        ("3", "─",      "─",     ""),
        ("4", "─",      "▲",     ""),
        ("5", "─",      "▲▲",   ""),
        ("6", "114.9%", "◎ TOP", "業界最高水準"),
    ]
    row_h = Emu(370000)
    hdr_h = Emu(370000)

    rect(s, bx, by, sum(cols_w), hdr_h, C_FIRE)
    rx = bx
    for cw, label in zip(cols_w, col_labels):
        tb(s, rx + Emu(30000), by + Emu(50000), cw - Emu(50000), hdr_h - Emu(60000),
           label, 8.5, bold=True, color=C_WHITE, align=PP_ALIGN.CENTER, wrap=False)
        rx += cw

    for i, row in enumerate(rows):
        ry = by + hdr_h + i * row_h
        bg = C_CARD if i % 2 == 0 else C_ROW
        rect(s, bx, ry, sum(cols_w), row_h, bg)
        rx = bx
        hi = (row[0] == "6")
        for j, (cw, val) in enumerate(zip(cols_w, row)):
            col = C_FIRE if j == 0 and hi else (C_FIRE2 if j == 2 and hi else C_NAVY)
            bold = (j == 0 and hi) or (j == 1 and hi)
            tb(s, rx + Emu(30000), ry + Emu(55000), cw - Emu(50000), row_h - Emu(70000),
               val, 8.5, bold=bold, color=col, align=PP_ALIGN.CENTER, wrap=False)
            rx += cw

    # 右：天井・スペック詳細
    rx2, ry2 = Inches(4.2), Inches(0.78)
    kv = [
        ("第1天井（ボーナス間）",  "最大 850G → リセット後 650G", C_FIRE),
        ("第2天井（炎炎ループ間）", "最大 2,000G → リセット後 1,500G", C_BLUE),
        ("純増速度",             "約 5.8枚/G（業界最高水準）", C_FIRE2),
        ("炎炎大戦 継続率",       "80%以上（上位AT）", C_GREEN),
        ("1ループ期待獲得枚数",    "約 1,200枚", C_GOLD),
        ("ベース",               "約 33.1G／50枚", C_GRAY),
    ]
    for i, (key, val, ac) in enumerate(kv):
        ry3 = ry2 + i * Emu(530000)
        rect_b(s, rx2, ry3, Inches(5.5), Emu(480000), C_CARD, ac, 1.2)
        rect(s, rx2, ry3, Emu(40000), Emu(480000), ac)
        tb(s, rx2 + Emu(70000), ry3 + Emu(40000), Inches(2.8), Emu(220000),
           key, 8, bold=True, color=ac)
        tb(s, rx2 + Emu(70000), ry3 + Emu(240000), Inches(5.1), Emu(210000),
           val, 9, color=C_NAVY)

    note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 3: ゲームフロー
# ══════════════════════════════════════════════════════════════
def s_flow(prs):
    s = new_slide(prs)
    hdr(s, "ゲームフロー ── 炎炎大戦から炎炎ループへ", "3/7")

    # フロー図（4ボックス）
    boxes = [
        ("通常遊技",  "レア役・天井で\nボーナス当選"),
        ("ボーナス\n(炎炎系)",  "Fire Bonus等\nでAT突入"),
        ("AT\n炎炎大戦",   "基本AT\n純増5.8枚/G"),
        ("上位AT\n炎炎ループ",   "継続率80%以上\n期待1,200枚/周"),
    ]
    bw, bh = Inches(1.85), Inches(1.4)
    gap = Inches(0.3)
    total = 4 * bw + 3 * gap
    sx = (Inches(10) - total) / 2
    cy = Inches(2.3)

    fills  = [C_CARD, C_CARD, RGBColor(0xFE, 0xF0, 0xE8), RGBColor(0xDD, 0x55, 0x00)]
    tcols  = [C_NAVY, C_NAVY, C_FIRE, C_WHITE]
    bcols  = [C_LTGRY, C_LTGRY, C_FIRE, C_FLAME]

    for i, (lbl, sub) in enumerate(boxes):
        bx0 = sx + i * (bw + gap)
        rect_b(s, bx0, cy - bh / 2, bw, bh, fills[i], bcols[i], 1.5)
        tb(s, bx0 + Emu(40000), cy - bh / 2 + Emu(90000),
           bw - Emu(80000), Emu(380000), lbl, 10, bold=True,
           color=tcols[i], align=PP_ALIGN.CENTER, font=FONT_H)
        tb(s, bx0 + Emu(30000), cy - bh / 2 + Emu(450000),
           bw - Emu(60000), Emu(280000), sub, 7.5,
           color=C_WHITE if tcols[i] == C_WHITE else C_GRAY,
           align=PP_ALIGN.CENTER)
        if i < 3:
            arrow_r(s, bx0 + bw + Emu(15000), cy)

    # 下部ポイント解説（3枚）
    pts = [
        ("高純増5.8枚/Gの衝撃",
         "通常の3倍近い出玉スピード。\n同じ時間でより多くの出玉体験ができる。"),
        ("炎炎ループ80%+で連チャン",
         "上位AT突入後は80%以上で継続。\n期待1,200枚×連チャン数が積み上がる。"),
        ("二段階天井で安心感を担保",
         "850G + 2000Gの二重セーフティ。\n長期ハマり時も出口が見える設計。"),
    ]
    py = Inches(3.6)
    pw = Inches(9.4) / 3
    for i, (title, body) in enumerate(pts):
        px = Inches(0.3) + i * pw
        bc = C_FIRE if i == 1 else C_LTGRY
        rect_b(s, px, py, pw - Inches(0.1), Inches(1.65), C_CARD, bc, 1.0)
        rect(s, px, py, Emu(40000), Inches(1.65), bc)
        tb(s, px + Emu(70000), py + Emu(50000), pw - Inches(0.25), Emu(250000),
           title, 8.5, bold=True, color=C_FIRE if i == 1 else C_NAVY)
        tb(s, px + Emu(70000), py + Emu(290000), pw - Inches(0.25), Emu(700000),
           body, 7.5, color=C_MID)

    note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 4: 二段階天井設計
# ══════════════════════════════════════════════════════════════
def s_ceiling(prs):
    s = new_slide(prs)
    hdr(s, "二段階天井 ── 850G + 2,000Gの多層セーフティ", "4/7")

    # 左：天井の説明
    bx, by = Inches(0.3), Inches(0.75)
    bw2 = Inches(4.5)

    rect(s, bx, by, bw2, Emu(320000), C_FIRE)
    tb(s, bx + Emu(60000), by + Emu(50000), bw2 - Emu(80000), Emu(240000),
       "2種類の天井が存在する意義", 11, bold=True, color=C_WHITE, font=FONT_H)

    items = [
        (C_FIRE, "第1天井：ボーナス間 850G",
         "通常遊技でボーナスが850G引けない場合に発動。\n"
         "リセット後は650Gに短縮される。\n"
         "日常的に使いやすい「狙い目の下限」として機能。"),
        (C_BLUE, "第2天井：炎炎ループ間 2,000G",
         "炎炎ループ（上位AT）が2,000G引けない場合に発動。\n"
         "リセット後は1,500Gに短縮される。\n"
         "長期ハマり時の最後の砦として機能。"),
        (C_GREEN, "二段階の相乗効果",
         "第1天井で短期保険、第2天井で長期保険。\n"
         "プレイヤーは「いずれか近い方の天井」を目標に\n"
         "設定できるため、投資計画が立てやすい。"),
    ]
    for i, (ac, t, b) in enumerate(items):
        iy = by + Emu(320000) + i * Emu(1280000)
        rect_b(s, bx, iy, bw2, Emu(1200000), C_CARD, ac, 1.5)
        rect(s, bx, iy, Emu(45000), Emu(1200000), ac)
        tb(s, bx + Emu(80000), iy + Emu(50000), bw2 - Emu(100000), Emu(260000),
           t, 9, bold=True, color=ac)
        tb(s, bx + Emu(80000), iy + Emu(300000), bw2 - Emu(100000), Emu(800000),
           b, 8, color=C_MID)

    # 右：天井図（ビジュアル）
    rx, ry = Inches(5.05), Inches(0.75)
    rw = Inches(4.65)

    rect(s, rx, ry, rw, Emu(300000), C_NAVY)
    tb(s, rx + Emu(50000), ry + Emu(50000), rw - Emu(70000), Emu(220000),
       "天井狙い：どの台を選ぶか", 11, bold=True, color=C_WHITE, font=FONT_H)

    targets = [
        (C_FIRE,  "第1天井狙い",  "550G〜（リセット後 400G〜）",
         "最もオーソドックスな狙い方。\n期待値が出やすく回転率も高い。"),
        (C_BLUE,  "第2天井狙い",  "1,500G〜（リセット後 1,200G〜）",
         "投資は大きいが発動時の出玉が\n大きく期待収支もプラスになりやすい。"),
        (C_GOLD,  "両天井複合",   "ゾーン計算が必要",
         "第1・第2天井の両方を意識した\n高度な立ち回りが必要。"),
    ]
    for i, (ac, t, cond, b) in enumerate(targets):
        py0 = ry + Emu(300000) + i * Emu(1310000)
        rect_b(s, rx, py0, rw, Emu(1250000), C_CARD, ac, 1.2)
        rect(s, rx, py0, Emu(40000), Emu(1250000), ac)
        tb(s, rx + Emu(70000), py0 + Emu(40000), rw - Emu(90000), Emu(240000),
           t, 9, bold=True, color=ac)
        tb(s, rx + Emu(70000), py0 + Emu(270000), rw - Emu(90000), Emu(220000),
           cond, 8, bold=False, color=C_GRAY)
        tb(s, rx + Emu(70000), py0 + Emu(480000), rw - Emu(90000), Emu(640000),
           b, 8, color=C_MID)

    note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 5: 設定差の構造
# ══════════════════════════════════════════════════════════════
def s_settei(prs):
    s = new_slide(prs)
    hdr(s, "設定差の構造 ── 炎炎ループ初当たりに集中", "5/7")

    # 左：設定差データ
    bx, by = Inches(0.3), Inches(0.75)

    rect(s, bx, by, Inches(4.5), Emu(340000), C_FIRE)
    tb(s, bx + Emu(60000), by + Emu(55000), Inches(4.3), Emu(250000),
       "炎炎ループ初当たり確率（設定差の核心）", 10, bold=True, color=C_WHITE, font=FONT_H)

    loop_data = [
        ("設定1", "1/684", C_GRAY,  False),
        ("設定2", "─",    C_GRAY,  False),
        ("設定3", "─",    C_GRAY,  False),
        ("設定4", "─",    C_MID,   False),
        ("設定5", "─",    C_MID,   False),
        ("設定6", "1/486", C_FIRE,  True),
    ]
    row_h = Emu(370000)
    hdr_h = Emu(300000)
    rect(s, bx, by + Emu(340000), Inches(4.5), hdr_h, C_CARD2)
    tb(s, bx + Emu(50000), by + Emu(395000), Inches(2.0), hdr_h - Emu(60000),
       "設定", 8, bold=True, color=C_NAVY)
    tb(s, bx + Emu(1700000), by + Emu(395000), Inches(2.0), hdr_h - Emu(60000),
       "ループ初当たり", 8, bold=True, color=C_NAVY)

    for i, (setting, prob, tc, hi) in enumerate(loop_data):
        ry = by + Emu(340000) + hdr_h + i * row_h
        bg = RGBColor(0xFF, 0xF4, 0xEE) if hi else (C_CARD if i % 2 == 0 else C_ROW)
        rect(s, bx, ry, Inches(4.5), row_h, bg)
        rect(s, bx, ry, Emu(20000), row_h, C_FIRE if hi else C_LTGRY)
        tb(s, bx + Emu(60000), ry + Emu(55000), Inches(2.0), row_h - Emu(70000),
           setting, 9, bold=hi, color=C_FIRE if hi else C_NAVY)
        tb(s, bx + Emu(1700000), ry + Emu(55000), Inches(2.5), row_h - Emu(70000),
           prob, 11, bold=hi, color=tc)

    # 設定1 vs 6 比較
    comp_y = by + Emu(340000) + hdr_h + 6 * row_h + Emu(50000)
    rect_b(s, bx, comp_y, Inches(4.5), Emu(480000),
           RGBColor(0xFF, 0xF4, 0xEE), C_FIRE, 1.5)
    tb(s, bx + Emu(60000), comp_y + Emu(60000), Inches(4.2), Emu(240000),
       "設定1 vs 設定6：約1.4倍の差", 9, bold=True, color=C_FIRE)
    tb(s, bx + Emu(60000), comp_y + Emu(285000), Inches(4.2), Emu(170000),
       "長時間実戦で大きく差が開く構造", 8, color=C_MID)

    # 右：設計インサイト
    rx, ry = Inches(5.05), Inches(0.75)
    rw = Inches(4.65)

    rect(s, rx, ry, rw, Emu(300000), C_NAVY)
    tb(s, rx + Emu(50000), ry + Emu(50000), rw - Emu(70000), Emu(220000),
       "設計のポイント", 11, bold=True, color=C_WHITE, font=FONT_H)

    insights = [
        (C_FIRE,  "炎炎ループに設定差を集中させた意図",
         "通常AT（炎炎大戦）はすべての設定でほぼ同じ体験。\n"
         "差を炎炎ループ初当たりに集約することで\n「高設定ほど上位ATに行ける」という明快な差別化。"),
        (C_BLUE,  "プレイヤーが実感しやすい設定差",
         "1/684 vs 1/486 という1.4倍差は、\n数百ゲームの実戦で感じられるレベル。\n"
         "「この台は炎炎ループに入りやすい」と体感できる。"),
        (C_GREEN, "ホールが設定を入れやすい構造",
         "設定6の機械割 114.9%は利益ラインを確保しながら\n"
         "十分な期待値をプレイヤーに提供。\n高設定を使う店が増えやすい設計。"),
    ]
    for i, (ac, t, b) in enumerate(insights):
        py0 = ry + Emu(300000) + i * Emu(1340000)
        rect_b(s, rx, py0, rw, Emu(1270000), C_CARD, ac, 1.2)
        rect(s, rx, py0, Emu(40000), Emu(1270000), ac)
        tb(s, rx + Emu(70000), py0 + Emu(50000), rw - Emu(90000), Emu(260000),
           t, 8.5, bold=True, color=ac)
        tb(s, rx + Emu(70000), py0 + Emu(305000), rw - Emu(90000), Emu(860000),
           b, 8, color=C_MID)

    note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 6: 設定判別演出
# ══════════════════════════════════════════════════════════════
def s_hanbet(prs):
    s = new_slide(prs)
    hdr(s, "設定判別 ── 終了画面と演出示唆", "6/7")

    # 上段：終了画面の種類
    tx, ty = Inches(0.3), Inches(0.75)
    tw = Inches(9.4)

    rect(s, tx, ty, tw, Emu(320000), C_FIRE)
    tb(s, tx + Emu(50000), ty + Emu(50000), tw - Emu(70000), Emu(240000),
       "設定示唆が出る終了画面", 10, bold=True, color=C_WHITE, font=FONT_H)

    bonus_types = [
        ("Normal\nREG", "最も出現頻度が高く\n判別数が集まりやすい"),
        ("Fire\nBonus", "設定差が比較的大きい\n重要な判別ポイント"),
        ("Accel\nBonus", "出現時の演出内容で\n設定を推測"),
        ("Ash\nBonus",  "レア演出。出現時は\n高設定を強示唆"),
    ]
    bw = Inches(9.4) / 4
    for i, (bt, desc) in enumerate(bonus_types):
        bx0 = tx + i * bw
        bg = C_CARD if i % 2 == 0 else C_ROW
        rect_b(s, bx0, ty + Emu(320000), bw - Emu(30000), Emu(750000), bg, C_FIRE, 0.5)
        tb(s, bx0 + Emu(30000), ty + Emu(360000), bw - Emu(60000), Emu(300000),
           bt, 9, bold=True, color=C_FIRE, align=PP_ALIGN.CENTER)
        tb(s, bx0 + Emu(30000), ty + Emu(650000), bw - Emu(60000), Emu(360000),
           desc, 7.5, color=C_MID, align=PP_ALIGN.CENTER)

    # 下段：強示唆演出3種
    sy = ty + Emu(1130000)
    rect(s, tx, sy, tw, Emu(280000), C_NAVY)
    tb(s, tx + Emu(50000), sy + Emu(45000), tw - Emu(70000), Emu(220000),
       "強設定示唆演出（確認できたら高設定確定or濃厚）", 10, bold=True, color=C_WHITE, font=FONT_H)

    strong = [
        (C_FIRE,  "全員集合",
         "第8特殊消防隊の\n全メンバー集合演出。\n高設定濃厚。"),
        (C_FIRE2, "赤枠 × 9人",
         "赤枠演出と\n9人キャラの組み合わせ。\n設定5以上の可能性大。"),
        (C_GOLD,  "金枠演出",
         "金枠キャラ出現。\nシナリオ次第で\n設定6確定もあり。"),
    ]
    sw = Inches(9.4) / 3
    for i, (ac, t, b) in enumerate(strong):
        sx0 = tx + i * sw
        rect_b(s, sx0, sy + Emu(280000), sw - Emu(40000), Emu(2800000),
               RGBColor(0xFF, 0xF8, 0xF4) if i == 0 else C_CARD, ac, 1.5)
        rect(s, sx0, sy + Emu(280000), Emu(45000), Emu(2800000), ac)
        tb(s, sx0 + Emu(80000), sy + Emu(330000), sw - Emu(120000), Emu(280000),
           t, 12, bold=True, color=ac, align=PP_ALIGN.CENTER, font=FONT_H)
        tb(s, sx0 + Emu(80000), sy + Emu(610000), sw - Emu(120000), Emu(600000),
           b, 9, color=C_MID, align=PP_ALIGN.CENTER)
        # 強さバー
        rect(s, sx0 + Emu(80000), sy + Emu(1280000), sw - Emu(120000), Emu(60000), C_LTGRY)
        fill_w = int((sw - Emu(120000)) * (1.0 if i == 2 else 0.75 if i == 1 else 0.9))
        rect(s, sx0 + Emu(80000), sy + Emu(1280000), fill_w, Emu(60000), ac)
        tb(s, sx0 + Emu(80000), sy + Emu(1360000), sw - Emu(120000), Emu(220000),
           "設定6確定あり" if i == 2 else "設定5+ 濃厚" if i == 1 else "高設定 濃厚",
           7.5, color=ac)

    note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 7: まとめ
# ══════════════════════════════════════════════════════════════
def s_matome(prs):
    s = new_slide(prs)
    hdr(s, "まとめ ── 設計から学べること", "7/7")

    # 左：強みと課題
    bx, by = Inches(0.3), Inches(0.75)
    bw2 = Inches(4.5)

    rect(s, bx, by, bw2, Emu(320000), C_FIRE)
    tb(s, bx + Emu(60000), by + Emu(55000), bw2 - Emu(80000), Emu(240000),
       "炎炎ノ消防隊2の設計的強み", 11, bold=True, color=C_WHITE, font=FONT_H)

    strengths = [
        (C_FIRE,  "5.8枚/G という圧倒的な出玉体験",
         "短時間で大量獲得できる高純増は\n「勝った実感」を最大化する。\nリピート来店の動機になりやすい。"),
        (C_BLUE,  "二段階天井による投資計画の立てやすさ",
         "850G + 2000Gのダブルセーフティで\nプレイヤーが「どこまで投資するか」を\n事前計画しやすい安心設計。"),
        (C_GREEN, "設定差が炎炎ループに集中した明快さ",
         "「高設定ほどループに入れる」という\nシンプルな設定差は分かりやすく\nホールが高設定を使う動機になる。"),
    ]
    for i, (ac, t, b) in enumerate(strengths):
        iy = by + Emu(320000) + i * Emu(1280000)
        rect_b(s, bx, iy, bw2, Emu(1200000), C_CARD, ac, 1.5)
        rect(s, bx, iy, Emu(45000), Emu(1200000), ac)
        tb(s, bx + Emu(80000), iy + Emu(50000), bw2 - Emu(100000), Emu(260000),
           t, 8.5, bold=True, color=ac)
        tb(s, bx + Emu(80000), iy + Emu(300000), bw2 - Emu(100000), Emu(800000),
           b, 8, color=C_MID)

    # 右：設計原則
    rx, ry = Inches(5.05), Inches(0.75)
    rw = Inches(4.65)

    rect(s, rx, ry, rw, Emu(300000), C_NAVY)
    tb(s, rx + Emu(50000), ry + Emu(50000), rw - Emu(70000), Emu(220000),
       "設計原則", 11, bold=True, color=C_WHITE, font=FONT_H)

    principles = [
        (C_FIRE,  False, "純増5.8枚は「速い出玉体験」を武器にする"),
        (C_BLUE,  False, "二段階天井は「投資計画の見える化」につながる"),
        (C_GREEN, False, "設定差の集中で「高設定の価値」が伝わりやすい"),
        (C_GOLD,  False, "強示唆演出は「発見の喜び」として機能する"),
    ]
    for i, (ac, bold, p) in enumerate(principles):
        py0 = ry + Emu(300000) + i * Emu(530000)
        rect(s, rx, py0, Emu(20000), Emu(480000), ac)
        tb(s, rx + Emu(50000), py0 + Emu(80000), rw - Emu(60000), Emu(360000),
           p, 8.5, bold=bold, color=C_NAVY)

    rect_b(s, rx, ry + Emu(2440000), rw, Emu(800000),
           RGBColor(0xFF, 0xF6, 0xEE), C_FIRE, 1.5)
    tb(s, rx + Emu(50000), ry + Emu(2490000), rw - Emu(70000), Emu(260000),
       "総括", 9, bold=True, color=C_FIRE)
    tb(s, rx + Emu(50000), ry + Emu(2740000), rw - Emu(70000), Emu(430000),
       "高純増×二段階天井×明快な設定差の三位一体で\n2026年の代表作になりうる現代型設計。\n"
       "設定判別の明確さがホールとの相性も良い。", 8, color=C_MID)

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
    s_ceiling(prs)
    s_settei(prs)
    s_hanbet(prs)
    s_matome(prs)

    prs.save(OUT_PATH)
    print(f"Saved: {OUT_PATH}")


if __name__ == "__main__":
    main()
