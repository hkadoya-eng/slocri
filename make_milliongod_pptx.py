"""
スマスロ ミリオンゴッド-神々の軌跡- 完全解説 PowerPoint ジェネレーター
出力: proposals/milliongod_guide_v1.pptx
"""
import io, os, sys, random, urllib.request
from PIL import Image as PILImage, ImageDraw, ImageFilter
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

OUT_PATH = os.path.join(os.path.dirname(__file__), "proposals", "milliongod_guide_v2.pptx")

# ── カラーパレット（神・ゼウステーマ）──────────────────────────────
C_BG        = RGBColor(0x05, 0x05, 0x12)
C_CARD      = RGBColor(0x0E, 0x08, 0x20)
C_GOLD      = RGBColor(0xD4, 0xA5, 0x20)
C_GOLD2     = RGBColor(0xFF, 0xD7, 0x00)
C_PURPLE    = RGBColor(0x7C, 0x3A, 0xED)
C_PURPLE2   = RGBColor(0x4C, 0x1D, 0x95)
C_BLUE      = RGBColor(0x3B, 0x82, 0xF6)
C_LTBLUE    = RGBColor(0x93, 0xC5, 0xFD)
C_LIGHTNING = RGBColor(0xFD, 0xE0, 0x47)
C_RED       = RGBColor(0xDC, 0x26, 0x26)
C_CRIMSON   = RGBColor(0x99, 0x00, 0x00)
C_CREAM     = RGBColor(0xF5, 0xE6, 0xC8)
C_WHITE     = RGBColor(0xFF, 0xFF, 0xFF)
C_LTGRAY    = RGBColor(0xBB, 0xBB, 0xBB)
C_GRAY      = RGBColor(0x88, 0x88, 0x88)
C_DARKGRAY  = RGBColor(0x44, 0x44, 0x44)
C_GREEN     = RGBColor(0x22, 0xBB, 0x55)
C_ORANGE    = RGBColor(0xFF, 0x88, 0x00)
C_YELLOW    = RGBColor(0xFF, 0xEE, 0x44)
C_GOD       = RGBColor(0xFF, 0xAA, 0x00)

SLIDE_W = Inches(10)
SLIDE_H = Inches(5.625)
FONT_H  = "游明朝"   # ヘッダー用（神秘・格調感）
FONT_B  = "メイリオ" # ボディ用


