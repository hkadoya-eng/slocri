"""
スマスロ新機種企画提案 「世代 ―継承の炎―」 PowerPointジェネレーター
出力: proposals/sedai_proposal_v1.pptx
"""
import io, os, sys
from PIL import Image as PILImage, ImageDraw
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

OUT_PATH = os.path.join(os.path.dirname(__file__), "proposals", "sedai_proposal_v1.pptx")

# ── カラーパレット（炎・帝国・継承テーマ）────────────────────────
C_BG      = RGBColor(0x06, 0x04, 0x14)
C_CARD    = RGBColor(0x10, 0x0A, 0x22)
C_GOLD    = RGBColor(0xC9, 0x9A, 0x1E)
C_GOLD2   = RGBColor(0xFF, 0xD7, 0x00)
C_FLAME   = RGBColor(0xFF, 0x6B, 0x1A)
C_FLAME2  = RGBColor(0xFF, 0xA0, 0x50)
C_CRIMSON = RGBColor(0xA8, 0x1C, 0x1C)
C_RED     = RGBColor(0xDC, 0x26, 0x26)
C_GREEN   = RGBColor(0x40, 0xA0, 0x40)
C_STEEL   = RGBColor(0x4A, 0x7A, 0xA8)
C_LTBLUE  = RGBColor(0x93, 0xC5, 0xFD)
C_CREAM   = RGBColor(0xF5, 0xE6, 0xC8)
C_WHITE   = RGBColor(0xFF, 0xFF, 0xFF)
C_LTGRAY  = RGBColor(0xBB, 0xBB, 0xBB)
C_GRAY    = RGBColor(0x88, 0x88, 0x88)
C_YELLOW  = RGBColor(0xFF, 0xE0, 0x60)
C_ORANGE  = RGBColor(0xFF, 0xA0, 0x30)

FONT_H = "游明朝"
FONT_B = "メイリオ"


# ── 背景生成 ──────────────────────────────────────────────────
def make_bg(w=1280, h=720):
    img = PILImage.new("RGB", (w, h), (6, 4, 20))
    draw = ImageDraw.Draw(img)
    for i in range(0, w + h, 50):
        draw.line([(i, 0), (0, i)], fill=(20, 12, 45), width=1)
    for y in range(h - 120, h):
        t = (y - (h - 120)) / 120
        r = int(30 * t)
        draw.line([(0, y), (w, y)], fill=(r, int(r * 0.3), 0))
    buf = io.BytesIO()
    img.save(buf, "PNG")
    buf.seek(0)
    return buf


