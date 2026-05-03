"""
スマスロ 北斗の拳 機種分析資料
出力: proposals/機種分析/北斗の拳/hokuto_analysis.pptx
テーマ: 白基調 × 赤 × 金
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

# ── カラーパレット（白×赤×金）──────────────────────────────────
C_BG    = RGBColor(0xFC, 0xFC, 0xFF)
C_CARD  = RGBColor(0xEE, 0xF2, 0xF8)
C_CARD2 = RGBColor(0xE2, 0xE8, 0xF4)
C_ROW   = RGBColor(0xF5, 0xF7, 0xFC)
C_RED   = RGBColor(0xBB, 0x11, 0x11)
C_RED2  = RGBColor(0x88, 0x00, 0x00)
C_GOLD  = RGBColor(0xB8, 0x96, 0x20)
C_GOLD2 = RGBColor(0xD4, 0xB0, 0x40)
C_NAVY  = RGBColor(0x0A, 0x14, 0x28)
C_MID   = RGBColor(0x33, 0x33, 0x55)
C_GRAY  = RGBColor(0x66, 0x66, 0x77)
C_LTGRY = RGBColor(0xCC, 0xCC, 0xDD)
C_WHITE = RGBColor(0xFF, 0xFF, 0xFF)
C_GREEN = RGBColor(0x11, 0x88, 0x44)
C_BLUE  = RGBColor(0x22, 0x55, 0xBB)
C_ORG   = RGBColor(0xCC, 0x66, 0x00)

FONT_H = "游明朝"
FONT_B = "メイリオ"
SLIDE_W = Inches(10)
SLIDE_H = Inches(5.625)


def make_bg(w=1280, h=720):
    img = PILImage.new("RGB", (w, h), (252, 252, 255))
    draw = ImageDraw.Draw(img)
    for y in range(0, 7):
        draw.line([(0, y), (w, y)], fill=(187, 17, 17))
    for y in range(h - 45, h):
        t = (y - (h - 45)) / 45
        c = int(248 - 12 * t)
        draw.line([(0, y), (w, y)], fill=(c, c, c + 2))
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
    rect(slide, 0, 0, Emu(45000), Inches(0.58), C_RED)
    tb(slide, Inches(0.15), Emu(28000), Inches(8.5), Emu(410000),
       title_text, 14, bold=True, color=C_NAVY, font=FONT_H)
    if pg:
        tb(slide, Inches(8.8), Emu(45000), Inches(1.0), Emu(340000),
           pg, 8, color=C_GRAY, align=PP_ALIGN.RIGHT)
    rect(slide, 0, Inches(0.58), SLIDE_W, Emu(7000), C_RED)


def note(slide):
    tb(slide, Inches(8.2), Inches(5.38), Inches(1.7), Emu(180000),
       "※ネット解析情報より", 7, color=C_GRAY, align=PP_ALIGN.RIGHT)


def flow_box(slide, x, y, w, h, label, sub="", fill=None, tc=None, sc=None):
    rect_b(slide, x, y, w, h, fill or C_CARD, C_RED, 1.5)
    tb(slide, x + Emu(40000), y + Emu(25000), w - Emu(80000), Emu(280000),
       label, 9, bold=True, color=tc or C_NAVY, align=PP_ALIGN.CENTER, wrap=False)
    if sub:
        tb(slide, x + Emu(30000), y + Emu(295000), w - Emu(60000), Emu(200000),
           sub, 7.5, color=sc or C_GRAY, align=PP_ALIGN.CENTER)


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

    # 左パネル（赤みがかった白）
    rect(s, 0, 0, Inches(5.4), SLIDE_H, RGBColor(0xFA, 0xF5, 0xF5))
    rect(s, 0, 0, Emu(50000), SLIDE_H, C_RED)
    rect(s, Inches(5.4), 0, Emu(8000), SLIDE_H, C_LTGRY)

    tb(s, Inches(0.22), Inches(0.55), Inches(5.0), Emu(350000),
       "機種分析資料", 12, color=C_GOLD, font=FONT_H)
    tb(s, Inches(0.22), Inches(1.05), Inches(5.0), Emu(900000),
       "スマスロ\n北斗の拳", 34, bold=True, color=C_RED2, font=FONT_H)
    tb(s, Inches(0.22), Inches(2.85), Inches(5.0), Emu(340000),
       "── 4号機世代を呼び戻した稀有な設計", 11, color=C_MID, font=FONT_H)

    tb(s, Inches(0.22), Inches(3.5), Inches(4.9), Emu(240000),
       "メーカー：サミー　　設定数：6段階", 9, color=C_GRAY)
    tb(s, Inches(0.22), Inches(3.85), Inches(4.9), Emu(240000),
       "機械割：設定1 98.0% ／ 設定6 113.0%", 9, color=C_GRAY)
    tb(s, Inches(0.22), Inches(4.2), Inches(4.9), Emu(240000),
       "長期稼働：89週連続 稼働ランキング3位・5634店設置", 9, color=C_GRAY)

    # 右パネル：3つのキーワードボックス
    kws = [
        ("IP 力", "4号機「北斗の拳」世代の\n潜在ファン層を掘り起こす"),
        ("94%ループ", "上位AT「無想転生」で\n平均16連チャン超"),
        ("設計の透明性", "有利区間・冷遇区間への\nユーザー不満も存在"),
    ]
    cols = [C_RED, RGBColor(0xB8, 0x96, 0x20), C_BLUE]
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

    # 設定別テーブル
    bx, by = Inches(0.3), Inches(0.78)
    bw = Inches(5.0)
    cols_w = [Emu(550000), Emu(1000000), Emu(1200000), Emu(1100000), Emu(700000)]
    col_labels = ["設定", "機械割", "AT初当り", "設定6比 出玉率", "特記"]
    rows = [
        ("1", "98.0%",  "1/383",  "─",      ""),
        ("2", "99.0%",  "1/360",  "─",      ""),
        ("3", "102.0%", "1/330",  "─",      ""),
        ("4", "105.5%", "1/300",  "▲",     "設定4以上でプラス"),
        ("5", "109.0%", "1/265",  "▲▲",   ""),
        ("6", "113.0%", "1/235",  "◎ TOP", "長期稼働の核心"),
    ]
    row_h = Emu(370000)
    hdr_h = Emu(370000)

    # ヘッダー行
    rx = bx
    rect(s, bx, by, sum(cols_w), hdr_h, RGBColor(0xBB, 0x11, 0x11))
    for j, (cw, label) in enumerate(zip(cols_w, col_labels)):
        tb(s, rx + Emu(30000), by + Emu(50000), cw - Emu(50000), hdr_h - Emu(60000),
           label, 8.5, bold=True, color=C_WHITE, align=PP_ALIGN.CENTER, wrap=False)
        rx += cw

    for i, row in enumerate(rows):
        ry = by + hdr_h + i * row_h
        bg = C_CARD if i % 2 == 0 else C_ROW
        rect(s, bx, ry, sum(cols_w), row_h, bg)
        rx = bx
        hi = (row[0] in ("4", "5", "6"))
        for j, (cw, val) in enumerate(zip(cols_w, row)):
            col = C_RED if j == 0 and hi else (C_GOLD if j == 3 and hi else C_NAVY)
            bold = j == 0 or (j == 1 and hi)
            tb(s, rx + Emu(30000), ry + Emu(55000), cw - Emu(50000), row_h - Emu(70000),
               val, 8.5, bold=bold, color=col, align=PP_ALIGN.CENTER, wrap=False)
            rx += cw

    # 右側：天井・その他スペック
    rx2, ry2 = Inches(5.55), Inches(0.78)
    kv = [
        ("天井①", "最大 1,268G（通常モード）", C_RED),
        ("天井②", "777G でほぼ北斗揃い確定", C_GOLD),
        ("リセット後天井", "800G+α（リセット短縮）", C_MID),
        ("純増速度", "AT中 約3.0枚/G", C_NAVY),
        ("BB継続率", "有利区間リセット後 84%以上", C_BLUE),
        ("設定6勝率", "実戦データ 94.2%", C_GREEN),
    ]
    for i, (key, val, ac) in enumerate(kv):
        ry3 = ry2 + i * Emu(530000)
        rect_b(s, rx2, ry3, Inches(4.1), Emu(480000), C_CARD, ac, 1.2)
        rect(s, rx2, ry3, Emu(40000), Emu(480000), ac)
        tb(s, rx2 + Emu(70000), ry3 + Emu(40000), Inches(3.8), Emu(220000),
           key, 8, bold=True, color=ac)
        tb(s, rx2 + Emu(70000), ry3 + Emu(240000), Inches(3.8), Emu(210000),
           val, 9, color=C_NAVY)

    note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 3: ゲームフロー
# ══════════════════════════════════════════════════════════════
def s_flow(prs):
    s = new_slide(prs)
    hdr(s, "ゲームフロー ── 通常→AT→上位ATの構造", "3/7")

    # フロー図
    boxes = [
        ("通常遊技", "レア役・モード移行を積み上げ"),
        ("ボーナス\n(BB)", "BB後のモードで\n次の展開が決まる"),
        ("AT\n天破の刻", "基本AT\n純増約3.0枚/G"),
        ("上位AT\n無想転生", "継続率94%\n平均16.6連超"),
        ("有利区間\nリセット", "→高継続BB再セット\n(84%以上)"),
    ]
    bw, bh = Inches(1.55), Inches(1.35)
    gap = Inches(0.22)
    total = 5 * bw + 4 * gap
    sx = (Inches(10) - total) / 2
    cy = Inches(2.35)

    fills = [C_CARD, C_CARD, RGBColor(0xF0, 0xE8, 0xE8),
             RGBColor(0xBB, 0x11, 0x11), RGBColor(0xE8, 0xEC, 0xF8)]
    tcols = [C_NAVY, C_NAVY, C_RED, C_WHITE, C_NAVY]
    bcols = [C_LTGRY, C_LTGRY, C_RED, C_RED2, C_LTGRY]

    for i, (lbl, sub) in enumerate(boxes):
        bx0 = sx + i * (bw + gap)
        rect_b(s, bx0, cy - bh / 2, bw, bh, fills[i], bcols[i], 1.5)
        tb(s, bx0 + Emu(40000), cy - bh / 2 + Emu(80000),
           bw - Emu(80000), Emu(380000), lbl, 10, bold=True,
           color=tcols[i], align=PP_ALIGN.CENTER, font=FONT_H)
        tb(s, bx0 + Emu(30000), cy - bh / 2 + Emu(440000),
           bw - Emu(60000), Emu(280000), sub, 7.5,
           color=C_WHITE if tcols[i] == C_WHITE else C_GRAY,
           align=PP_ALIGN.CENTER)
        if i < 4:
            ax = bx0 + bw
            arrow_r(s, ax + Emu(10000), cy)

    # ポイント解説（下部）
    pts = [
        ("BB後のモード分岐が重要", "BBは全種類あり。その後のモードによって展開が大きく変わる。高設定ほど有利モードへの移行率が高い。"),
        ("有利区間リセット後も高継続で繋がる", "差枚管理による有利区間終了後、84%以上の継続BBが自動セットされ、連チャンが途切れにくい構造。"),
        ("無想転生 = 遊技の到達点", "94%継続で平均16連超の爆発力。1回辿り着くと大きな出玉が期待できる、来店動機の核心。"),
    ]
    py = Inches(3.6)
    pw = Inches(9.4) / 3
    for i, (title, body) in enumerate(pts):
        px = Inches(0.3) + i * pw
        rect_b(s, px, py, pw - Inches(0.1), Inches(1.65), C_CARD, C_RED if i == 2 else C_LTGRY, 1.0)
        rect(s, px, py, Emu(40000), Inches(1.65), C_RED if i == 2 else C_LTGRY)
        tb(s, px + Emu(70000), py + Emu(50000), pw - Inches(0.25), Emu(250000),
           title, 8.5, bold=True, color=C_RED if i == 2 else C_NAVY)
        tb(s, px + Emu(70000), py + Emu(290000), pw - Inches(0.25), Emu(680000),
           body, 7.5, color=C_MID)

    note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 4: 無想転生システム
# ══════════════════════════════════════════════════════════════
def s_musou(prs):
    s = new_slide(prs)
    hdr(s, "無想転生 ── 94%継続が生む「もう1回」の心理", "4/7")

    # 左：メインデータ
    bx, by = Inches(0.3), Inches(0.75)
    rect(s, bx, by, Inches(4.6), Inches(4.5), C_CARD)
    rect(s, bx, by, Emu(50000), Inches(4.5), C_RED)

    tb(s, bx + Emu(80000), by + Emu(50000), Inches(4.3), Emu(300000),
       "無想転生", 18, bold=True, color=C_RED, font=FONT_H)
    tb(s, bx + Emu(80000), by + Emu(340000), Inches(4.3), Emu(230000),
       "上位AT ── 有利区間の最終到達点", 9, color=C_GRAY)

    stats = [
        ("継続率",        "94%",     C_RED),
        ("平均連チャン数", "16.6連",  C_GOLD),
        ("期待獲得枚数",   "約2,000枚", C_BLUE),
        ("有利区間後継続BB", "84%以上",  C_GREEN),
    ]
    for i, (k, v, ac) in enumerate(stats):
        ry = by + Emu(600000) + i * Emu(740000)
        rect(s, bx + Emu(80000), ry, Inches(4.2), Emu(680000), C_WHITE)
        rect(s, bx + Emu(80000), ry, Emu(40000), Emu(680000), ac)
        tb(s, bx + Emu(160000), ry + Emu(60000), Inches(2.0), Emu(280000),
           k, 8, color=C_GRAY)
        tb(s, bx + Emu(160000), ry + Emu(310000), Inches(3.8), Emu(300000),
           v, 16, bold=True, color=ac, font=FONT_H)

    # 右：設計の解説
    rx, ry = Inches(5.1), Inches(0.75)
    rw = Inches(4.6)

    pts = [
        ("「もう1回」を心理的に正当化する継続率",
         "継続率94%は「外れる」より「続く」が圧倒的多数。\n"
         "プレイヤーは「次も続くはず」と自然に思い込む。\n"
         "ギャンブル的期待感と安心感が同時に生まれる稀有な設計。"),
        ("有利区間リセット後も繋がる「見えない安全網」",
         "差枚数が上限に近づくと有利区間が強制終了するが、\n"
         "その後84%以上の継続BBが自動セットされる。\n"
         "「終わったと思ったらまだ続く」体験が感動を生む。"),
        ("来店動機としての「無想転生到達」",
         "\"あの台で無想転生を体験したい\" という具体的動機。\n"
         "モンキーターンVのグランドスラムと同様の\n"
         "「積み上げの最終報酬」として機能している。"),
    ]
    for i, (title, body) in enumerate(pts):
        py0 = ry + i * Emu(1450000)
        rect_b(s, rx, py0, rw, Emu(1350000),
               RGBColor(0xFA, 0xF5, 0xF5) if i == 0 else C_CARD, C_RED if i == 0 else C_LTGRY, 1.2)
        rect(s, rx, py0, Emu(40000), Emu(1350000), C_RED if i == 0 else C_LTGRY)
        tb(s, rx + Emu(70000), py0 + Emu(50000), rw - Emu(90000), Emu(280000),
           title, 8.5, bold=True, color=C_RED if i == 0 else C_NAVY)
        tb(s, rx + Emu(70000), py0 + Emu(320000), rw - Emu(90000), Emu(940000),
           body, 8, color=C_MID)

    note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 5: 冷遇区間・ユーザー不満
# ══════════════════════════════════════════════════════════════
def s_issue(prs):
    s = new_slide(prs)
    hdr(s, "有利区間問題 ── 不透明な差枚管理への不満", "5/7")

    # 問題点カード（左）
    bx, by = Inches(0.3), Inches(0.75)
    bw2 = Inches(4.5)

    issues = [
        ("差枚管理の不透明さ",
         "有利区間内で差枚2000枚付近になると当選が重くなる\n"
         "「冷遇区間」の存在が玄人層の間で広く語られている。\n"
         "しかし公式は一切確率を公開していない。"),
        ("天然終了と冷遇終了の区別がつかない",
         "有利区間が終了しても原因が差枚管理なのか\n"
         "単純な不運なのかユーザーには判断できない。\n"
         "不透明さがデキレ・冷遇議論を継続させる構造的要因。"),
        ("連チャン後の「壁」体験",
         "無想転生で大量獲得後、差枚上限に近づくと\n"
         "急に当たらなくなる体験が「冷遇だ」と解釈される。\n"
         "実際の確率変動なのか、運なのかは不明。"),
    ]
    for i, (t, b) in enumerate(issues):
        iy = by + i * Emu(1440000)
        bc = C_RED if i == 0 else C_LTGRY
        rect_b(s, bx, iy, bw2, Emu(1330000), C_CARD, bc, 1.5)
        rect(s, bx, iy, Emu(45000), Emu(1330000), bc)
        tb(s, bx + Emu(80000), iy + Emu(50000), bw2 - Emu(100000), Emu(270000),
           t, 9, bold=True, color=C_RED if i == 0 else C_NAVY)
        tb(s, bx + Emu(80000), iy + Emu(310000), bw2 - Emu(100000), Emu(900000),
           b, 8, color=C_MID)

    # 右：設計インプリケーション
    rx, ry = Inches(5.05), Inches(0.75)
    rw = Inches(4.65)

    rect(s, rx, ry, rw, Emu(580000), RGBColor(0xCC, 0x11, 0x11))
    rect(s, rx, ry, Emu(50000), Emu(580000), C_RED2)
    tb(s, rx + Emu(80000), ry + Emu(60000), rw - Emu(100000), Emu(280000),
       "なぜ不満が広がるのか？", 11, bold=True, color=C_WHITE, font=FONT_H)
    tb(s, rx + Emu(80000), ry + Emu(320000), rw - Emu(100000), Emu(230000),
       "有利区間の「見えない壁」が信頼を侵食する", 8.5, color=RGBColor(0xFF, 0xDD, 0xDD))

    body_pts = [
        "スロット台の期待感は「公平性への信頼」が前提",
        "確率非公開 + 差枚管理 = 陰謀論が育つ環境",
        "設定6でも負ける体験が「デキレ」解釈を生む",
        "長期稼働にはなっているが、コアユーザーの不信感は払拭されていない",
        "→ 透明性の欠如は設計上のリスクファクター",
    ]
    for i, pt in enumerate(body_pts):
        py0 = ry + Emu(620000) + i * Emu(560000)
        tc = C_RED if i == 4 else C_NAVY
        bold = i == 4
        rect(s, rx, py0, Emu(18000), Emu(500000), C_RED if i == 4 else C_LTGRY)
        tb(s, rx + Emu(50000), py0 + Emu(80000), rw - Emu(60000), Emu(400000),
           pt, 8.5, bold=bold, color=tc)

    note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 6: 設定判別
# ══════════════════════════════════════════════════════════════
def s_hanbet(prs):
    s = new_slide(prs)
    hdr(s, "設定判別 ── 実戦で使えるポイント", "6/7")

    cols_x = [Inches(0.3), Inches(3.5), Inches(6.7)]
    cols_w = [Inches(3.0), Inches(3.0), Inches(3.0)]
    col_hdrs = ["BB後のモード移行", "AT中の示唆演出", "実戦判別のコツ"]
    col_colors = [C_RED, C_GOLD, C_BLUE]

    contents = [
        [
            ("弱スイカ後モード移行率", "高設定ほどモード移行率が高い。\n弱スイカ後の展開を記録しておく。"),
            ("BB後天国移行率", "設定6はBB後に天国or上位に\n移行しやすい。展開速度で判断。"),
            ("通常時の当選ゲーム数", "当選が早い台は高モード滞在の可能性。\nゲーム数が集中するゾーンを記録。"),
        ],
        [
            ("ケンシロウ示唆", "AT中の特定演出で設定示唆。\n強演出出現率に注目。"),
            ("BB終了画面", "BBのキャラクター・演出内容に\n設定示唆が含まれることがある。"),
            ("AT中カットイン", "強カットインの出現率が高設定ほど\n高くなるとされる。"),
        ],
        [
            ("ホールデータと照合", "公開されているホールデータと\n実戦データを照合して判断。"),
            ("複数台の平行観察", "同機種の複数台を観察し、\n当たりの早い台・展開の良い台を絞り込む。"),
            ("長時間実戦が前提", "設定差が当選率に出るため\n1000G以上の実戦データが必要。"),
        ],
    ]

    for ci, (col_x, col_w, col_hdr, col_col, items) in enumerate(
            zip(cols_x, cols_w, col_hdrs, col_colors, contents)):
        # 列ヘッダー
        rect(s, col_x, Inches(0.75), col_w - Inches(0.1), Emu(370000), col_col)
        tb(s, col_x + Emu(30000), Inches(0.75) + Emu(50000),
           col_w - Inches(0.15), Emu(280000),
           col_hdr, 9.5, bold=True, color=C_WHITE, align=PP_ALIGN.CENTER, wrap=False)

        for ri, (title, body) in enumerate(items):
            ry0 = Inches(0.75) + Emu(370000) + ri * Emu(1300000)
            bg = C_CARD if ri % 2 == 0 else C_ROW
            rect_b(s, col_x, ry0, col_w - Inches(0.1), Emu(1240000), bg, col_col, 0.5)
            tb(s, col_x + Emu(50000), ry0 + Emu(60000), col_w - Inches(0.2), Emu(260000),
               title, 8.5, bold=True, color=col_col)
            tb(s, col_x + Emu(50000), ry0 + Emu(310000), col_w - Inches(0.2), Emu(780000),
               body, 8, color=C_MID)

    note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 7: まとめ
# ══════════════════════════════════════════════════════════════
def s_matome(prs):
    s = new_slide(prs)
    hdr(s, "まとめ ── 設計から学べること", "7/7")

    # 左：長期稼働の3要素
    bx, by = Inches(0.3), Inches(0.75)
    bw3 = Inches(4.5)

    rect(s, bx, by, bw3, Emu(340000), C_RED)
    tb(s, bx + Emu(60000), by + Emu(55000), bw3 - Emu(80000), Emu(250000),
       "長期稼働を支えた3要素", 11, bold=True, color=C_WHITE, font=FONT_H)

    elems = [
        ("① IP力（知名度×ノスタルジア）",
         "4号機「北斗の拳」を原体験とする30〜40代が\n"
         "スマスロ版をきっかけにパチスロへ再入場。\n"
         "IP単体では成立しないが、実機の完成度が必要。"),
        ("② 94%ループの体験価値",
         "「次も続く」という高い期待値と\n"
         "達成感が同居する設計。\n"
         "1回辿り着けば大きな出玉体験が約束される。"),
        ("③ 5634店・89週の安心感",
         "設置台数の多さ・稼働期間の長さが\n"
         "「まだ打てる台」「選べる台」という\n"
         "消極的安心感を醸成し来店動機を継続させる。"),
    ]
    for i, (t, b) in enumerate(elems):
        ey = by + Emu(340000) + i * Emu(1300000)
        rect_b(s, bx, ey, bw3, Emu(1230000), C_CARD, C_LTGRY, 1.0)
        rect(s, bx, ey, Emu(40000), Emu(1230000), C_GOLD if i == 1 else C_RED)
        tb(s, bx + Emu(70000), ey + Emu(50000), bw3 - Emu(90000), Emu(270000),
           t, 9, bold=True, color=C_NAVY)
        tb(s, bx + Emu(70000), ey + Emu(310000), bw3 - Emu(90000), Emu(800000),
           b, 8, color=C_MID)

    # 右：設計原則リスト + 課題
    rx, ry = Inches(5.05), Inches(0.75)
    rw = Inches(4.65)

    rect(s, rx, ry, rw, Emu(300000), C_NAVY)
    tb(s, rx + Emu(50000), ry + Emu(50000), rw - Emu(70000), Emu(220000),
       "設計原則", 11, bold=True, color=C_WHITE, font=FONT_H)

    principles = [
        "強力なIPは「休眠層の呼び水」になる",
        "継続率94%は「終わらない」と感じさせる心理的閾値",
        "有利区間終了後の高継続BBで体験を繋げる",
        "透明性の欠如（差枚非公開）は信頼リスクになる",
    ]
    for i, p in enumerate(principles):
        py0 = ry + Emu(300000) + i * Emu(530000)
        rect(s, rx, py0, Emu(20000), Emu(480000), C_GOLD if i < 3 else C_RED)
        tb(s, rx + Emu(50000), py0 + Emu(80000), rw - Emu(60000), Emu(360000),
           p, 8.5, bold=(i == 3), color=C_RED if i == 3 else C_NAVY)

    rect_b(s, rx, ry + Emu(2440000), rw, Emu(750000),
           RGBColor(0xFA, 0xF5, 0xF5), C_RED, 1.5)
    tb(s, rx + Emu(50000), ry + Emu(2490000), rw - Emu(70000), Emu(280000),
       "総括", 9, bold=True, color=C_RED)
    tb(s, rx + Emu(50000), ry + Emu(2760000), rw - Emu(70000), Emu(380000),
       "IP×継続率94%×長期設置の三位一体が奇跡的に揃った事例。\n"
       "ただし透明性不足は次世代設計で解決すべき課題。", 8, color=C_MID)

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
    s_musou(prs)
    s_issue(prs)
    s_hanbet(prs)
    s_matome(prs)

    prs.save(OUT_PATH)
    print(f"Saved: {OUT_PATH}")


if __name__ == "__main__":
    main()