# ── Pillow 背景生成 ────────────────────────────────────────────
def make_god_bg(width=960, height=540, seed=7):
    random.seed(seed)
    img = PILImage.new("RGB", (width, height), (5, 5, 18))
    draw = ImageDraw.Draw(img)
    for y in range(height):
        ratio = y / height
        r = int(5 + ratio * 10)
        g = int(3 + ratio * 2)
        b = int(18 + ratio * 15)
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    for _ in range(250):
        x = random.randint(0, width)
        y = random.randint(0, height)
        sz = random.choice([1, 1, 1, 2, 2])
        br = random.randint(80, 220)
        col = (br, int(br * 0.82), 0) if random.random() > 0.45 else (br // 3, br // 3, br // 3)
        draw.ellipse([x - sz, y - sz, x + sz, y + sz], fill=col)
    img = img.filter(ImageFilter.GaussianBlur(radius=0.5))
    return img

def make_title_bg(width=960, height=540):
    random.seed(13)
    img = PILImage.new("RGB", (width, height), (5, 5, 18))
    draw = ImageDraw.Draw(img)
    for y in range(height):
        ratio = y / height
        r = int(5 + ratio * 12)
        g = int(3 + ratio * 2)
        b = int(18 + ratio * 22)
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    for px in range(60, width, 90):
        intensity = random.randint(20, 55)
        for w in range(-3, 4):
            alpha = max(0, intensity - abs(w) * 10)
            if alpha > 0:
                draw.line([(px + w, 0), (px + w + random.randint(-30, 30), height // 2)],
                          fill=(alpha, int(alpha * 0.85), 0))
    for _ in range(500):
        x = random.randint(0, width)
        y = random.randint(0, height)
        sz = random.choice([1, 1, 2, 2, 3])
        br = random.randint(100, 255)
        col = (br, int(br * 0.85), 0) if random.random() > 0.4 else (br, br, br)
        draw.ellipse([x - sz, y - sz, x + sz, y + sz], fill=col)
    img = img.filter(ImageFilter.GaussianBlur(radius=1.0))
    return img


# ── pptx ユーティリティ ────────────────────────────────────────
def add_pic(slide, pil_img, l, t, w, h):
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG")
    buf.seek(0)
    slide.shapes.add_picture(buf, l, t, w, h)

def new_slide(prs, title=False):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    bg = make_title_bg(960, 540) if title else make_god_bg(960, 540)
    add_pic(s, bg, 0, 0, SLIDE_W, SLIDE_H)
    return s

def rect(slide, l, t, w, h, color):
    shp = slide.shapes.add_shape(1, l, t, w, h)
    shp.fill.solid()
    shp.fill.fore_color.rgb = color
    shp.line.fill.background()
    return shp

def rect_b(slide, l, t, w, h, fill, border, lw=1.5):
    shp = slide.shapes.add_shape(1, l, t, w, h)
    shp.fill.solid()
    shp.fill.fore_color.rgb = fill
    shp.line.color.rgb = border
    shp.line.width = Pt(lw)
    return shp

def tb(slide, l, t, w, h, text, sz, bold=False, italic=False,
       color=C_WHITE, align=PP_ALIGN.LEFT, wrap=True, font=FONT_B):
    txb = slide.shapes.add_textbox(l, t, w, h)
    txb.text_frame.word_wrap = wrap
    p = txb.text_frame.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.size = Pt(sz)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = color
    run.font.name = font
    return txb

def hdr(slide, text, color=C_GOLD):
    rect(slide, 0, 0, SLIDE_W, Emu(430000), RGBColor(0x08, 0x04, 0x18))
    rect(slide, 0, 0, Emu(80000), Emu(430000), color)
    tb(slide, Emu(150000), Emu(55000), Inches(9.5), Emu(350000),
       text, 14, bold=True, color=color, font=FONT_H)

def net_note(slide, text="※ネットより"):
    tb(slide, Inches(8.5), Inches(5.38), Inches(1.4), Emu(200000),
       text, 7, color=C_GRAY, align=PP_ALIGN.RIGHT)

def arrow_r(slide, x, y, size=Emu(160000), color=C_GOLD):
    shp = slide.shapes.add_shape(13, x, y - size // 4, size, size // 2)
    shp.fill.solid()
    shp.fill.fore_color.rgb = color
    shp.line.fill.background()

def arrow_d(slide, x, y, color=C_GOLD):
    w, h = Emu(100000), Emu(180000)
    shp = slide.shapes.add_shape(13, x - w // 2, y, w, h)
    shp.rotation = 90
    shp.fill.solid()
    shp.fill.fore_color.rgb = color
    shp.line.fill.background()

def _fetch_pil(url, w_px, h_px):
    placeholder = PILImage.new("RGB", (w_px, h_px), (14, 8, 32))
    if not url:
        return placeholder
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = resp.read()
        img = PILImage.open(io.BytesIO(data)).convert("RGB")
        img.thumbnail((w_px, h_px), PILImage.LANCZOS)
        canvas = PILImage.new("RGB", (w_px, h_px), (14, 8, 32))
        canvas.paste(img, ((w_px - img.width) // 2, (h_px - img.height) // 2))
        return canvas
    except Exception:
        return placeholder


# ══════════════════════════════════════════════════════════════
#  SLIDE 1: タイトル
# ══════════════════════════════════════════════════════════════
def s_title(prs):
    s = new_slide(prs, title=True)

    rect_b(s, Inches(0.3), Inches(0.7), Inches(5.5), Inches(4.5),
           RGBColor(0x05, 0x03, 0x14), C_GOLD, 2.5)
    rect(s, Inches(0.3), Inches(0.7), Inches(5.5), Emu(500000),
         RGBColor(0x18, 0x08, 0x00))

    tb(s, Inches(0.45), Inches(0.77), Inches(5.2), Emu(430000),
       "MILLION GOD", 30, bold=True, color=C_GOLD2, font=FONT_H)
    tb(s, Inches(0.45), Inches(1.33), Inches(5.2), Emu(560000),
       "神々の軌跡", 22, bold=True, color=C_PURPLE, font=FONT_H)
    tb(s, Inches(0.45), Inches(2.05), Inches(5.2), Emu(360000),
       "スマスロ（L型）  /  ミズホ  /  2026年4月20日導入", 10, color=C_CREAM)
    tb(s, Inches(0.45), Inches(2.55), Inches(5.1), Emu(700000),
       "GOD揃い 1/16,384 の一撃が全てを変える。\n"
       "純増7.0枚/Gの爆速ATが引き起こす\n"
       "神々の連鎖を体験せよ。",
       10.5, color=C_CREAM)

    # 右側スペック早見
    rect(s, Inches(6.0), Inches(0.7), Inches(3.8), Emu(380000),
         RGBColor(0x18, 0x08, 0x00))
    tb(s, Inches(6.1), Inches(0.75), Inches(3.6), Emu(320000),
       "基本スペック早見", 10, bold=True, color=C_GOLD, font=FONT_H)

    quick_specs = [
        ("純増",    "約7.0枚/G"),
        ("天井",    "GG間 1,480G"),
        ("GOD揃い", "1/16,384"),
        ("設定6",   "機械割 114.6%"),
        ("設定1",   "機械割 97.2%"),
    ]
    sy = Inches(1.18)
    for j, (k, v) in enumerate(quick_specs):
        rect(s, Inches(6.0), sy, Inches(3.8), Emu(320000),
             RGBColor(0x0C, 0x06, 0x20) if j % 2 == 0 else RGBColor(0x10, 0x08, 0x26))
        tb(s, Inches(6.1), sy + Emu(30000), Inches(1.5), Emu(270000),
           k, 9, color=C_GRAY)
        tb(s, Inches(7.65), sy + Emu(30000), Inches(2.0), Emu(270000),
           v, 10, bold=True, color=C_GOLD2, wrap=False)
        sy += Emu(328000)

    rect(s, Inches(6.0), Inches(2.93), Inches(3.8), Inches(2.27),
         RGBColor(0x0A, 0x05, 0x20))
    rect(s, Inches(6.0), Inches(2.93), Emu(60000), Inches(2.27), C_PURPLE)
    tb(s, Inches(6.2), Inches(3.0), Inches(3.5), Inches(2.1),
       "2002年の4号機・初代から受け継がれた\n"
       "「GOD揃い」の一撃爆発DNA。\n\n"
       "スマスロ最新作「神々の軌跡」で\n"
       "24年のシリーズが新たな高みへ。",
       9, color=C_CREAM)


# ══════════════════════════════════════════════════════════════
#  SLIDE 2: この台のいいところ・悪いところ
# ══════════════════════════════════════════════════════════════
def s_review(prs):
    s = new_slide(prs)
    hdr(s, "この台の正直なところ  ──  知ってから打てばもっと楽しい")

    rect_b(s, Inches(0.2), Inches(0.82), Inches(9.6), Emu(900000),
           RGBColor(0x10, 0x06, 0x25), C_GOLD, 2)
    tb(s, Inches(0.35), Inches(0.88), Inches(9.2), Emu(310000),
       "一言で言うと", 10, bold=True, color=C_GOLD, font=FONT_H)
    tb(s, Inches(0.35), Inches(1.22), Inches(9.2), Emu(470000),
       "純増7.0枚/Gの爆速ATを持ちながら、真の爆発はGOD揃い（1/16,384）に宿る荒波マシン。"
       "Z-GAMEの黄7連鎖が美しい一方、低設定での天井単発地獄は業界屈指の厳しさ。",
       9.5, color=C_CREAM)

    rect_b(s, Inches(0.2), Inches(1.92), Inches(4.6), Inches(1.55),
           RGBColor(0x04, 0x12, 0x08), C_GREEN, 1.5)
    tb(s, Inches(0.3), Inches(1.97), Inches(4.3), Emu(310000),
       "打ってよかった声", 10, bold=True, color=C_GREEN, font=FONT_H)
    tb(s, Inches(0.3), Inches(2.30), Inches(4.3), Emu(1050000),
       "✔ 「純増7枚の爽快感は別格・出玉スピードが気持ちいい」\n"
       "✔ 「GOD揃い時の3,000枚超えは震えた」\n"
       "✔ 「Z-GAMEの黄7連鎖演出が美しい」\n"
       "✔ 「設定6確保できた日は最高のゲーム性」",
       9, color=C_CREAM)

    rect_b(s, Inches(5.1), Inches(1.92), Inches(4.7), Inches(1.55),
           RGBColor(0x18, 0x04, 0x04), C_RED, 1.5)
    tb(s, Inches(5.2), Inches(1.97), Inches(4.4), Emu(310000),
       "知っておくべきリスク", 10, bold=True, color=C_RED, font=FONT_H)
    tb(s, Inches(5.2), Inches(2.30), Inches(4.4), Emu(1050000),
       "✗ 低設定は天井単発を繰り返す「収支マイナス確定機」\n"
       "✗ GOD揃い確率1/16,384（凱旋の倍以上レア）\n"
       "✗ 通常時のゲーム性が単調・虚無感あり\n"
       "✗ ユーザー評価1.74/5.0（DMMぱちタウン 239件）",
       9, color=C_CREAM)

    rect_b(s, Inches(0.2), Inches(3.57), Inches(9.6), Emu(480000),
           RGBColor(0x10, 0x06, 0x20), C_GOLD, 1.2)
    tb(s, Inches(0.35), Inches(3.63), Inches(9.2), Emu(390000),
       "導入 2026年4月20日  /  ミズホ（ユニバーサルグループ）  /  スマスロ（L型）  /  24年続くシリーズ最新作",
       9.5, color=C_GOLD)

    rect(s, Inches(0.2), Inches(4.15), Inches(9.6), Emu(700000),
         RGBColor(0x08, 0x04, 0x16))
    tb(s, Inches(0.35), Inches(4.22), Inches(9.2), Emu(600000),
       "この資料では「通常時の読み方」から「GOD揃いまでの道のり」を順を追って解説します。\n"
       "仕組みを知ってから打つと、ステージの色が変わる意味・Z-GAMEの凄さが分かります。",
       9, color=C_CREAM)
    net_note(s, "※ちょんぼりすた / DMMぱちタウンより")


# ══════════════════════════════════════════════════════════════
#  SLIDE 3: シリーズの歴史
# ══════════════════════════════════════════════════════════════
def s_history(prs):
    s = new_slide(prs)
    hdr(s, "HISTORY  ──  ミリオンゴッドシリーズの歴史と「軌跡」の意味")

    machine_images = ["", "", "", "", "", ""]  # 画像確認後に差し替え

    timeline = [
        ("2002", "初代 ミリオンゴッド",
         "4号機爆裂機の最強格\nGOD揃いで純増10枚×AT500G\n射幸性により2003年強制撤去\n伝説として語り継がれる",
         C_RED, C_CRIMSON),
        ("2011", "神々の系譜",
         "約8年ぶりの5号機復活\nART5セット+ループストック\nGOD揃いでAT量産の設計確立\nシリーズ復活を果たした一作",
         C_GRAY, C_DARKGRAY),
        ("2014", "アナザーゴッドハーデス",
         "初のスピンオフ機種誕生\n冥界テーマで高い人気\nGOD系スピンオフの礎\n凱旋と並ぶシリーズの雄",
         C_GRAY, C_DARKGRAY),
        ("2015", "神々の凱旋",
         "シリーズ最高傑作・評価3.35/5.0\n導入約70,000台の大ヒット\nGOD揃いでAT5セット+25%ループ\nG-STOPで「自力感」を完成",
         C_GOLD, RGBColor(0x12, 0x08, 0x00)),
        ("2023", "ハーデス-槍撃ver.-",
         "6号機ハーデス最終章\n6号機規制内での爆発力追求\nスピンオフシリーズ集大成\n6号機時代の代表格",
         C_GOLD, RGBColor(0x12, 0x08, 0x00)),
        ("2026", "神々の軌跡",
         "純増7.0枚/G スマスロ新章\nZ-GAME黄7連鎖が新機軸\nGOD揃い 1/16,384\n4月20日 系譜の最新到達点",
         C_GOLD2, RGBColor(0x10, 0x05, 0x28)),
    ]

    bw = Inches(1.5)
    bh = Inches(3.6)
    by = Inches(0.85)
    IMG_H_EMU = Emu(800000)
    IMG_W_PX, IMG_H_PX = 210, 120

    for i, ((year, name, desc, col, bg), img_url) in enumerate(zip(timeline, machine_images)):
        bx = Inches(0.2) + i * (bw + Emu(80000))
        is_latest = (i == 5)
        is_star = (i == 3)
        border = C_GOLD2 if is_latest else (C_RED if i == 0 else (C_PURPLE if is_star else C_DARKGRAY))
        rect_b(s, bx, by, bw, bh, bg, border, 2.0 if is_latest or is_star else 1.0)
        rect(s, bx, by, bw, Emu(380000), border)
        tb(s, bx, by + Emu(50000), bw, Emu(290000),
           year, 16, bold=True, color=C_WHITE, align=PP_ALIGN.CENTER, font=FONT_H)
        img = _fetch_pil(img_url, IMG_W_PX, IMG_H_PX)
        add_pic(s, img, bx, by + Emu(390000), bw, IMG_H_EMU)
        tb(s, bx + Emu(60000), by + Emu(1230000), bw - Emu(120000), Emu(350000),
           name, 8.5, bold=True, color=col)
        tb(s, bx + Emu(60000), by + Emu(1570000), bw - Emu(120000), bh - Emu(1630000),
           desc, 7.5, color=C_CREAM if is_latest or is_star else C_LTGRAY)

    rect(s, Inches(0.2), Inches(4.55), Inches(9.6), Emu(430000),
         RGBColor(0x12, 0x06, 0x26))
    tb(s, Inches(0.35), Inches(4.62), Inches(9.2), Emu(370000),
       "2002年初代の「GOD揃い爆発」DNA ── 神々の軌跡は純増7.0枚/G × GOD揃い1/16,384でその系譜を最新技術で昇華させた。だから「軌跡」を名乗れる。",
       9.5, color=C_GOLD)
    net_note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 4: 基本スペック
# ══════════════════════════════════════════════════════════════
def s_spec(prs):
    s = new_slide(prs)
    hdr(s, "SPEC  ──  基本スペック一覧")

    LX = Inches(0.2)
    rect(s, LX, Inches(0.85), Inches(4.7), Emu(380000), C_PURPLE2)
    tb(s, LX + Emu(80000), Inches(0.88), Inches(4.5), Emu(340000),
       "基本スペック", 11, bold=True, color=C_WHITE, font=FONT_H)

    specs = [
        ("メーカー", "ミズホ（ユニバーサルグループ）"),
        ("タイプ",   "スマスロ（L型）AT機"),
        ("導入日",   "2026年4月20日"),
        ("AT純増",   "約7.0枚/G（GG消化中）"),
        ("ベース",   "約30.8G／50枚（設定1）"),
        ("AT初当り", "設定1: 1/533  〜  設定6: 1/295"),
        ("天井",     "GG間 1,480G"),
        ("GOD揃い",  "1/16,384（全設定共通）"),
        ("赤7揃い",  "1/6,900（全設定共通）"),
    ]
    sy = Inches(1.32)
    for j, (k, v) in enumerate(specs):
        bg_c = RGBColor(0x0C, 0x06, 0x20) if j % 2 == 0 else RGBColor(0x10, 0x08, 0x26)
        rect(s, LX, sy, Inches(4.7), Emu(325000), bg_c)
        tb(s, LX + Emu(80000), sy + Emu(25000), Inches(1.4), Emu(280000),
           k, 8.5, color=C_GRAY, wrap=False)
        tb(s, LX + Emu(1580000), sy + Emu(25000), Inches(2.9), Emu(280000),
           v, 9, bold=True, color=C_CREAM)
        sy += Emu(330000)

    RX = Inches(5.2)
    rect(s, RX, Inches(0.85), Inches(4.6), Emu(380000), C_PURPLE2)
    tb(s, RX + Emu(80000), Inches(0.88), Inches(4.4), Emu(340000),
       "設定別 機械割", 11, bold=True, color=C_WHITE, font=FONT_H)

    settings = [
        ("設定1", 97.2,  "97.2%",  C_LTGRAY),
        ("設定2", 99.1,  "99.1%",  C_LTGRAY),
        ("設定3", 102.1, "102.1%", C_LTGRAY),
        ("設定4", 106.9, "106.9%", C_YELLOW),
        ("設定5", 111.7, "111.7%", C_ORANGE),
        ("設定6", 114.6, "114.6%", C_GOLD2),
    ]
    bar_lx   = RX + Emu(700000)
    bar_wmax = Inches(2.0)
    bar_h    = Emu(240000)
    gy = Inches(1.35)
    for lbl, val, val_str, col in settings:
        ratio = (val - 95) / (114.6 - 95)
        rect(s, bar_lx, gy, bar_wmax, bar_h, RGBColor(0x14, 0x0A, 0x28))
        rect(s, bar_lx, gy, int(bar_wmax * ratio), bar_h, col)
        tb(s, RX + Emu(80000), gy + Emu(30000), Emu(580000), Emu(240000),
           lbl, 9, color=C_CREAM, wrap=False)
        tb(s, bar_lx + bar_wmax + Emu(100000), gy + Emu(20000), Emu(900000), Emu(260000),
           val_str, 10, bold=True, color=col, wrap=False)
        gy += Emu(345000)

    rect(s, Inches(0.2), Inches(4.55), Inches(9.6), Emu(450000),
         RGBColor(0x08, 0x04, 0x18))
    tb(s, Inches(0.35), Inches(4.62), Inches(9.2), Emu(390000),
       "設定6の114.6%は現行スマスロ最高水準。設定1の97.2%は機械的に収支マイナス。設定差はAT初当りに集中。偶数設定が安定型・奇数設定が爆裂型の構造。",
       9, color=C_GOLD)
    net_note(s, "※ちょんぼりすた / 一撃より")


# ══════════════════════════════════════════════════════════════
#  SLIDE 5: 全体ゲームフロー図（蛇行2段）
# ══════════════════════════════════════════════════════════════
def s_flow(prs):
    s = new_slide(prs)
    hdr(s, "ゲームフロー全体図  ──  通常時から神の爆発まで")

    BW    = Inches(3.0)
    BH    = Inches(1.2)
    GAP   = Inches(0.2)
    R1Y   = Inches(0.55)
    R2Y   = Inches(2.35)
    BOT_Y = Inches(3.75)
    X1    = Inches(0.2)
    X2    = X1 + BW + GAP
    X3    = X2 + BW + GAP

    row1 = [
        (X1, "通常時 / 前兆",
         "6種ステージでモード管理\nガイア・アテナが前兆のサイン",
         RGBColor(0x10, 0x08, 0x22), C_PURPLE),
        (X2, "GG当選 / Z-ZONE",
         "GG当選確定で0揃い→Z-ZONE突入\n5G間で黄7×5連→ストック獲得\n成功率 約90% ※ネットより",
         RGBColor(0x1C, 0x12, 0x00), C_LIGHTNING),
        (X3, "GG消化  GOD GAME",
         "50G × ストック数 / 純増7.0枚/G\n赤7揃い → SGG突入\nGOD揃い(1/16,384) → PGG突入",
         RGBColor(0x18, 0x08, 0x00), C_GOLD),
    ]
    for x, title, desc, fill, bdr in row1:
        rect_b(s, x, R1Y, BW, BH, fill, bdr, 1.8)
        tb(s, x + Emu(80000), R1Y + Emu(60000), BW - Emu(160000), Emu(340000),
           title, 10, bold=True, color=C_WHITE, font=FONT_H)
        tb(s, x + Emu(80000), R1Y + Emu(420000), BW - Emu(160000), BH - Emu(490000),
           desc, 9, color=C_CREAM)
    for x_left in [X1, X2]:
        arrow_r(s, x_left + BW + Emu(40000), R1Y + BH // 2, GAP - Emu(80000), C_GOLD)

    # 折り返し下向き矢印（SGG右端→真下）
    AT_CX = X3 + BW // 2
    _aw, _ah = Emu(130000), Emu(380000)
    shp_d = s.shapes.add_shape(13, AT_CX - _aw // 2, R1Y + BH + Emu(60000), _aw, _ah)
    shp_d.rotation = 90
    shp_d.fill.solid()
    shp_d.fill.fore_color.rgb = C_GOLD
    shp_d.line.fill.background()

    row2 = [
        (X3, "GGストックループ",
         "GG消化後 ストック残→GG継続\nDループ(80%)なら連荘爆発！",
         RGBColor(0x18, 0x14, 0x00), C_GOLD),
        (X2, "SGG / PGG",
         "赤7揃い → SGG（継続率75%+）\nGOD揃い → PGG（期待3,000枚）\nGG消化中に内部抽選",
         RGBColor(0x10, 0x04, 0x24), C_PURPLE),
        (X1, "G-ZONE  引き戻し",
         "GG/SGG終了後5Gのチャンス\n奇数揃いでGG再突入！\nストックなしでも逆転あり",
         RGBColor(0x06, 0x0C, 0x22), C_BLUE),
    ]
    for x, title, desc, fill, bdr in row2:
        rect_b(s, x, R2Y, BW, BH, fill, bdr, 1.8)
        tb(s, x + Emu(80000), R2Y + Emu(60000), BW - Emu(160000), Emu(340000),
           title, 10, bold=True, color=C_WHITE, font=FONT_H)
        tb(s, x + Emu(80000), R2Y + Emu(420000), BW - Emu(160000), BH - Emu(490000),
           desc, 9, color=C_CREAM)
    for x_right in [X3, X2]:
        _w = GAP - Emu(80000)
        _h = Emu(150000)
        shp = s.shapes.add_shape(13, x_right - GAP + Emu(40000),
                                  R2Y + BH // 2 - _h // 2, _w, _h)
        shp.rotation = 180
        shp.fill.solid()
        shp.fill.fore_color.rgb = C_GOLD
        shp.line.fill.background()

    # ⊓ループバック: G-ZONE → GG当選/Z-ZONE (引き戻し成功)
    LW     = Emu(55000)
    cx_gz  = X1 + BW // 2
    cx_gg  = X2 + BW // 2
    loop_y = R2Y - Emu(350000)
    rect(s, cx_gz - LW // 2, loop_y, LW, R2Y - loop_y, C_BLUE)
    rect(s, cx_gz - LW // 2, loop_y - LW // 2, cx_gg - cx_gz + LW, LW, C_BLUE)
    rect(s, cx_gg - LW // 2, loop_y, LW, R2Y - loop_y, C_BLUE)
    tb(s, cx_gz + Emu(80000), loop_y + Emu(40000), cx_gg - cx_gz - Emu(80000), Emu(250000),
       "↺ G-ZONE成功でGG再突入！", 8, bold=True, color=C_LTBLUE, align=PP_ALIGN.CENTER)

    # 下部バー
    rect_b(s, X1, BOT_Y, Inches(2.5), Emu(900000),
           RGBColor(0x04, 0x08, 0x22), C_BLUE, 1.5)
    tb(s, X1 + Emu(80000), BOT_Y + Emu(80000), Inches(2.2), Emu(780000),
       "天井ルート\nGG間 1,480G\n天井到達でGG保証", 9, color=C_LTBLUE)

    rect(s, Inches(2.95), BOT_Y, Inches(6.85), Emu(900000), RGBColor(0x08, 0x04, 0x18))
    tb(s, Inches(3.1), BOT_Y + Emu(100000), Inches(6.5), Emu(750000),
       "★ 爆発の核心は「GOD揃い→PGG」。GGストック4個+80%Dループで3,000枚超えが現実になる。\n"
       "ただし通常GGの期待枚数は約250〜400枚。連荘なければあっという間に消えていく枚数感に注意。",
       9, color=C_GOLD)
    net_note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 6: 通常時の仕組み
# ══════════════════════════════════════════════════════════════
def s_normal(prs):
    s = new_slide(prs)
    hdr(s, "通常時の仕組み  ──  ステージ × モード × 前兆演出")

    # ステージ6種（左）
    rect_b(s, Inches(0.2), Inches(0.85), Inches(3.2), Inches(2.35),
           C_CARD, C_PURPLE, 1.5)
    tb(s, Inches(0.3), Inches(0.9), Inches(3.0), Emu(330000),
       "① ステージ6種（モード示唆）", 10, bold=True, color=C_PURPLE, font=FONT_H)
    stages = [
        ("アポロン",     "通常ステージ",        C_LTGRAY),
        ("アフロディーテ","通常ステージ",        C_LTGRAY),
        ("アルテミス",   "通常ステージ",        C_LTGRAY),
        ("アクロポリス", "高確示唆",            C_YELLOW),
        ("アテナ",       "前兆示唆",            C_ORANGE),
        ("ガイア",       "GG超高確率・Z-ZONE",  C_GOLD2),
    ]
    sy = Inches(1.3)
    for sname, sdesc, scol in stages:
        tb(s, Inches(0.3),  sy, Inches(1.5), Emu(265000), sname, 8, bold=True, color=scol, wrap=False)
        tb(s, Inches(1.85), sy, Inches(1.4), Emu(265000), sdesc, 8, color=C_CREAM, wrap=False)
        sy += Emu(268000)

    # ループストック（中）
    rect_b(s, Inches(3.55), Inches(0.85), Inches(3.1), Inches(2.35),
           C_CARD, C_GOLD, 1.5)
    tb(s, Inches(3.65), Inches(0.9), Inches(2.9), Emu(330000),
       "② ループストック4種", 10, bold=True, color=C_GOLD, font=FONT_H)
    loops = [
        ("ストックA", "GGループ率  約  1%", C_LTGRAY),
        ("ストックB", "GGループ率  約 25%", C_LTGRAY),
        ("ストックC", "GGループ率  約 50%", C_YELLOW),
        ("ストックD", "GGループ率  約 80%", C_GOLD2),
    ]
    ly = Inches(1.3)
    for lname, ldesc, lcol in loops:
        tb(s, Inches(3.65), ly, Inches(1.3), Emu(290000), lname, 8.5, bold=True, color=lcol, wrap=False)
        tb(s, Inches(4.95), ly, Inches(1.6), Emu(290000), ldesc, 8.5, color=C_CREAM, wrap=False)
        ly += Emu(320000)
    tb(s, Inches(3.65), ly + Emu(20000), Inches(2.9), Emu(280000),
       "GG当選時に内部でストック種別が決定。\nD(80%)を引けるかが爆発規模の全て。", 7.5, color=C_GRAY)

    # 前兆・遅れ演出（右）
    rect_b(s, Inches(6.8), Inches(0.85), Inches(3.0), Inches(2.35),
           C_CARD, C_LIGHTNING, 1.5)
    tb(s, Inches(6.9), Inches(0.9), Inches(2.8), Emu(330000),
       "③ 前兆・遅れ演出", 10, bold=True, color=C_LIGHTNING, font=FONT_H)
    hints = [
        ("「遅れ」演出",    "GG期待度アップ",     C_CREAM),
        ("700/707/7VV",     "超天国示唆",         C_GOLD2),
        ("ブラックホール1回","天国準備以上",       C_YELLOW),
        ("右回転遺跡ST",    "天国以上の期待",     C_ORANGE),
        ("ガイアST移行",    "GG超高確率状態",     C_GOLD2),
        ("光の風（右→左）", "GG前兆以上濃厚",    C_LIGHTNING),
    ]
    hy = Inches(1.3)
    for h_name, h_desc, hcol in hints:
        tb(s, Inches(6.9),  hy, Inches(1.5), Emu(265000), h_name, 8, bold=True, color=hcol, wrap=False)
        tb(s, Inches(8.45), hy, Inches(1.2), Emu(265000), h_desc, 8, color=C_CREAM, wrap=False)
        hy += Emu(265000)

    # 下部まとめ
    rect(s, Inches(0.2), Inches(3.3), Inches(9.6), Emu(40000), C_GOLD)
    rect(s, Inches(0.2), Inches(3.38), Inches(9.6), Emu(640000), RGBColor(0x08, 0x05, 0x18))
    tb(s, Inches(0.35), Inches(3.44), Inches(9.2), Emu(300000),
       "通常時の読み方", 10, bold=True, color=C_GOLD, font=FONT_H)
    tb(s, Inches(0.35), Inches(3.80), Inches(9.2), Emu(260000),
       "ガイア・アテナ・アクロポリスに移行したら好機 → 「遅れ」「光の風」で前兆を察知 → GG当選 → ストック種別で規模が決まる",
       9, color=C_CREAM)

    rect(s, Inches(0.2), Inches(4.62), Inches(9.6), Emu(380000), RGBColor(0x08, 0x05, 0x18))
    tb(s, Inches(0.35), Inches(4.68), Inches(9.2), Emu(330000),
       "★ 内部モードは「表」「裏」の2種類。裏モードはGG当選率が大幅に高い。モードはGG終了時に再抽選される。",
       9, color=C_GOLD)
    net_note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 7: GG → SGG → Z-GAME
# ══════════════════════════════════════════════════════════════
def s_gg(prs):
    s = new_slide(prs)
    hdr(s, "AT詳細  ──  Z-ZONE(GG当選時) → GG消化 → SGG / PGG")

    # 左パネル: Z-ZONE / Z-GAME（GG当選確定時・AT外）
    rect_b(s, Inches(0.2), Inches(0.85), Inches(2.9), Inches(3.3),
           RGBColor(0x1C, 0x16, 0x00), C_LIGHTNING, 2.0)
    tb(s, Inches(0.3), Inches(0.90), Inches(2.6), Emu(330000),
       "Z-ZONE / Z-GAME", 11, bold=True, color=C_LIGHTNING, font=FONT_H)
    tb(s, Inches(0.3), Inches(1.28), Inches(2.6), Inches(2.5),
       "GG当選確定時（AT外）に発生\n「0揃い」で突入濃厚\n\n"
       "【Z-ZONE（5G間）】\n"
       "  5G間で黄7を引くと\n  Z-GAMEへ突入！\n\n"
       "【Z-GAME】\n"
       "  黄7揃うたびGGストック+1\n"
       "  ハズレor青7で終了\n"
       "  5連成功率 約90% ※ネットより",
       9, color=C_CREAM)

    arrow_r(s, Inches(3.2), Inches(2.5), Emu(270000), C_GOLD)

    # 中パネル: GG消化（AT本体）
    rect_b(s, Inches(3.65), Inches(0.85), Inches(3.1), Inches(3.3),
           RGBColor(0x18, 0x0C, 0x00), C_GOLD, 2.5)
    tb(s, Inches(3.75), Inches(0.90), Inches(2.9), Emu(330000),
       "GG  GOD GAME（AT本体）", 11, bold=True, color=C_GOLD2, font=FONT_H)
    tb(s, Inches(3.75), Inches(1.28), Inches(2.9), Inches(2.5),
       "1セット50G / 純増：約7.0枚/G\nストックA〜Dを1個消費して消化\n\n"
       "【消化後の分岐】\n"
       "  ストック残 → GGループ継続\n"
       "  ストックなし → G-ZONE（5G）\n\n"
       "  赤7揃い → SGG突入\n"
       "  GOD揃い → PGG突入",
       9, color=C_CREAM)

    arrow_r(s, Inches(6.85), Inches(2.5), Emu(270000), C_RED)

    # 右パネル: SGG + PGG
    rect_b(s, Inches(7.3), Inches(0.85), Inches(2.5), Inches(3.3),
           RGBColor(0x14, 0x04, 0x22), C_PURPLE, 2.5)
    tb(s, Inches(7.4), Inches(0.90), Inches(2.3), Emu(330000),
       "SGG / PGG", 14, bold=True, color=C_PURPLE, font=FONT_H)
    tb(s, Inches(7.4), Inches(1.28), Inches(2.3), Inches(2.5),
       "【SGG  赤7揃い時】\n"
       "継続率75%以上\n上乗せ連鎖が続く\n\n"
       "【PGG  GOD揃い時】\n"
       "確率1/16,384\nGGストック4個\n+80%Dループ\n期待枚数3,000枚超",
       9, color=C_CREAM)

    rect(s, Inches(0.2), Inches(4.25), Inches(9.6), Emu(750000),
         RGBColor(0x10, 0x06, 0x22))
    rect(s, Inches(0.2), Inches(4.25), Emu(60000), Emu(750000), C_LIGHTNING)
    tb(s, Inches(0.45), Inches(4.30), Inches(9.2), Emu(330000),
       "Z-ZONEはGG当選確定時・AT外に発生。通常のGG消化中（50G中）には存在しない。", 10, bold=True, color=C_LIGHTNING, font=FONT_H)
    tb(s, Inches(0.45), Inches(4.65), Inches(9.2), Emu(330000),
       "GG当選→Z-ZONE/Z-GAMEでストックを積み上げ→GG消化→赤7/GOD揃いでSGG/PGGへ。この連鎖が爆発の全て。",
       9.5, color=C_CREAM)
    net_note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 8: GOD揃い → PGG
# ══════════════════════════════════════════════════════════════
def s_pgg(prs):
    s = new_slide(prs)
    hdr(s, "クライマックス  ──  GOD揃い（1/16,384）→ PGG", color=C_GOLD2)

    rect_b(s, Inches(0.2), Inches(0.85), Inches(2.9), Inches(3.3),
           RGBColor(0x18, 0x0A, 0x00), C_GOD, 2.0)
    tb(s, Inches(0.3), Inches(0.90), Inches(2.6), Emu(330000),
       "GOD揃い", 14, bold=True, color=C_GOLD2, font=FONT_H)
    tb(s, Inches(0.3), Inches(1.28), Inches(2.6), Inches(2.5),
       "確率：1/16,384\n（全設定共通）\n\n"
       "GG消化中に\nGOD絵柄が揃えば\n\n"
       "PREMIUM GOD GAME\n（PGG）へ突入！\n\n"
       "★ 神々の凱旋(1/8,192)の\n   約2倍のレア度\n   ＝ 最高の瞬間",
       9, color=C_CREAM)

    arrow_r(s, Inches(3.2), Inches(2.5), Emu(270000), C_GOD)

    rect_b(s, Inches(3.65), Inches(0.85), Inches(3.1), Inches(3.3),
           RGBColor(0x20, 0x12, 0x00), C_GOLD2, 2.5)
    tb(s, Inches(3.75), Inches(0.90), Inches(2.9), Emu(330000),
       "PGG  PREMIUM GOD GAME", 11, bold=True, color=C_GOLD2, font=FONT_H)
    tb(s, Inches(3.75), Inches(1.28), Inches(2.9), Inches(2.5),
       "GOD揃い時の最上位AT。\n\n"
       "【初期特典（確定）】\n"
       "  GGストック 4個確定\n"
       "  ストックD(80%)確定\n\n"
       "【期待枚数】\n"
       "  3,000枚以上\n\n"
       "【消化中】\n"
       "  GG × 4セット以上ループ\n"
       "  + さらなるGOD揃いの夢",
       9, color=C_CREAM)

    arrow_r(s, Inches(6.85), Inches(2.5), Emu(270000), C_GOLD2)

    rect_b(s, Inches(7.3), Inches(0.85), Inches(2.5), Inches(3.3),
           RGBColor(0x22, 0x18, 0x00), C_GOLD2, 2.5)
    tb(s, Inches(7.4), Inches(0.90), Inches(2.3), Emu(330000),
       "GGループ", 14, bold=True, color=C_GOLD2, font=FONT_H)
    tb(s, Inches(7.4), Inches(1.28), Inches(2.3), Inches(2.5),
       "GGを4セット以上\n連続消化！\n\n"
       "1GG ≈ 350枚\n× 4回以上\n\n"
       "★ 4連で\n   約1,400枚\n\n"
       "★ GOD再揃いで\n   さらに倍増！\n\n"
       "最大爆発時\n3,000枚超え",
       9, color=C_CREAM)

    rect(s, Inches(0.2), Inches(4.25), Inches(9.6), Emu(750000),
         RGBColor(0x18, 0x10, 0x00))
    rect(s, Inches(0.2), Inches(4.25), Emu(60000), Emu(750000), C_GOLD2)
    tb(s, Inches(0.45), Inches(4.30), Inches(9.2), Emu(330000),
       "GOD揃いが全ての頂点", 10, bold=True, color=C_GOLD2, font=FONT_H)
    tb(s, Inches(0.45), Inches(4.65), Inches(9.2), Emu(330000),
       "PGGはGGストック4個+D(80%)確定でスタート。通常ATの8倍以上の出玉が保証される「神の時間」。",
       9.5, color=C_CREAM)
    net_note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 9: 設定示唆・設定差
# ══════════════════════════════════════════════════════════════
def s_setting(prs):
    s = new_slide(prs)
    hdr(s, "設定示唆 & 設定差  ──  高設定を見抜く判別ポイント")

    LX = Inches(0.2)
    rect_b(s, LX, Inches(0.85), Inches(4.7), Inches(3.65),
           C_CARD, C_GOLD, 1.5)
    tb(s, LX + Emu(80000), Inches(0.90), Inches(4.4), Emu(330000),
       "設定示唆演出", 11, bold=True, color=C_GOLD, font=FONT_H)

    hints = [
        ("ユニバプレート色（GG終了後）",
         "銅→設定2以上 / 銀→設定3以上\n金→設定4以上 / 虹→設定6濃厚！", C_GOLD2),
        ("青7連続AT抽選（最大の設定差）",
         "設定1: 3連で1.2%  /  設定2: 10.2%\n高設定ほど青7連続当選が頻発する", C_PURPLE),
        ("GG終了時のキャラボイス",
         "特定キャラのセリフが設定を示唆\n女神系ボイスは高設定ほど多い傾向", C_LTBLUE),
        ("GG後のステージ移行",
         "即ガイアステージ移行は高設定ほど多い\nアクロポリス継続も好意味", C_ORANGE),
    ]
    hy = Inches(1.3)
    for h_name, h_desc, h_col in hints:
        rect(s, LX + Emu(80000), hy, Inches(4.4), Emu(50000), h_col)
        tb(s, LX + Emu(80000), hy + Emu(60000), Inches(4.4), Emu(270000),
           h_name, 9, bold=True, color=h_col)
        tb(s, LX + Emu(80000), hy + Emu(320000), Inches(4.4), Emu(360000),
           h_desc, 8.5, color=C_CREAM)
        hy += Emu(750000)

    RX = Inches(5.2)
    rect(s, RX, Inches(0.85), Inches(4.6), Emu(380000), C_PURPLE2)
    tb(s, RX + Emu(80000), Inches(0.90), Inches(4.4), Emu(340000),
       "設定差まとめ", 11, bold=True, color=C_WHITE, font=FONT_H)

    cols = ["設定", "AT初当り", "機械割"]
    cxs  = [RX + Emu(50000), RX + Emu(700000), RX + Emu(2400000)]
    cws  = [Emu(600000), Emu(1650000), Emu(1200000)]
    for c, cx, cw in zip(cols, cxs, cws):
        tb(s, cx, Inches(1.3), cw, Emu(320000),
           c, 9, bold=True, color=C_GOLD, align=PP_ALIGN.CENTER)

    setting_data = [
        ("1", "1/533", "97.2%",  C_LTGRAY),
        ("2", "1/420", "99.1%",  C_LTGRAY),
        ("3", "1/496", "102.1%", C_LTGRAY),
        ("4", "1/338", "106.9%", C_YELLOW),
        ("5", "1/455", "111.7%", C_ORANGE),
        ("6", "1/295", "114.6%", C_GOLD2),
    ]
    ry = Inches(1.65)
    for sd, at_p, mw, col in setting_data:
        bg_c = RGBColor(0x0C, 0x06, 0x1E) if int(sd) % 2 == 1 else RGBColor(0x10, 0x08, 0x24)
        rect(s, RX, ry, Inches(4.6), Emu(330000), bg_c)
        for val, cx, cw in zip([sd, at_p, mw], cxs, cws):
            c = col if val == mw else (C_GOLD2 if val == sd else C_CREAM)
            tb(s, cx, ry + Emu(30000), cw, Emu(280000),
               val, 9, bold=(val == mw), color=c, align=PP_ALIGN.CENTER, wrap=False)
        ry += Emu(335000)

    rect(s, Inches(0.2), Inches(4.55), Inches(9.6), Emu(450000),
         RGBColor(0x08, 0x04, 0x18))
    tb(s, Inches(0.35), Inches(4.62), Inches(9.2), Emu(390000),
       "奇数設定(1/3/5)はAT初当りが粗め・偶数設定(2/4/6)が安定型。設定6の114.6%は業界最高水準。ユニバプレートの虹を累積して総合判断するのが基本。",
       9, color=C_GOLD)
    net_note(s, "※ちょんぼりすた / 一撃より")


# ══════════════════════════════════════════════════════════════
#  SLIDE 10: まとめ
# ══════════════════════════════════════════════════════════════
def s_matome(prs):
    s = new_slide(prs)
    hdr(s, "まとめ  ──  神々の軌跡で覚えておくべき3つのこと", color=C_GOLD2)

    rect_b(s, Inches(0.2), Inches(0.82), Inches(9.6), Emu(760000),
           RGBColor(0x14, 0x08, 0x00), C_GOLD2, 2)
    tb(s, Inches(0.35), Inches(0.9), Inches(9.2), Emu(620000),
       "「GOD揃い 1/16,384 の一撃が全てを変える。純増7.0枚/Gの爆速で神々の軌跡を刻め。」",
       13, bold=True, italic=True, color=C_GOLD2, font=FONT_H)

    points = [
        ("① GGで止まるな",
         "通常GGは約250〜400枚の通過点。\n"
         "SGG→Z-GAMEを連鎖させて\nGGストックを積み上げるのが本番。",
         C_PURPLE),
        ("② GOD揃いが全ての頂点",
         "PGG突入でGGストック4個+80%確定。\n"
         "3,000枚超えは現実になる。\n"
         "1/16,384 ── その瞬間を待て。",
         C_GOD),
        ("③ 設定が入る日を選ぶ",
         "設定6は114.6%・業界最高水準。\n"
         "設定1は97.2%・天井単発の地獄。\n"
         "ユニバプレート虹を積み上げ高設定を狙え。",
         C_GOLD),
    ]
    bx = Inches(0.2)
    bw = Inches(3.1)
    for title, body, col in points:
        rect_b(s, bx, Inches(1.77), bw, Inches(2.35), C_CARD, col, 2.0)
        rect(s, bx, Inches(1.77), bw, Emu(380000), col)
        tb(s, bx + Emu(80000), Inches(1.83), bw - Emu(160000), Emu(290000),
           title, 11, bold=True, color=C_BG, font=FONT_H)
        tb(s, bx + Emu(80000), Inches(2.26), bw - Emu(160000), Inches(1.7),
           body, 9.5, color=C_CREAM)
        bx += bw + Emu(180000)

    rect(s, Inches(0.2), Inches(4.22), Inches(9.6), Emu(680000),
         RGBColor(0x08, 0x04, 0x18))
    rect(s, Inches(0.2), Inches(4.22), Emu(60000), Emu(680000), C_GOLD2)
    tb(s, Inches(0.45), Inches(4.28), Inches(9.1), Emu(300000),
       "2002年初代から受け継がれた「GOD揃い爆発」のDNA", 10, bold=True, color=C_GOLD2, font=FONT_H)
    tb(s, Inches(0.45), Inches(4.62), Inches(9.1), Emu(300000),
       "ミリオンゴッド神々の軌跡はそれを「純増7.0枚×Z-GAME連鎖×GOD揃いPGG」として昇華させたシリーズの新たな到達点。神の時間を、ぜひ体験してください。",
       9.5, color=C_CREAM)


# ══════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════
def main():
    print("=" * 55)
    print("  スマスロ ミリオンゴッド-神々の軌跡- ジェネレーター")
    print("=" * 55)

    prs = Presentation()
    prs.slide_width  = SLIDE_W
    prs.slide_height = SLIDE_H

    print("\n📊 スライド生成中...")
    s_title(prs);   print("   1/10 タイトル")
    s_review(prs);  print("   2/10 この台のいいところ・悪いところ")
    s_history(prs); print("   3/10 シリーズの歴史")
    s_spec(prs);    print("   4/10 基本スペック")
    s_flow(prs);    print("   5/10 全体ゲームフロー図")
    s_normal(prs);  print("   6/10 通常時の仕組み")
    s_gg(prs);      print("   7/10 GG → SGG → Z-GAME")
    s_pgg(prs);     print("   8/10 GOD揃い → PGG")
    s_setting(prs); print("   9/10 設定示唆・設定差")
    s_matome(prs);  print("  10/10 まとめ")

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    prs.save(OUT_PATH)
    print(f"\n✅ 保存完了: {OUT_PATH}")


if __name__ == "__main__":
    main()