# ── ヘルパー関数 ──────────────────────────────────────────────
def new_slide(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    bg = make_bg()
    pic = s.shapes.add_picture(bg, 0, 0, Inches(10), Inches(5.625))
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
    run.font.name = font or FONT_B
    if color:
        run.font.color.rgb = color

def rect(slide, x, y, w, h, color):
    shp = slide.shapes.add_shape(1, x, y, w, h)
    shp.fill.solid()
    shp.fill.fore_color.rgb = color
    shp.line.fill.background()
    return shp

def rect_b(slide, x, y, w, h, fill, border, bw=1.5):
    shp = slide.shapes.add_shape(1, x, y, w, h)
    shp.fill.solid()
    shp.fill.fore_color.rgb = fill
    shp.line.color.rgb = border
    shp.line.width = Pt(bw)
    return shp

def arrow_r(slide, x, y, w, color):
    h = Emu(150000)
    shp = slide.shapes.add_shape(13, x, y - h // 2, w, h)
    shp.fill.solid()
    shp.fill.fore_color.rgb = color
    shp.line.fill.background()

def hdr(slide, text):
    rect(slide, Inches(0.15), Inches(0.08), Inches(9.7), Emu(420000),
         RGBColor(0x12, 0x08, 0x28))
    rect(slide, Inches(0.15), Inches(0.08), Emu(60000), Emu(420000), C_FLAME)
    tb(slide, Inches(0.4), Inches(0.1), Inches(9.2), Emu(380000),
       text, 12, bold=True, color=C_GOLD, font=FONT_H)

def net_note(slide, text="※ネットより"):
    tb(slide, Inches(8.5), Inches(5.38), Inches(1.4), Emu(200000),
       text, 7, color=C_GRAY, align=PP_ALIGN.RIGHT)


# ══════════════════════════════════════════════════════════════
#  SLIDE 1: タイトル
# ══════════════════════════════════════════════════════════════
def s_title(prs):
    s = new_slide(prs)
    rect(s, Inches(0), Inches(1.82), Inches(10), Emu(8000), C_FLAME)
    rect(s, Inches(0), Inches(3.62), Inches(10), Emu(8000), C_FLAME)

    tb(s, Inches(0.5), Inches(0.28), Inches(9), Emu(380000),
       "新機種企画提案", 14, color=C_FLAME2, font=FONT_H, align=PP_ALIGN.CENTER)
    tb(s, Inches(0.3), Inches(0.75), Inches(9.4), Emu(950000),
       "世代", 72, bold=True, color=C_GOLD2, font=FONT_H, align=PP_ALIGN.CENTER)
    tb(s, Inches(0.3), Inches(1.56), Inches(9.4), Emu(270000),
       "―  継 承 の 炎  ―", 18, bold=True, color=C_FLAME, font=FONT_H, align=PP_ALIGN.CENTER)

    rect(s, Inches(1.5), Inches(1.98), Inches(7), Emu(560000), RGBColor(0x14, 0x08, 0x2C))
    tb(s, Inches(1.6), Inches(2.03), Inches(6.8), Emu(500000),
       "「 一人では届かない。でも、意志は続く。 」",
       16, bold=True, color=C_CREAM, font=FONT_H, align=PP_ALIGN.CENTER)

    tb(s, Inches(0.5), Inches(3.78), Inches(4.3), Emu(360000),
       "タイプ：スマスロ（L型）\n純増：4.0枚/G（AT）/ 8.0枚/G（決戦AT）",
       10, color=C_LTGRAY)
    tb(s, Inches(5.2), Inches(3.78), Inches(4.5), Emu(360000),
       "ターゲット：30〜50代 RPG・ロールプレイング世代\nMY目標：約3,500枚（ミドル）",
       10, color=C_LTGRAY)

    tb(s, Inches(7.8), Inches(5.2), Inches(2.0), Emu(300000),
       "v1.0  2026.05", 8, color=C_GRAY, align=PP_ALIGN.RIGHT)


# ══════════════════════════════════════════════════════════════
#  SLIDE 2: コアコンセプト
# ══════════════════════════════════════════════════════════════
def s_concept(prs):
    s = new_slide(prs)
    hdr(s, "コアコンセプト  ──  なぜ「世代」なのか")

    pillars = [
        (Inches(0.2),
         "感情設計",
         "「1回のATが1世代」\n世代を重ねるほど\n物語が深まる\n\nRPGの「プレイするほど\n世界が豊かになる」\n感覚をパチスロへ\n\n負けても\n「次の世代へ繋いだ」",
         RGBColor(0x18, 0x0A, 0x00), C_FLAME),
        (Inches(3.55),
         "継承の儀（業界初）",
         "AT消化中に次の世代へ\n何を引き継ぐかを選ぶ\n\n技の継承 / 絆の継承\n力の継承\n\nプレイヤーが\n物語を選ぶ台\n\n2人と同じ体験がない",
         RGBColor(0x04, 0x0A, 0x1C), C_STEEL),
        (Inches(6.9),
         "宿敵討伐（1セッション完結）",
         "強大な宿敵に\n1セッション内で挑む\n\nATを重ねるほど\n宿敵が弱体化する\n\n「今日が決戦だ」\nという感動\n\nカード不要・完全完結",
         RGBColor(0x1C, 0x04, 0x04), C_CRIMSON),
    ]
    for x, title, desc, fill, bdr in pillars:
        rect_b(s, x, Inches(0.85), Inches(3.0), Inches(3.45), fill, bdr, 2.0)
        tb(s, x + Emu(100000), Inches(0.92), Inches(2.8), Emu(370000),
           title, 11, bold=True, color=bdr, font=FONT_H)
        tb(s, x + Emu(100000), Inches(1.38), Inches(2.8), Inches(2.7),
           desc, 9, color=C_CREAM)

    rect(s, Inches(0.2), Inches(4.40), Inches(9.6), Emu(40000), C_GOLD)
    rect(s, Inches(0.2), Inches(4.48), Inches(9.6), Emu(580000), RGBColor(0x0E, 0x08, 0x1E))
    tb(s, Inches(0.35), Inches(4.53), Inches(9.2), Emu(250000),
       "祟り神の章（感情逆転）→ ミリゴ・吉宗（実機メカニクス学習）→ 世代（継承×積み上げ×選択）",
       9, bold=True, color=C_GOLD)
    tb(s, Inches(0.35), Inches(4.80), Inches(9.2), Emu(250000),
       "タイムリープ（Re:ゼロ・まどマギ）は既存。継承型は業界初。負けも「次世代への蓄積」に変換する唯一の感情設計。",
       8.5, color=C_CREAM)


# ══════════════════════════════════════════════════════════════
#  SLIDE 3: 業界初ポイント
# ══════════════════════════════════════════════════════════════
def s_first(prs):
    s = new_slide(prs)
    hdr(s, "業界初ポイント  ──  既存機種にない3つの設計軸")

    firsts = [
        ("①", "世代交代ループ",
         "ATループ = 世代交代の演出\n\nATが終わるたびに\n「継承演出」が流れ\n次の世代が立ち上がる\n\n「また負けた」ではなく\n「次の世代へ繋いだ」\nになる感情設計\n\n✓ 負けをポジティブに転換",
         C_FLAME, RGBColor(0x1C, 0x0C, 0x00)),
        ("②", "継承の儀",
         "AT消化中に選択する\nアクティブシステム\n\n「技の継承」\n「絆の継承」\n「力の継承」の3択\n\n選んだ内容で\n次世代ATの性能が変わる\n\n✓ プレイヤーが物語を作る",
         C_STEEL, RGBColor(0x04, 0x0C, 0x1E)),
        ("③", "宿敵弱体化ゲージ",
         "1セッション内で\nATを重ねるほど\n宿敵が弱体化する\n\nゲージMAX\n＋皇帝の力\n＋継承コンプリート\nで「決戦AT」解放\n\n✓ 長期遊技の目標が明確",
         C_CRIMSON, RGBColor(0x1C, 0x04, 0x04)),
    ]
    xs = [Inches(0.2), Inches(3.55), Inches(6.9)]
    for (num, title, desc, col, fill), x in zip(firsts, xs):
        rect_b(s, x, Inches(0.82), Inches(3.0), Inches(3.6), fill, col, 2.0)
        rect(s, x + Emu(80000), Inches(0.88), Emu(500000), Emu(500000), col)
        tb(s, x + Emu(80000), Inches(0.88), Emu(500000), Emu(500000),
           num, 16, bold=True, color=C_WHITE, font=FONT_H, align=PP_ALIGN.CENTER)
        tb(s, x + Emu(680000), Inches(0.92), Inches(2.2), Emu(400000),
           title, 11, bold=True, color=col, font=FONT_H)
        tb(s, x + Emu(100000), Inches(1.42), Inches(2.8), Inches(2.9),
           desc, 8.5, color=C_CREAM)

    rect(s, Inches(0.2), Inches(4.52), Inches(9.6), Emu(600000), RGBColor(0x0C, 0x06, 0x1E))
    rect(s, Inches(0.2), Inches(4.52), Emu(60000), Emu(600000), C_GOLD)
    tb(s, Inches(0.45), Inches(4.57), Inches(9.2), Emu(260000),
       "ミリゴZ-ZONE → 「継承の儀」へ昇華  /  吉宗1G連 → 「英雄の残照」へ昇華",
       9, bold=True, color=C_GOLD, font=FONT_H)
    tb(s, Inches(0.45), Inches(4.86), Inches(9.2), Emu(260000),
       "既存機種のメカニクスを感情設計に統合。「選ぶ楽しさ」「積み上げる喜び」「決着の感動」を1セッションで体験させる。",
       8.5, color=C_CREAM)


# ══════════════════════════════════════════════════════════════
#  SLIDE 4: ゲームフロー全体図
# ══════════════════════════════════════════════════════════════
def s_flow(prs):
    s = new_slide(prs)
    hdr(s, "ゲームフロー全体図  ──  1セッションで世代が積み重なる")

    BW  = Inches(3.0)
    BH  = Inches(1.2)
    GAP = Inches(0.2)
    R1Y = Inches(0.55)
    R2Y = Inches(2.35)
    X1  = Inches(0.2)
    X2  = X1 + BW + GAP
    X3  = X2 + BW + GAP

    row1 = [
        (X1, "通常時 / 前兆",
         "4ステージ（荒野→城下町→王都→黄金）\n周期100GでCZ到来",
         RGBColor(0x0A, 0x06, 0x1C), C_STEEL),
        (X2, "CZ「英雄の試練」",
         "3Gバトル / CZ成功でAT突入\n失敗でも継承ポイント蓄積",
         RGBColor(0x18, 0x06, 0x06), C_CRIMSON),
        (X3, "世代AT（1世代50G）",
         "純増4.0枚/G / ストック種別4種\n赤7揃い → 「継承の儀」発動！",
         RGBColor(0x18, 0x0C, 0x00), C_GOLD),
    ]
    for x, title, desc, fill, bdr in row1:
        rect_b(s, x, R1Y, BW, BH, fill, bdr, 1.8)
        tb(s, x + Emu(80000), R1Y + Emu(60000), BW - Emu(160000), Emu(340000),
           title, 10, bold=True, color=C_WHITE, font=FONT_H)
        tb(s, x + Emu(80000), R1Y + Emu(420000), BW - Emu(160000), BH - Emu(490000),
           desc, 9, color=C_CREAM)
    for x_l in [X1, X2]:
        arrow_r(s, x_l + BW + Emu(40000), R1Y + BH // 2, GAP - Emu(80000), C_GOLD)

    # 折り返し下向き矢印（X3中央）
    AT_CX = X3 + BW // 2
    _aw, _ah = Emu(130000), Emu(380000)
    shp_d = s.shapes.add_shape(13, AT_CX - _aw // 2, R1Y + BH + Emu(60000), _aw, _ah)
    shp_d.rotation = 90
    shp_d.fill.solid()
    shp_d.fill.fore_color.rgb = C_GOLD
    shp_d.line.fill.background()

    row2 = [
        (X3, "世代ループ（継承の儀）",
         "世代が重なるほど台が強化\nストック残 → 次世代へ継続！",
         RGBColor(0x18, 0x0C, 0x00), C_GOLD),
        (X2, "英雄連合（3世代以上）",
         "複数世代の英雄が集結\n継続率75% / 純増6.5枚/G",
         RGBColor(0x04, 0x14, 0x04), C_GREEN),
        (X1, "英雄の残照（引き戻し）",
         "AT終了後5Gのラストチャンス\n奇数揃いで世代AT再突入！",
         RGBColor(0x06, 0x0A, 0x1C), C_STEEL),
    ]
    for x, title, desc, fill, bdr in row2:
        rect_b(s, x, R2Y, BW, BH, fill, bdr, 1.8)
        tb(s, x + Emu(80000), R2Y + Emu(60000), BW - Emu(160000), Emu(340000),
           title, 10, bold=True, color=C_WHITE, font=FONT_H)
        tb(s, x + Emu(80000), R2Y + Emu(420000), BW - Emu(160000), BH - Emu(490000),
           desc, 9, color=C_CREAM)
    for x_r in [X3, X2]:
        _w = GAP - Emu(80000)
        _h = Emu(150000)
        shp = s.shapes.add_shape(13, x_r - GAP + Emu(40000),
                                  R2Y + BH // 2 - _h // 2, _w, _h)
        shp.rotation = 180
        shp.fill.solid()
        shp.fill.fore_color.rgb = C_FLAME
        shp.line.fill.background()

    # ⊓ループバック: 世代ループ(X3 row2) → 世代AT(X3 row1)
    LW     = Emu(55000)
    lx_l   = X3 + Emu(200000)
    lx_r   = X3 + Emu(620000)
    loop_y = R2Y - Emu(350000)
    rect(s, lx_l - LW // 2, loop_y, LW, R2Y - loop_y, C_GOLD)
    rect(s, lx_l - LW // 2, loop_y - LW // 2, lx_r - lx_l + LW, LW, C_GOLD)
    rect(s, lx_r - LW // 2, loop_y, LW, R2Y - loop_y, C_GOLD)
    tb(s, lx_l + Emu(60000), loop_y + Emu(40000),
       lx_r - lx_l - Emu(60000), Emu(260000),
       "↺ ループ！", 8, bold=True, color=C_GOLD2, align=PP_ALIGN.CENTER)

    # 下部: 決戦AT
    BOT_Y = Inches(3.75)
    rect_b(s, X1, BOT_Y, Inches(2.9), Emu(900000),
           RGBColor(0x20, 0x04, 0x04), C_CRIMSON, 2.0)
    tb(s, X1 + Emu(80000), BOT_Y + Emu(60000), Inches(2.6), Emu(360000),
       "決戦AT ―世代の決着―", 10, bold=True, color=C_CRIMSON, font=FONT_H)
    tb(s, X1 + Emu(80000), BOT_Y + Emu(470000), Inches(2.6), Emu(390000),
       "宿敵弱体化MAX\n＋皇帝の力＋継承コンプリート\n純増8.0枚/G", 8.5, color=C_CREAM)

    rect(s, Inches(3.1), BOT_Y, Inches(6.7), Emu(900000), RGBColor(0x10, 0x06, 0x1C))
    tb(s, Inches(3.25), BOT_Y + Emu(80000), Inches(6.3), Emu(380000),
       "★ 歴代全世代の英雄が集結する演出。前後のAT積み上げ込みでMY約3,500枚。",
       9, bold=True, color=C_FLAME2)
    tb(s, Inches(3.25), BOT_Y + Emu(480000), Inches(6.3), Emu(380000),
       "「自分が今日育てた世代が、ここで結実する」——1セッションの物語が完結する瞬間。",
       9, color=C_CREAM)


# ══════════════════════════════════════════════════════════════
#  SLIDE 5: 通常時の仕組み
# ══════════════════════════════════════════════════════════════
def s_normal(prs):
    s = new_slide(prs)
    hdr(s, "通常時の仕組み  ──  ステージ × 周期CZ × 継承ポイント")

    rect_b(s, Inches(0.2), Inches(0.85), Inches(3.1), Inches(2.45),
           C_CARD, C_STEEL, 1.5)
    tb(s, Inches(0.3), Inches(0.90), Inches(2.9), Emu(320000),
       "① ステージ4種（遊技数連動）", 10, bold=True, color=C_STEEL, font=FONT_H)
    stages = [
        ("荒野",     "通常ステージ",         C_LTGRAY),
        ("城下町",   "高確示唆",             C_YELLOW),
        ("王都",     "前兆・CZ高確率",       C_ORANGE),
        ("黄金都市", "AT超高確率状態",       C_GOLD2),
    ]
    sy = Inches(1.33)
    for sname, sdesc, scol in stages:
        tb(s, Inches(0.3),  sy, Inches(1.3),  Emu(268000), sname, 9, bold=True, color=scol, wrap=False)
        tb(s, Inches(1.65), sy, Inches(1.55), Emu(268000), sdesc, 9, color=C_CREAM, wrap=False)
        sy += Emu(270000)

    rect_b(s, Inches(3.45), Inches(0.85), Inches(3.1), Inches(2.45),
           C_CARD, C_CRIMSON, 1.5)
    tb(s, Inches(3.55), Inches(0.90), Inches(2.9), Emu(320000),
       "② 周期CZ「英雄の試練」", 10, bold=True, color=C_CRIMSON, font=FONT_H)
    czs = [
        ("周期",   "100G毎に規則的に到来",   C_CREAM),
        ("バトル", "3G間の試練演出",         C_LTGRAY),
        ("成功",   "世代AT突入",             C_GOLD2),
        ("失敗",   "継承ポイント＋10獲得",   C_FLAME2),
    ]
    cy = Inches(1.33)
    for label, desc, col in czs:
        tb(s, Inches(3.55), cy, Inches(1.1),  Emu(268000), label, 9, bold=True, color=col, wrap=False)
        tb(s, Inches(4.70), cy, Inches(1.75), Emu(268000), desc,  9, color=C_CREAM, wrap=False)
        cy += Emu(270000)

    rect_b(s, Inches(6.7), Inches(0.85), Inches(3.1), Inches(2.45),
           C_CARD, C_GOLD, 1.5)
    tb(s, Inches(6.8), Inches(0.90), Inches(2.9), Emu(320000),
       "③ 継承ポイント", 10, bold=True, color=C_GOLD, font=FONT_H)
    pts = [
        ("獲得方法",    "CZ失敗・リプレイ等",          C_CREAM),
        ("50pt到達",   "天井100G短縮（600→500G）",   C_YELLOW),
        ("100pt到達",  "天井200G短縮（400G）",        C_ORANGE),
        ("200pt到達",  "CZ突破率大幅UP",              C_GOLD2),
    ]
    py = Inches(1.33)
    for label, desc, col in pts:
        tb(s, Inches(6.8),  py, Inches(1.2),  Emu(268000), label, 9, bold=True, color=col,   wrap=False)
        tb(s, Inches(8.05), py, Inches(1.65), Emu(268000), desc,  9, color=C_CREAM, wrap=False)
        py += Emu(270000)

    rect(s, Inches(0.2), Inches(3.40), Inches(9.6), Emu(40000), C_FLAME)
    rect(s, Inches(0.2), Inches(3.48), Inches(9.6), Emu(620000), RGBColor(0x0C, 0x06, 0x1E))
    tb(s, Inches(0.35), Inches(3.53), Inches(9.2), Emu(260000),
       "通常時の読み方", 10, bold=True, color=C_FLAME, font=FONT_H)
    tb(s, Inches(0.35), Inches(3.86), Inches(9.2), Emu(260000),
       "ステージが「王都」以上になったら好機。継承ポイントを積みながらCZを迎える。失敗しても「育てている」感覚が大事。",
       9, color=C_CREAM)

    rect(s, Inches(0.2), Inches(4.18), Inches(9.6), Emu(380000), RGBColor(0x0C, 0x06, 0x1E))
    tb(s, Inches(0.35), Inches(4.22), Inches(9.2), Emu(330000),
       "★ 周期設計は吉宗の規則的CZ設計を参考。「いつCZが来るか分かる」ストレスの少ない通常時設計。",
       9, color=C_GOLD)
    net_note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 6: 世代AT・継承の儀
# ══════════════════════════════════════════════════════════════
def s_seidae_at(prs):
    s = new_slide(prs)
    hdr(s, "世代AT・継承の儀  ──  選ぶことで物語が変わる")

    rect_b(s, Inches(0.2), Inches(0.85), Inches(3.0), Inches(3.45),
           RGBColor(0x18, 0x0C, 0x00), C_GOLD, 2.0)
    tb(s, Inches(0.3), Inches(0.90), Inches(2.8), Emu(320000),
       "世代AT", 14, bold=True, color=C_GOLD2, font=FONT_H)
    tb(s, Inches(0.3), Inches(1.28), Inches(2.8), Inches(2.7),
       "1セット50G / 純増4.0枚/G\nストックを1個消費して消化\n\n"
       "【ストック4種】\n"
       "  一代の力：ループ率20%\n"
       "  二代の力：ループ率40%\n"
       "  三代の力：ループ率60%\n"
       "  皇帝の力：ループ率80%（レア）\n\n"
       "ミリゴA〜Dストックと\n同じ設計思想を昇華",
       9, color=C_CREAM)

    arrow_r(s, Inches(3.3), Inches(2.52), Emu(270000), C_FLAME)

    rect_b(s, Inches(3.75), Inches(0.85), Inches(3.1), Inches(3.45),
           RGBColor(0x18, 0x08, 0x00), C_FLAME, 2.5)
    tb(s, Inches(3.85), Inches(0.90), Inches(2.9), Emu(320000),
       "継承の儀（業界初）", 12, bold=True, color=C_FLAME, font=FONT_H)
    tb(s, Inches(3.85), Inches(1.28), Inches(2.9), Inches(2.7),
       "赤7揃いで発動\n（ミリゴZ-ZONEを応用）\n\n"
       "【3択の選択】\n\n"
       "  技の継承\n  → 次世代の特殊演出解放\n\n"
       "  絆の継承\n  → 次世代AT継続率+10%\n\n"
       "  力の継承\n  → 宿敵弱体化ゲージ大幅UP",
       9, color=C_CREAM)

    arrow_r(s, Inches(6.95), Inches(2.52), Emu(270000), C_GOLD)

    rect_b(s, Inches(7.4), Inches(0.85), Inches(2.4), Inches(3.45),
           RGBColor(0x16, 0x10, 0x00), C_GOLD2, 2.5)
    tb(s, Inches(7.5), Inches(0.90), Inches(2.2), Emu(320000),
       "世代の重なり", 13, bold=True, color=C_GOLD2, font=FONT_H)
    tb(s, Inches(7.5), Inches(1.28), Inches(2.2), Inches(2.7),
       "第1世代\n  ↓ 継承\n第2世代\n  ↓ 継承\n第3世代\n  ↓\n英雄連合へ！\n\n★ 世代が重なるほど\n   演出が豊かになる",
       9, color=C_CREAM)

    rect(s, Inches(0.2), Inches(4.40), Inches(9.6), Emu(700000),
         RGBColor(0x10, 0x06, 0x1C))
    rect(s, Inches(0.2), Inches(4.40), Emu(60000), Emu(700000), C_FLAME)
    tb(s, Inches(0.45), Inches(4.45), Inches(9.2), Emu(270000),
       "「継承の儀」は能動的な選択が生まれる唯一の瞬間", 10, bold=True, color=C_FLAME, font=FONT_H)
    tb(s, Inches(0.45), Inches(4.78), Inches(9.2), Emu(270000),
       "「どれを選ぶか」の悩みが没入感を生む。選んだ内容が次世代ATに影響するため、打ち手ごとに異なる物語が展開する。",
       9, color=C_CREAM)


# ══════════════════════════════════════════════════════════════
#  SLIDE 7: 英雄連合・決戦AT
# ══════════════════════════════════════════════════════════════
def s_climax(prs):
    s = new_slide(prs)
    hdr(s, "英雄連合・決戦AT  ──  積み上げた世代が爆発する")

    rect_b(s, Inches(0.2), Inches(0.85), Inches(4.5), Inches(3.45),
           RGBColor(0x04, 0x14, 0x04), C_GREEN, 2.0)
    tb(s, Inches(0.3), Inches(0.90), Inches(4.3), Emu(320000),
       "英雄連合", 14, bold=True, color=RGBColor(0x60, 0xD0, 0x60), font=FONT_H)
    tb(s, Inches(0.3), Inches(1.28), Inches(4.3), Inches(2.7),
       "発動条件：世代AT 3回以上ループ\n　　　　　＋ 特定継承組み合わせ\n\n"
       "複数世代の英雄が「連合」して戦う演出\n\n"
       "継続率：75%\n純増：6.5枚/G\n期待枚数：1,000〜1,500枚\n\n"
       "AT終了時「英雄の残照」（引き戻し5G）\n  → 吉宗1G連の感動をここで再現",
       9, color=C_CREAM)

    rect(s, Inches(4.85), Inches(1.6), Emu(220000), Inches(2.0),
         RGBColor(0x20, 0x10, 0x00))
    tb(s, Inches(4.85), Inches(2.35), Emu(220000), Emu(400000),
       "→", 22, bold=True, color=C_CRIMSON, align=PP_ALIGN.CENTER)

    rect_b(s, Inches(5.25), Inches(0.85), Inches(4.55), Inches(3.45),
           RGBColor(0x22, 0x04, 0x04), C_CRIMSON, 2.5)
    tb(s, Inches(5.35), Inches(0.90), Inches(4.35), Emu(320000),
       "決戦AT  ―世代の決着―", 14, bold=True, color=C_CRIMSON, font=FONT_H)
    tb(s, Inches(5.35), Inches(1.28), Inches(4.35), Inches(2.7),
       "発動条件：\n"
       "  宿敵弱体化ゲージ MAX\n"
       "  ＋ 皇帝の力ストック\n"
       "  ＋ 継承3種コンプリート\n\n"
       "純増：8.0枚/G\n歴代全世代の英雄が集結する演出\n\n"
       "★ 前後のAT積み上げ込みで\n   MY 約3,500枚（ミドル）",
       9, color=C_CREAM)

    rect(s, Inches(0.2), Inches(4.40), Inches(9.6), Emu(700000),
         RGBColor(0x1A, 0x04, 0x04))
    rect(s, Inches(0.2), Inches(4.40), Emu(60000), Emu(700000), C_CRIMSON)
    tb(s, Inches(0.45), Inches(4.45), Inches(9.2), Emu(270000),
       "MY設計：世代AT(800枚) ＋ 英雄連合(1,200枚) ＋ 決戦AT(1,500枚) ＝ 約3,500枚",
       10, bold=True, color=C_FLAME2, font=FONT_H)
    tb(s, Inches(0.45), Inches(4.78), Inches(9.2), Emu(270000),
       "通常遊技でも英雄連合まで楽しめる設計。決戦ATは「夢」ではなく「積み上げれば届く」距離感に設定。",
       9, color=C_CREAM)


# ══════════════════════════════════════════════════════════════
#  SLIDE 8: 基本スペック
# ══════════════════════════════════════════════════════════════
def s_spec(prs):
    s = new_slide(prs)
    hdr(s, "基本スペック  ──  ミドルMY・ストレスフリー設計")

    rect_b(s, Inches(0.2), Inches(0.85), Inches(4.7), Inches(3.55),
           C_CARD, C_GOLD, 1.5)
    tb(s, Inches(0.3), Inches(0.90), Inches(4.5), Emu(320000),
       "基本スペック", 11, bold=True, color=C_GOLD, font=FONT_H)
    specs = [
        ("タイプ",     "スマスロ（L型）"),
        ("天井",       "600G（継承ポイントで最短400G）"),
        ("純増",       "4.0枚/G / 6.5枚/G / 8.0枚/G"),
        ("機械割",     "設定1：97.5%  /  設定6：109%"),
        ("MY目標",     "約3,500枚（ミドル）"),
        ("コイン単価",  "20円（3枚ベット / 1G＝60円）"),
        ("CV",         "0.22〜0.27"),
    ]
    sy = Inches(1.36)
    for label, val in specs:
        rect(s, Inches(0.3), sy, Inches(1.6), Emu(255000), RGBColor(0x1A, 0x10, 0x00))
        tb(s, Inches(0.35), sy + Emu(28000), Inches(1.5), Emu(200000),
           label, 8.5, bold=True, color=C_GOLD2, wrap=False)
        tb(s, Inches(1.95), sy + Emu(28000), Inches(2.85), Emu(200000),
           val, 8.5, color=C_CREAM, wrap=False)
        sy += Emu(265000)

    rect_b(s, Inches(5.1), Inches(0.85), Inches(4.7), Inches(3.55),
           C_CARD, C_FLAME, 1.5)
    tb(s, Inches(5.2), Inches(0.90), Inches(4.5), Emu(320000),
       "出玉期待値", 11, bold=True, color=C_FLAME, font=FONT_H)
    outs = [
        ("通常AT",    "300〜400枚",    "1〜2世代の日"),
        ("英雄連合",  "1,000〜1,500枚","3世代ループの日"),
        ("決戦AT",    "1,500枚以上",   "全条件成立の日"),
        ("MY（目安）","約3,500枚",     "決戦+前後込みの1日"),
    ]
    oy = Inches(1.36)
    for label, amount, note in outs:
        rect(s, Inches(5.2), oy, Inches(1.55), Emu(280000), RGBColor(0x22, 0x08, 0x00))
        tb(s, Inches(5.25), oy + Emu(38000), Inches(1.45), Emu(200000),
           label, 8.5, bold=True, color=C_FLAME2, wrap=False)
        tb(s, Inches(6.80), oy + Emu(38000), Inches(1.45), Emu(200000),
           amount, 9, bold=True, color=C_GOLD2, wrap=False)
        tb(s, Inches(8.30), oy + Emu(38000), Inches(1.40), Emu(200000),
           note, 7.5, color=C_LTGRAY, wrap=False)
        oy += Emu(295000)

    rect(s, Inches(0.2), Inches(4.50), Inches(9.6), Emu(560000),
         RGBColor(0x0C, 0x06, 0x1E))
    rect(s, Inches(0.2), Inches(4.50), Emu(60000), Emu(560000), C_GOLD)
    tb(s, Inches(0.45), Inches(4.55), Inches(9.2), Emu(250000),
       "時間コスト目安：1G=60円 × 設定1(97.5%) → 期待損失1.5円/G。400G/時で約600円/時。",
       8.5, bold=True, color=C_GOLD)
    tb(s, Inches(0.45), Inches(4.83), Inches(9.2), Emu(250000),
       "英雄連合狙いなら3世代（約150G）が一区切り。ミドル層が3,000〜5,000円で十分楽しめる時間設計。",
       8.5, color=C_CREAM)
    net_note(s)


# ══════════════════════════════════════════════════════════════
#  SLIDE 9: ターゲット・市場考察
# ══════════════════════════════════════════════════════════════
def s_market(prs):
    s = new_slide(prs)
    hdr(s, "ターゲット・市場考察  ──  RPG世代×継承テーマの必然性")

    rect_b(s, Inches(0.2), Inches(0.85), Inches(4.65), Inches(3.45),
           C_CARD, C_GOLD, 1.5)
    tb(s, Inches(0.3), Inches(0.90), Inches(4.45), Emu(320000),
       "メインターゲット", 11, bold=True, color=C_GOLD, font=FONT_H)
    targets = [
        ("年齢層",         "30〜50代男性",                         C_GOLD2),
        ("世代",           "ロマサガ2・DQ・FF体験世代",            C_CREAM),
        ("プレイスタイル", "週1〜2来店のリピーター",               C_CREAM),
        ("感情ニーズ",     "「物語に没入」「積み上げを感じたい」", C_FLAME2),
        ("許容投資",       "3,000〜8,000円/日",                    C_YELLOW),
    ]
    ty = Inches(1.35)
    for label, val, col in targets:
        tb(s, Inches(0.3),  ty, Inches(1.55), Emu(268000), label, 8.5, bold=True, color=C_GRAY,  wrap=False)
        tb(s, Inches(1.90), ty, Inches(2.85), Emu(268000), val,   8.5, color=col, wrap=False)
        ty += Emu(270000)

    rect_b(s, Inches(5.05), Inches(0.85), Inches(4.75), Inches(3.45),
           C_CARD, C_STEEL, 1.5)
    tb(s, Inches(5.15), Inches(0.90), Inches(4.55), Emu(320000),
       "競合との差別化", 11, bold=True, color=C_STEEL, font=FONT_H)
    comps = [
        ("Re:ゼロ",    "タイムリープ・失敗前提",    "継承＝積み上げ（前向き）"),
        ("ミリゴ",     "PGG 1/16,384の夢",          "決戦AT＝積み上げれば届く"),
        ("吉宗",       "1G連の瞬間爆発",            "世代ループで連続興奮"),
        ("祟り神の章", "感情逆転・他者理解",         "感情積み上げ・自己の物語"),
    ]
    cy = Inches(1.35)
    for title, their, ours in comps:
        tb(s, Inches(5.15), cy, Inches(1.25), Emu(265000), title, 8, bold=True, color=C_LTGRAY, wrap=False)
        tb(s, Inches(6.45), cy, Inches(1.55), Emu(265000), their, 7.5, color=C_LTGRAY, wrap=False)
        tb(s, Inches(8.05), cy, Inches(1.65), Emu(265000), f"→ {ours}", 7.5, color=C_FLAME2, wrap=False)
        cy += Emu(268000)

    rect(s, Inches(0.2), Inches(4.40), Inches(9.6), Emu(700000),
         RGBColor(0x0A, 0x08, 0x1E))
    rect(s, Inches(0.2), Inches(4.40), Emu(60000), Emu(700000), C_FLAME)
    tb(s, Inches(0.45), Inches(4.45), Inches(9.2), Emu(260000),
       "「なぜ今この台か」", 10, bold=True, color=C_FLAME, font=FONT_H)
    tb(s, Inches(0.45), Inches(4.78), Inches(9.2), Emu(280000),
       "RPG世代がパチスロ主力層として定着。「物語への没入」「積み上げる達成感」を求める需要が増加。継承テーマは業界初で先行者優位を取れる。",
       9, color=C_CREAM)


# ══════════════════════════════════════════════════════════════
#  SLIDE 10: まとめ
# ══════════════════════════════════════════════════════════════
def s_matome(prs):
    s = new_slide(prs)
    hdr(s, "まとめ  ──  「世代 ―継承の炎―」が生み出す体験")

    cols_data = [
        (Inches(0.2),
         "1セッションで感じる",
         "「今日の遊技が1つの物語」\n\n世代が重なるたびに\n演出が豊かになり\nAT終了時も\n「次の世代へ繋いだ」\nというポジティブな\n余韻が残る",
         C_STEEL, RGBColor(0x04, 0x0C, 0x1E)),
        (Inches(3.55),
         "選ぶことで感じる",
         "「この台は自分の台」\n\n継承の儀で選んだ内容が\n物語を変える\n同じ台でも\n2人と同じ体験をしない\n設計\n\n能動的没入感",
         C_FLAME, RGBColor(0x1A, 0x08, 0x00)),
        (Inches(6.9),
         "決着で感じる",
         "「積み上げが報われた」\n\n決戦ATは\n「たまたま当たった」\nではなく\n「自分が育てた」感覚\n\nMY3,500枚の爆発が\n来たとき最高の物語",
         C_GOLD, RGBColor(0x1A, 0x10, 0x00)),
    ]
    for x, title, desc, col, fill in cols_data:
        rect_b(s, x, Inches(0.85), Inches(3.0), Inches(3.3), fill, col, 2.0)
        tb(s, x + Emu(80000), Inches(0.92), Inches(2.8), Emu(330000),
           title, 10, bold=True, color=col, font=FONT_H)
        tb(s, x + Emu(80000), Inches(1.38), Inches(2.8), Inches(2.5),
           desc, 9, color=C_CREAM)

    rect(s, Inches(0.2), Inches(4.25), Inches(9.6), Emu(40000), C_GOLD)
    rect(s, Inches(0.2), Inches(4.33), Inches(9.6), Emu(760000), RGBColor(0x12, 0x08, 0x00))
    tb(s, Inches(0.35), Inches(4.38), Inches(9.2), Emu(270000),
       "業界初3点：① 世代交代ループ演出  ② 継承の儀（AT中の3択選択）  ③ 宿敵弱体化ゲージ（1セッション完結）",
       9, bold=True, color=C_GOLD2)
    tb(s, Inches(0.35), Inches(4.70), Inches(9.2), Emu(350000),
       "ミリゴのZ-ZONE × 吉宗の1G連 × 祟り神の感情設計を統合。\n"
       "「負けても意志は続く」——この感情設計が他の全ての台にない「世代」の核心です。",
       9, color=C_CREAM)


# ══════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════
def main():
    prs = Presentation()
    prs.slide_width  = Inches(10)
    prs.slide_height = Inches(5.625)

    slides = [
        ("タイトル",            s_title),
        ("コアコンセプト",       s_concept),
        ("業界初ポイント",       s_first),
        ("ゲームフロー全体図",   s_flow),
        ("通常時の仕組み",       s_normal),
        ("世代AT・継承の儀",     s_seidae_at),
        ("英雄連合・決戦AT",     s_climax),
        ("基本スペック",         s_spec),
        ("ターゲット・市場考察", s_market),
        ("まとめ",               s_matome),
    ]

    print("=" * 55)
    print("  「世代 ―継承の炎―」企画提案書ジェネレーター")
    print("=" * 55)
    print("\n📊 スライド生成中...")
    for i, (name, func) in enumerate(slides, 1):
        print(f"   {i:2d}/10 {name}")
        func(prs)

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    prs.save(OUT_PATH)
    print(f"\n✅ 保存完了: {OUT_PATH}\n")


if __name__ == "__main__":
    main()
