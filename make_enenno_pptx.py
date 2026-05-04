"""
Lパチスロ 炎炎ノ消防隊2 機種説明＋分析 統合版 PPTXジェネレーター
出力: proposals/機種分析/炎炎ノ消防隊2/enenno_guide_v1.pptx
テーマ: 深黒×炎赤×オレンジ×白（炎カラー）
"""
import io, os, sys
from PIL import Image as PILImage, ImageDraw
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

OUT_PATH = os.path.join(os.path.dirname(__file__),
           "proposals", "機種分析", "炎炎ノ消防隊2", "enenno_guide_v1.pptx")
os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)

# ── カラーパレット（深黒×炎赤×オレンジ×白）──────────────────────────
C_BG    = RGBColor(0x0A, 0x04, 0x04)   # 深黒（炎赤みがかった暗黒）
C_CARD  = RGBColor(0x14, 0x08, 0x04)   # カード背景
C_CARD2 = RGBColor(0x1C, 0x0C, 0x06)   # カード背景2
C_ROW   = RGBColor(0x18, 0x0A, 0x05)   # 奇数行
C_FIRE  = RGBColor(0xCC, 0x22, 0x00)   # 炎赤（メイン）
C_FIRE2 = RGBColor(0xFF, 0x55, 0x11)   # 炎オレンジ
C_ORG   = RGBColor(0xFF, 0x99, 0x22)   # オレンジ（アクセント）
C_FLAME = RGBColor(0xFF, 0xCC, 0x44)   # 炎の先端（金色寄り）
C_WHITE = RGBColor(0xF0, 0xEC, 0xE8)   # 白（炎寄り）
C_CREAM = RGBColor(0xF0, 0xD8, 0xB0)
C_GRAY  = RGBColor(0x99, 0x88, 0x80)
C_LTGRY = RGBColor(0x55, 0x44, 0x40)
C_CYAN  = RGBColor(0x22, 0xCC, 0xDD)
C_BLUE  = RGBColor(0x22, 0x77, 0xFF)
C_GREEN = RGBColor(0x22, 0xCC, 0x66)
C_GOLD  = RGBColor(0xC8, 0xA8, 0x40)
C_RED   = RGBColor(0xDD, 0x11, 0x11)   # 純赤（警告色）

FONT_H = "游明朝"
FONT_B = "メイリオ"
SLIDE_W = Inches(10)
SLIDE_H = Inches(5.625)


def make_bg(w=1280, h=720):
    """炎をイメージした赤みがかった暗いグラデーション背景"""
    img = PILImage.new("RGB", (w, h), (10, 4, 4))
    draw = ImageDraw.Draw(img)
    # 斜めライン（炎の陰影）
    for i in range(0, w + h, 80):
        draw.line([(i, 0), (0, i)], fill=(16, 6, 4), width=1)
    # 下部炎グロー（赤オレンジ）
    for y in range(h - 120, h):
        t = (y - (h - 120)) / 120
        r = int(40 * t)
        g = int(10 * t)
        draw.line([(0, y), (w, y)], fill=(r, g, 0))
    # 上部わずかな赤み
    for y in range(0, 40):
        t = (40 - y) / 40 * 0.5
        draw.line([(0, y), (w, y)], fill=(int(15 * t), 0, 0))
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
       title_text, 14, bold=True, color=C_ORG, font=FONT_H)
    if pg:
        tb(slide, Inches(8.8), Emu(45000), Inches(1.0), Emu(340000),
           pg, 8, color=C_GRAY, align=PP_ALIGN.RIGHT)
    rect(slide, 0, Inches(0.58), SLIDE_W, Emu(7000), C_FIRE)


def net_note(slide):
    """※ネット解析情報より を右下に表示"""
    tb(slide, Inches(8.2), Inches(5.38), Inches(1.7), Emu(180000),
       "※ネット解析情報より", 7, color=C_GRAY, align=PP_ALIGN.RIGHT)


def footer(slide, bold_text, sub_text=""):
    """各スライドのフッター: 設計コメント（太字）＋補足説明"""
    fy = Inches(5.08)
    rect(slide, 0, fy, SLIDE_W, Inches(0.545), RGBColor(0x0E, 0x06, 0x04))
    rect(slide, 0, fy, Emu(20000), Inches(0.545), C_FIRE)
    tb(slide, Inches(0.18), fy + Emu(40000), Inches(5.5), Emu(340000),
       bold_text, 7.5, bold=True, color=C_ORG)
    if sub_text:
        tb(slide, Inches(5.8), fy + Emu(40000), Inches(4.0), Emu(340000),
           sub_text, 7, color=C_GRAY, align=PP_ALIGN.RIGHT)


def arrow_r(slide, x, cy, col=None):
    shp = slide.shapes.add_shape(13, x, cy - Emu(90000), Emu(200000), Emu(180000))
    shp.fill.solid()
    shp.fill.fore_color.rgb = col or C_FIRE
    shp.line.fill.background()


def arrow_d(slide, cx, y, col=None):
    """下向き矢印"""
    shp = slide.shapes.add_shape(13, cx - Emu(90000), y, Emu(180000), Emu(180000))
    # 下向きに回転（180度）するため shape type 14 (下向き矢印) を使う
    shp2 = slide.shapes.add_shape(14, cx - Emu(90000), y, Emu(180000), Emu(180000))
    shp2.fill.solid()
    shp2.fill.fore_color.rgb = col or C_FIRE
    shp2.line.fill.background()
    # 最初のshapeを削除
    sp = shp._element
    sp.getparent().remove(sp)
    return shp2


# ══════════════════════════════════════════════════════════════
#  SLIDE 1: タイトル・スペック・この台の3ポイント
# ══════════════════════════════════════════════════════════════
def s_title(prs):
    s = new_slide(prs)

    # 左パネル
    rect(s, 0, 0, Inches(5.4), SLIDE_H, RGBColor(0x06, 0x02, 0x02))
    rect(s, 0, 0, Emu(55000), SLIDE_H, C_FIRE)
    rect(s, Inches(5.4), 0, Emu(8000), SLIDE_H, C_FIRE)

    tb(s, Inches(0.22), Inches(0.4), Inches(5.0), Emu(330000),
       "機種説明＋分析 統合ガイド", 11, color=C_FIRE2, font=FONT_H)
    tb(s, Inches(0.22), Inches(0.88), Inches(5.1), Emu(900000),
       "炎炎ノ消防隊2", 34, bold=True, color=C_FIRE, font=FONT_H)
    tb(s, Inches(0.22), Inches(2.65), Inches(5.0), Emu(280000),
       "Lパチスロ ── 高純増×二段階天井×十字目変換の設計", 9.5, color=C_CREAM, font=FONT_H)

    # スペック
    specs = [
        ("メーカー",    "SANKYO　2026年導入"),
        ("設定",       "1〜6段階"),
        ("AT純増",     "約5.8枚/G（業界最高水準）"),
        ("設定6機械割", "114.9%"),
        ("天井①",     "850G（ボーナス間）"),
        ("天井②",     "2,000G（炎炎激闘間）"),
    ]
    for i, (k, v) in enumerate(specs):
        ry = Inches(3.12) + i * Emu(350000)
        tb(s, Inches(0.22), ry, Inches(1.5), Emu(310000),
           k, 8, color=C_GRAY)
        tb(s, Inches(1.72), ry, Inches(3.5), Emu(310000),
           v, 8.5, bold=True, color=C_WHITE)

    # 右パネル：この台の3ポイント
    kws = [
        (C_FIRE,  "① 十字目変換フロー",
         "リプレイ小V→PUSH→炎色変換→\n伝導者決戦。緊張感ある自力感の核心"),
        (C_ORG,   "② 高純増5.8枚/G",
         "炎炎大戦ループ中に爆発的出玉。\n短時間で大量獲得が可能"),
        (C_CYAN,  "③ 二段階天井設計",
         "850G+2,000GのWセーフティで\n投資計画が立てやすい安心設計"),
    ]
    for i, (ac, kw, desc) in enumerate(kws):
        y0 = Inches(0.55) + i * Emu(1540000)
        rect_b(s, Inches(5.65), y0, Inches(4.1), Inches(1.3), C_CARD, ac, 2.0)
        rect(s, Inches(5.65), y0, Emu(60000), Inches(1.3), ac)
        tb(s, Inches(5.85), y0 + Emu(65000), Inches(3.8), Emu(310000),
           kw, 12, bold=True, color=ac, font=FONT_H)
        tb(s, Inches(5.85), y0 + Emu(390000), Inches(3.8), Emu(420000),
           desc, 8.5, color=C_WHITE)

    net_note(s)
    footer(s, "設計の核心は「十字目変換フロー」── リプレイからPUSH、炎色判定、ボーナス抽選という緊張感の連鎖",
           "3つのポイントを押さえれば台の全体像が掴める")


# ══════════════════════════════════════════════════════════════
#  SLIDE 2: ゲームフロー全体図（全ルートを蛇行2段で可視化）
# ══════════════════════════════════════════════════════════════
def s_flow(prs):
    s = new_slide(prs)
    hdr(s, "ゲームフロー全体図 ── 通常時→AT→上位ATの全ルート", "2/9")

    # 上段：通常→AT→上位AT の基本フロー
    top_y = Inches(0.75)
    top_h = Emu(1150000)

    flow1 = [
        (C_CARD2, C_GRAY,  "通常遊技",       "天井: 850G\nレア役でCZ/AT抽選"),
        (C_CARD,  C_ORG,   "CZ\n(前兆)",     "天井到達時・\nレア役から突入"),
        (C_CARD,  C_FIRE,  "ボーナス各種",   "REG/炎炎ブースト\n/アドラバーストなど"),
        (C_CARD,  C_FIRE2, "炎炎激闘\n(AT)", "1セット15G+α\nストック型"),
    ]
    bw1 = Inches(1.85)
    gap1 = Inches(0.22)
    sx1 = Inches(0.28)
    cy1 = top_y + top_h // 2

    for i, (fill, ac, lbl, sub) in enumerate(flow1):
        bx = sx1 + i * (bw1 + gap1)
        rect_b(s, bx, top_y, bw1, top_h, fill, ac, 1.8)
        tb(s, bx + Emu(40000), top_y + Emu(80000), bw1 - Emu(80000), Emu(380000),
           lbl, 10, bold=True, color=ac, align=PP_ALIGN.CENTER, font=FONT_H)
        tb(s, bx + Emu(30000), top_y + Emu(500000), bw1 - Emu(60000), Emu(520000),
           sub, 8, color=C_GRAY, align=PP_ALIGN.CENTER)
        if i < 3:
            arrow_r(s, bx + bw1 + Emu(15000), cy1)

    # 天井② ラベル
    tb(s, Inches(0.28), top_y + Emu(1200000), Inches(3.0), Emu(280000),
       "天井② 2,000G → CZ/AT保証", 8, color=C_CYAN)
    rect(s, Inches(0.28), top_y + Emu(1450000), Inches(3.5), Emu(5000), C_CYAN)

    # 上段右側：炎炎激闘の詳細ループ
    loop_x = Inches(7.7)
    loop_y = Inches(0.75)
    loop_w = Inches(2.05)

    rect_b(s, loop_x, loop_y, loop_w, Emu(1150000), C_CARD, C_FIRE2, 1.5)
    rect(s, loop_x, loop_y, Emu(35000), Emu(1150000), C_FIRE2)
    tb(s, loop_x + Emu(60000), loop_y + Emu(55000), loop_w - Emu(80000), Emu(280000),
       "ストック型ループ", 9, bold=True, color=C_FIRE2, font=FONT_H)
    tb(s, loop_x + Emu(60000), loop_y + Emu(340000), loop_w - Emu(80000), Emu(700000),
       "15G終了後、ストック\nあれば即再セット。\nボーナスループ率\n80%以上が目標。", 8, color=C_WHITE)

    # 中段区切り線
    rect(s, 0, Inches(2.08), SLIDE_W, Emu(5000), RGBColor(0x44, 0x18, 0x08))

    # 下段：AT内→上位AT昇格ルート
    bot_y = Inches(2.15)
    bot_h = Emu(1100000)

    flow2 = [
        (C_CARD,  C_FIRE2, "炎炎激闘\n（AT継続）",  "十字目変換成功\n→伝導者決戦"),
        (C_CARD,  C_ORG,   "アドラリンク\n（上乗せ）", "3Gロック演出\n1段〜3段で期待度変化"),
        (C_CARD,  C_FLAME, "炎炎大戦\n（上位AT）",  "ループ率80〜90%\n継続で大量獲得"),
        (RGBColor(0x18, 0x08, 0x02), C_GOLD,
         "アドラバースト\n（最上位）",    "期待約2,760枚\n最強クラス"),
    ]
    bw2 = Inches(1.85)
    gap2 = Inches(0.22)
    sx2 = Inches(0.28)
    cy2 = bot_y + bot_h // 2

    for i, (fill, ac, lbl, sub) in enumerate(flow2):
        bx = sx2 + i * (bw2 + gap2)
        rect_b(s, bx, bot_y, bw2, bot_h, fill, ac, 1.8)
        tb(s, bx + Emu(40000), bot_y + Emu(80000), bw2 - Emu(80000), Emu(380000),
           lbl, 10, bold=True, color=ac, align=PP_ALIGN.CENTER, font=FONT_H)
        tb(s, bx + Emu(30000), bot_y + Emu(500000), bw2 - Emu(60000), Emu(480000),
           sub, 8, color=C_GRAY, align=PP_ALIGN.CENTER)
        if i < 3:
            arrow_r(s, bx + bw2 + Emu(15000), cy2)

    # 右側：超炎炎大戦
    sx2_last = sx2 + 4 * (bw2 + gap2)
    rect_b(s, sx2_last, bot_y, loop_w, bot_h,
           RGBColor(0x1A, 0x0A, 0x00), C_GOLD, 2.0)
    rect(s, sx2_last, bot_y, Emu(35000), bot_h, C_GOLD)
    tb(s, sx2_last + Emu(60000), bot_y + Emu(80000), loop_w - Emu(80000), Emu(310000),
       "超炎炎大戦", 10, bold=True, color=C_GOLD, font=FONT_H)
    tb(s, sx2_last + Emu(60000), bot_y + Emu(400000), loop_w - Emu(80000), Emu(580000),
       "最高継続率Ver.\nEX BONUS:\n最大3,000枚", 8, color=C_WHITE)

    net_note(s)
    footer(s, "上段=通常〜AT突入ルート、下段=AT内昇格ルート。「炎炎激闘→炎炎大戦→アドラバースト」が出玉の本線",
           "天井②は2,000Gというロング設計で長期狙いのセーフティ")


# ══════════════════════════════════════════════════════════════
#  SLIDE 3: 通常時の遊び方（ルート・チャンス役の見方）
# ══════════════════════════════════════════════════════════════
def s_normal(prs):
    s = new_slide(prs)
    hdr(s, "通常時の遊び方 ── ルート・チャンス役・天井管理", "3/9")

    # 左：ルート図
    lx, ly = Inches(0.28), Inches(0.72)
    lw = Inches(4.55)

    rect(s, lx, ly, lw, Emu(290000), RGBColor(0x55, 0x18, 0x00))
    tb(s, lx + Emu(60000), ly + Emu(55000), lw - Emu(80000), Emu(220000),
       "通常時〜AT突入ルート", 10, bold=True, color=C_ORG)

    routes = [
        (C_FIRE2, "ルート①  レア役ヒット",
         "チェリー・スイカ・強チェリーなどで\nAT直撃 or CZ（前兆）突入の抽選。\n強レア役ほど期待度が高い。"),
        (C_CYAN,  "ルート②  天井①到達（850G）",
         "ボーナス間850GでCZ/AT保証。\n設定変更後は650Gに短縮。\n日常的に狙える最頻出ルート。"),
        (C_FLAME, "ルート③  天井②到達（2,000G）",
         "炎炎激闘間2,000Gで発動。\nリセット後は1,500G。\n長期ハマりの最終出口として機能。"),
    ]
    for i, (ac, t, b) in enumerate(routes):
        iy = ly + Emu(290000) + i * Emu(1230000)
        rect_b(s, lx, iy, lw, Emu(1160000), C_CARD, ac, 1.5)
        rect(s, lx, iy, Emu(45000), Emu(1160000), ac)
        tb(s, lx + Emu(75000), iy + Emu(55000), lw - Emu(100000), Emu(270000),
           t, 9, bold=True, color=ac)
        tb(s, lx + Emu(75000), iy + Emu(330000), lw - Emu(100000), Emu(720000),
           b, 8, color=C_WHITE)

    # 右：チャンス役の見方
    rx, ry = Inches(5.0), Inches(0.72)
    rw = Inches(4.7)

    rect(s, rx, ry, rw, Emu(290000), RGBColor(0x55, 0x18, 0x00))
    tb(s, rx + Emu(60000), ry + Emu(55000), rw - Emu(80000), Emu(220000),
       "チャンス役の見方と期待度目安", 10, bold=True, color=C_ORG)

    chance = [
        (C_GRAY,  "リプレイ",      "通常遊技の基本役。\n小V停止→PUSHが核心（AT中）"),
        (C_FIRE2, "弱チェリー",    "AT抽選あり。\n前兆移行の起点になりやすい"),
        (C_FIRE,  "スイカ",        "高確率でCZ/AT抽選。\n出現時は要注目"),
        (C_ORG,   "強チェリー",    "高確率でAT直撃 or 上位ボーナス。\n炎炎ブースト以上の期待度"),
        (C_FLAME, "7揃い系の役",   "最重要。ボーナス確定に近い扱い。\nフリーズ発生でEX BONUS等"),
    ]
    ch_h = Emu(770000)
    for i, (ac, role, desc) in enumerate(chance):
        cy = ry + Emu(290000) + i * ch_h
        bg = C_CARD if i % 2 == 0 else C_ROW
        rect(s, rx, cy, rw, ch_h, bg)
        rect(s, rx, cy, Emu(35000), ch_h, ac)
        tb(s, rx + Emu(60000), cy + Emu(60000), Inches(1.2), Emu(310000),
           role, 9, bold=True, color=ac, wrap=False)
        tb(s, rx + Emu(60000) + Inches(1.2), cy + Emu(70000), rw - Inches(1.3), Emu(590000),
           desc, 8, color=C_WHITE)

    net_note(s)
    footer(s, "通常時の基本戦略：天井①を基準にゲーム数管理しつつ、レア役チャンスを見逃さず注目する",
           "天井②は長期間来店や高設定狙い時の投資上限として意識する")


# ══════════════════════════════════════════════════════════════
#  SLIDE 4: AT「炎炎激闘」の遊び方（十字目変換フロー詳細）
# ══════════════════════════════════════════════════════════════
def s_at_flow(prs):
    s = new_slide(prs)
    hdr(s, "AT「炎炎激闘」の遊び方 ── 十字目変換フロー詳細", "4/9")

    # フローチャートのノード定義
    # 左側：メインフロー（縦型）
    fc_x = Inches(0.28)
    fc_w = Inches(4.35)

    rect(s, fc_x, Inches(0.72), fc_w, Emu(290000), RGBColor(0x55, 0x18, 0x00))
    tb(s, fc_x + Emu(60000), Inches(0.74), fc_w - Emu(80000), Emu(270000),
       "核心：十字目変換フロー（AT1セット15G+α）", 9.5, bold=True, color=C_ORG)

    # ノード1: リプレイで小V停止
    n1_y = Inches(1.08)
    n1_h = Emu(620000)
    rect_b(s, fc_x, n1_y, fc_w, n1_h, C_CARD2, C_GRAY, 1.2)
    tb(s, fc_x + Emu(40000), n1_y + Emu(50000), fc_w - Emu(60000), Emu(220000),
       "STEP 1", 7.5, bold=True, color=C_GRAY)
    tb(s, fc_x + Emu(40000), n1_y + Emu(250000), fc_w - Emu(60000), Emu(280000),
       "リプレイ成立 → 小V停止", 11, bold=True, color=C_WHITE, font=FONT_H)

    # 矢印1
    arrow_d(s, fc_x + fc_w // 2, n1_y + n1_h + Emu(20000), C_FIRE)

    # ノード2: PUSHボタン → 十字目に変換
    n2_y = n1_y + n1_h + Emu(230000)
    n2_h = Emu(620000)
    rect_b(s, fc_x, n2_y, fc_w, n2_h, RGBColor(0x20, 0x08, 0x02), C_FIRE, 1.8)
    rect(s, fc_x, n2_y, Emu(35000), n2_h, C_FIRE)
    tb(s, fc_x + Emu(60000), n2_y + Emu(50000), fc_w - Emu(80000), Emu(220000),
       "STEP 2", 7.5, bold=True, color=C_FIRE)
    tb(s, fc_x + Emu(60000), n2_y + Emu(250000), fc_w - Emu(80000), Emu(280000),
       "PUSHボタン → 十字目に変換！", 11, bold=True, color=C_FIRE2, font=FONT_H)

    # 矢印2
    arrow_d(s, fc_x + fc_w // 2, n2_y + n2_h + Emu(20000), C_FIRE)

    # ノード3: 炎の色で期待度判定（分岐）
    n3_y = n2_y + n2_h + Emu(230000)
    n3_h = Emu(760000)
    rect_b(s, fc_x, n3_y, fc_w, n3_h, RGBColor(0x22, 0x0A, 0x04), C_ORG, 2.0)
    rect(s, fc_x, n3_y, Emu(35000), n3_h, C_ORG)
    tb(s, fc_x + Emu(60000), n3_y + Emu(55000), fc_w - Emu(80000), Emu(250000),
       "STEP 3  炎の色で期待度確認", 9.5, bold=True, color=C_ORG, font=FONT_H)

    # 炎色の3分岐
    colors_info = [
        (RGBColor(0xDD, 0xDD, 0xDD), "白炎",  "約20%"),
        (C_BLUE,                     "青炎",  "約40%"),
        (C_RED,                      "赤炎",  "確定！"),
    ]
    cw3 = (fc_w - Emu(80000)) // 3
    for ci, (cc, clbl, cpct) in enumerate(colors_info):
        cx3 = fc_x + Emu(60000) + ci * cw3
        rect_b(s, cx3 + Emu(15000), n3_y + Emu(310000),
               cw3 - Emu(30000), Emu(380000), C_CARD, cc, 1.5)
        tb(s, cx3 + Emu(20000), n3_y + Emu(340000), cw3 - Emu(35000), Emu(200000),
           clbl, 9, bold=True, color=cc, align=PP_ALIGN.CENTER, wrap=False)
        tb(s, cx3 + Emu(20000), n3_y + Emu(540000), cw3 - Emu(35000), Emu(200000),
           cpct, 8.5, bold=True, color=C_FLAME, align=PP_ALIGN.CENTER, wrap=False)

    # ノード4: 成功→伝導者決戦
    n4_y = n3_y + n3_h + Emu(200000)
    n4_h = Emu(620000)
    arrow_d(s, fc_x + fc_w // 2, n3_y + n3_h + Emu(20000), C_FLAME)
    rect_b(s, fc_x, n4_y, fc_w, n4_h,
           RGBColor(0x24, 0x10, 0x00), C_FLAME, 2.0)
    rect(s, fc_x, n4_y, Emu(35000), n4_h, C_FLAME)
    tb(s, fc_x + Emu(60000), n4_y + Emu(50000), fc_w - Emu(80000), Emu(220000),
       "STEP 4  変換成功！", 7.5, bold=True, color=C_FLAME)
    tb(s, fc_x + Emu(60000), n4_y + Emu(255000), fc_w - Emu(80000), Emu(280000),
       "伝導者決戦 → ボーナス抽選", 11, bold=True, color=C_GOLD, font=FONT_H)

    # 右パネル：保険設計・セット管理
    rx, ry = Inches(4.85), Inches(0.72)
    rw = Inches(4.9)

    rect(s, rx, ry, rw, Emu(290000), RGBColor(0x55, 0x18, 0x00))
    tb(s, rx + Emu(60000), ry + Emu(55000), rw - Emu(80000), Emu(220000),
       "保険設計とセット管理", 10, bold=True, color=C_ORG)

    insurance = [
        (C_RED,  "3回目強制成功の保険設計",
         "2連続外れ → 3回目は必ず変換成功！\n\n"
         "どんな状況でも最大3回のリプレイを\n"
         "待てば必ず伝導者決戦に突入する。\n"
         "「あと1回待てば確実」の安心感が\n打ち続けるモチベーションを維持させる。"),
        (C_CYAN, "15G未変換 → 再セット",
         "15G以内に一度も変換成功しなかった\n"
         "場合は自動的に15G再セット。\n\n"
         "転落なし・強制終了なしの設計で\n"
         "ストレスなく遊べる保護機構。"),
        (C_FLAME, "ストック型AT継続",
         "変換成功→ボーナス抽選→ストック獲得\n"
         "のサイクルで枚数を積み上げる。\n"
         "ストックが残る限りセット継続。\n\"また来る\"という安堵感が重要。"),
    ]
    for i, (ac, t, b) in enumerate(insurance):
        iy = ry + Emu(290000) + i * Emu(1320000)
        rect_b(s, rx, iy, rw, Emu(1250000), C_CARD, ac, 1.5)
        rect(s, rx, iy, Emu(40000), Emu(1250000), ac)
        tb(s, rx + Emu(70000), iy + Emu(55000), rw - Emu(90000), Emu(270000),
           t, 9, bold=True, color=ac)
        tb(s, rx + Emu(70000), iy + Emu(330000), rw - Emu(90000), Emu(800000),
           b, 7.5, color=C_WHITE)

    net_note(s)
    footer(s, "十字目変換フローの設計核心：「必ず報われる」保険が打ち手の集中力とストレスフリーを両立する",
           "3回目強制成功・15G再セットは「終わらない安心感」の設計原則")


# ══════════════════════════════════════════════════════════════
#  SLIDE 5: 出玉を伸ばす方法（伝導者決戦・上乗せ）
# ══════════════════════════════════════════════════════════════
def s_extend(prs):
    s = new_slide(prs)
    hdr(s, "出玉を伸ばす方法 ── 伝導者決戦・アドラリンク・上乗せ契機", "5/9")

    # 伝導者決戦
    lx, ly = Inches(0.28), Inches(0.72)
    lw = Inches(4.5)

    rect(s, lx, ly, lw, Emu(290000), RGBColor(0x55, 0x18, 0x00))
    tb(s, lx + Emu(60000), ly + Emu(55000), lw - Emu(80000), Emu(220000),
       "伝導者決戦（ボーナス抽選バトル）", 10, bold=True, color=C_ORG)

    densha = [
        (C_FIRE,  "伝導者決戦とは",
         "十字目変換成功後に発生するボーナス抽選の\n"
         "演出バトル。勝利でボーナス獲得。\n"
         "炎色・演出の豪華さで期待度が変わる。"),
        (C_FLAME, "勝利でボーナス獲得",
         "REGボーナス → 設定判別の機会\n"
         "炎炎ブースト → 高継続ATへ\n"
         "アドラバースト → 期待2,760枚の最強ボーナス"),
        (C_CYAN,  "パターン注目ポイント",
         "BGM・キャラ・エフェクトで継続期待度が変化。\n"
         "シンラや炎柱絡みの演出は高期待度。\n"
         "最後まで諦めずに見届けること。"),
    ]
    for i, (ac, t, b) in enumerate(densha):
        iy = ly + Emu(290000) + i * Emu(1230000)
        rect_b(s, lx, iy, lw, Emu(1160000), C_CARD, ac, 1.5)
        rect(s, lx, iy, Emu(40000), Emu(1160000), ac)
        tb(s, lx + Emu(70000), iy + Emu(50000), lw - Emu(90000), Emu(270000),
           t, 9, bold=True, color=ac)
        tb(s, lx + Emu(70000), iy + Emu(320000), lw - Emu(90000), Emu(750000),
           b, 8, color=C_WHITE)

    # アドラリンク（上乗せ契機）
    rx, ry = Inches(5.0), Inches(0.72)
    rw = Inches(4.7)

    rect(s, rx, ry, rw, Emu(290000), RGBColor(0x55, 0x18, 0x00))
    tb(s, rx + Emu(60000), ry + Emu(55000), rw - Emu(80000), Emu(220000),
       "アドラリンク（上乗せ専用CZ・3G）", 10, bold=True, color=C_ORG)

    rect_b(s, rx, ry + Emu(290000), rw, Emu(1450000), C_CARD, C_CYAN, 1.8)
    rect(s, rx, ry + Emu(290000), Emu(40000), Emu(1450000), C_CYAN)

    tb(s, rx + Emu(70000), ry + Emu(340000), rw - Emu(90000), Emu(260000),
       "アドラリンクの仕組み", 10, bold=True, color=C_CYAN, font=FONT_H)
    tb(s, rx + Emu(70000), ry + Emu(600000), rw - Emu(90000), Emu(1050000),
       "AT中に割り込む3GのプチCZ。\n"
       "ボーナスやAT上乗せを自力で掴むチャンス。\n\n"
       "「自力で当てた」感覚を演出する重要な仕組み。\n"
       "受け身でなく能動的なプレイ感を生む。",
       8.5, color=C_WHITE)

    # 3段ロック演出
    rect(s, rx, ry + Emu(1740000), rw, Emu(290000), RGBColor(0x44, 0x18, 0x00))
    tb(s, rx + Emu(60000), ry + Emu(1790000), rw - Emu(80000), Emu(220000),
       "リールロック段数で期待度を視覚化", 9, bold=True, color=C_ORG)

    locks = [
        (C_GRAY,  "1段ロック", "チャンス",           "約30%",  0.30),
        (C_FIRE2, "2段ロック", "期待度大幅アップ",   "約60%",  0.60),
        (C_FLAME, "3段ロック", "激アツ（当確に近い）", "約90%+", 0.92),
    ]
    lock_y = ry + Emu(2030000)
    lock_h = Emu(850000)
    lock_w = rw / 3

    for i, (ac, lbl, desc, pct_s, pct) in enumerate(locks):
        lkx = rx + i * lock_w
        bg = C_CARD if i % 2 == 0 else C_ROW
        rect_b(s, lkx + Emu(8000), lock_y, lock_w - Emu(16000), lock_h, bg, ac, 1.5)
        tb(s, lkx + Emu(20000), lock_y + Emu(55000), lock_w - Emu(30000), Emu(260000),
           lbl, 9, bold=True, color=ac, align=PP_ALIGN.CENTER, wrap=False)
        tb(s, lkx + Emu(20000), lock_y + Emu(310000), lock_w - Emu(30000), Emu(240000),
           desc, 7.5, color=C_WHITE, align=PP_ALIGN.CENTER)
        # バー
        bar_w = lock_w - Emu(80000)
        rect(s, lkx + Emu(40000), lock_y + Emu(570000), bar_w, Emu(90000), C_LTGRY)
        rect(s, lkx + Emu(40000), lock_y + Emu(570000), int(bar_w * pct), Emu(90000), ac)
        tb(s, lkx + Emu(40000), lock_y + Emu(670000), lock_w - Emu(50000), Emu(200000),
           pct_s, 8, bold=True, color=ac, align=PP_ALIGN.CENTER, wrap=False)

    net_note(s)
    footer(s, "アドラリンクの3段ロック設計：段階的な視覚演出がプレイヤーの「自力感」と期待感を最大化する",
           "3段ロックは「当確に近い体験」を与えることで台前から離れさせない設計")


# ══════════════════════════════════════════════════════════════
#  SLIDE 6: 上位モード（到達ルート＋遊び方）
# ══════════════════════════════════════════════════════════════
def s_upper(prs):
    s = new_slide(prs)
    hdr(s, "上位モード ── (超)炎炎大戦・アドラバーストへの到達と遊び方", "6/9")

    # 上段：昇格ルート
    rect(s, 0, Inches(0.72), SLIDE_W, Emu(290000), RGBColor(0x44, 0x18, 0x00))
    tb(s, Inches(0.35), Inches(0.76), Inches(6.0), Emu(230000),
       "上位モード到達ルート（炎炎激闘から昇格）", 9, bold=True, color=C_ORG)

    route_boxes = [
        (C_FIRE2, "炎炎激闘\n（基本AT）",   "スタート地点\n1セット15G+α"),
        (C_ORG,   "ボーナス\n大量ストック", "伝導者決戦勝利\n連続でストック積み上げ"),
        (C_FLAME, "炎炎大戦\n（上位AT）",   "ループ率80〜90%\n昇格で大量獲得開始"),
        (C_GOLD,  "超炎炎大戦\n（最上位）",  "最高継続率\nEX BONUS等も出現"),
        (C_RED,   "アドラバースト\n（特殊）", "期待約2,760枚\n特別ルートで突入"),
    ]
    bw_r = Inches(1.65)
    gap_r = Inches(0.21)
    sx_r = Inches(0.28)
    cy_r = Inches(1.38)
    bh_r = Emu(1120000)

    for i, (ac, lbl, sub) in enumerate(route_boxes):
        bx = sx_r + i * (bw_r + gap_r)
        rect_b(s, bx, cy_r - bh_r // 2, bw_r, bh_r,
               C_CARD if i < 3 else RGBColor(0x18, 0x08, 0x00), ac, 2.0 if i >= 3 else 1.5)
        tb(s, bx + Emu(30000), cy_r - bh_r // 2 + Emu(80000),
           bw_r - Emu(50000), Emu(380000), lbl, 10, bold=True,
           color=ac, align=PP_ALIGN.CENTER, font=FONT_H)
        tb(s, bx + Emu(25000), cy_r - bh_r // 2 + Emu(470000),
           bw_r - Emu(40000), Emu(480000), sub, 7.5,
           color=C_GRAY, align=PP_ALIGN.CENTER)
        if i < 4:
            arrow_r(s, bx + bw_r + Emu(10000), cy_r)

    # 中区切り
    rect(s, 0, Inches(2.05), SLIDE_W, Emu(5000), RGBColor(0x44, 0x18, 0x08))

    # 下段左：炎炎大戦の遊び方
    lx2, ly2 = Inches(0.28), Inches(2.1)
    lw2 = Inches(4.5)
    lh2 = Emu(2600000)

    rect_b(s, lx2, ly2, lw2, lh2, C_CARD, C_FLAME, 1.8)
    rect(s, lx2, ly2, Emu(45000), lh2, C_FLAME)
    tb(s, lx2 + Emu(75000), ly2 + Emu(55000), lw2 - Emu(95000), Emu(280000),
       "(超)炎炎大戦の遊び方", 11, bold=True, color=C_FLAME, font=FONT_H)
    tb(s, lx2 + Emu(75000), ly2 + Emu(360000), lw2 - Emu(95000), lh2 - Emu(420000),
       "【ループ型の遊び方】\n"
       "炎炎大戦は1セット完了後に80〜90%の\n"
       "確率で再突入する高継続AT。\n\n"
       "プレイヤーはセットが続くたびに出玉が\n"
       "積み上がるのを体感する。\n\n"
       "【超炎炎大戦の特徴】\n"
       "炎炎大戦より継続率がさらに高いバージョン。\n"
       "突入時の演出が派手で打ちごたえ抜群。\n\n"
       "【EX BONUSへの期待】\n"
       "超炎炎大戦中にEX BONUSが出現すると\n"
       "最大3,000枚を狙えるロマンがある。",
       8, color=C_WHITE)

    # 下段右：アドラバーストの遊び方
    rx2, ry2 = Inches(5.0), Inches(2.1)
    rw2 = Inches(4.7)

    rect_b(s, rx2, ry2, rw2, lh2,
           RGBColor(0x18, 0x08, 0x00), C_GOLD, 2.0)
    rect(s, rx2, ry2, Emu(45000), lh2, C_GOLD)
    tb(s, rx2 + Emu(75000), ry2 + Emu(55000), rw2 - Emu(95000), Emu(280000),
       "アドラバーストの遊び方", 11, bold=True, color=C_GOLD, font=FONT_H)
    tb(s, rx2 + Emu(75000), ry2 + Emu(360000), rw2 - Emu(95000), lh2 - Emu(420000),
       "【到達ルート】\n"
       "アドラリンク成功 → 最上位ボーナスへ。\n"
       "または伝導者決戦での特殊勝利パターン。\n\n"
       "【期待枚数約2,760枚の根拠】\n"
       "ボーナス消化中の獲得枚数＋炎炎大戦\n"
       "ループによる出玉の合算値。\n"
       "1回突入するだけで大きなプラスが見込める。\n\n"
       "【打ち方のコツ】\n"
       "アドラバースト中は演出をしっかり見届ける。\n"
       "終了画面に設定示唆が出ることがある。\n"
       "消化終了後もすぐに離席しないこと。",
       8, color=C_WHITE)

    net_note(s)
    footer(s, "上位モードの到達は「炎炎激闘で伝導者決戦に勝ち続ける」の延長線上にある自然な昇格設計",
           "アドラバーストは期待枚数2,760枚という明確な数字が打ち手の目標設定を助ける")


# ══════════════════════════════════════════════════════════════
#  SLIDE 7: 面白さの設計（なぜこの台は面白いのか）
# ══════════════════════════════════════════════════════════════
def s_design(prs):
    s = new_slide(prs)
    hdr(s, "面白さの設計 ── なぜ炎炎ノ消防隊2は面白いのか", "7/9")

    # 5つの設計原則
    principles = [
        (C_FIRE,  "① 毎ゲーム「起きるかも」のドキドキ感",
         "十字目変換はリプレイが来るたびに発生チャンス。\n"
         "つまりほぼ毎数ゲームにドキドキの瞬間がある。\n"
         "「スロットを回す」行為そのものに意味を持たせる設計。"),
        (C_FIRE2, "② 炎の色という直感的な期待度表示",
         "白→青→赤という色の強さ＝期待度の高さが直感的。\n"
         "説明書なしで「赤が出たら熱い」と感じられる\n"
         "初心者にも優しいUX設計になっている。"),
        (C_ORG,   "③ 3回目必ず成功という「報われる」保証",
         "2連続外れでも3回目は必ず変換成功する保険設計。\n"
         "「絶対に外れ続けない」安心感がストレスを消し\n"
         "集中力を長時間維持させる巧みな心理設計。"),
        (C_CYAN,  "④ アドラリンクによる自力感の演出",
         "打ち手が「自分でボーナスを当てた」と感じる仕掛け。\n"
         "受け身のボーナス待ちでなく能動的に参加する感覚が\n"
         "没入感とリピート意欲を高める核心メカニズム。"),
        (C_FLAME, "⑤ 常に「上」が見える多層構造",
         "炎炎激闘→炎炎大戦→超炎炎大戦→アドラバーストと\n"
         "常に上位状態が存在する。\"次のレベル\"が見えることで\n"
         "プレイヤーの目標が途切れず離席抑制につながる。"),
    ]
    # 2列 3+2 レイアウト
    bw_p = Inches(4.55)
    bh_p = Emu(1250000)
    gx = Inches(0.25)
    gy = Inches(0.14)

    positions = [
        (Inches(0.28),  Inches(0.72)),
        (Inches(5.17),  Inches(0.72)),
        (Inches(0.28),  Inches(0.72) + bh_p + gy),
        (Inches(5.17),  Inches(0.72) + bh_p + gy),
        (Inches(0.28),  Inches(0.72) + 2 * (bh_p + gy)),
    ]
    # ⑤は横幅を広げてセンターに
    for i, (ac, t, b) in enumerate(principles):
        if i == 4:
            px = Inches(0.28)
            pw = Inches(9.44)
            ph = Emu(1150000)
        else:
            px, _ = positions[i]
            pw = bw_p
            ph = bh_p
        _, py = positions[i]

        rect_b(s, px, py, pw, ph, C_CARD, ac, 1.5)
        rect(s, px, py, Emu(40000), ph, ac)
        tb(s, px + Emu(70000), py + Emu(55000), pw - Emu(90000), Emu(270000),
           t, 9.5, bold=True, color=ac, font=FONT_H)
        tb(s, px + Emu(70000), py + Emu(340000), pw - Emu(90000), ph - Emu(400000),
           b, 8, color=C_WHITE)

    net_note(s)
    footer(s, "面白さの核心：「リプレイ毎のドキドキ×直感的炎色×保険設計×自力感×多層目標」の5要素が絡み合う",
           "炎の色という原作モチーフをゲーム性に昇華した点が本機の最大の設計的美しさ")


# ══════════════════════════════════════════════════════════════
#  SLIDE 8: 良い点と課題
# ══════════════════════════════════════════════════════════════
def s_pros_cons(prs):
    s = new_slide(prs)
    hdr(s, "良い点と課題 ── 設計の強みと改善余地", "8/9")

    # 良い点（左）
    lx, ly = Inches(0.28), Inches(0.72)
    lw = Inches(4.5)

    rect(s, lx, ly, lw, Emu(290000), C_GREEN)
    tb(s, lx + Emu(60000), ly + Emu(55000), lw - Emu(80000), Emu(220000),
       "良い点 ── 設計的強み", 10, bold=True, color=C_BG)

    pros = [
        (C_GREEN, "高純増5.8枚/Gという圧倒的スピード",
         "現行機で最高水準の純増速度。\n"
         "炎炎大戦ループ中の出玉爆発体験が\n"
         "他台との最大の差別化になっている。"),
        (C_GREEN, "十字目変換フローの毎G緊張感",
         "リプレイ毎にドキドキが発生する設計で\n"
         "退屈しない遊技体験を提供。\n"
         "炎色演出が初心者にも直感的でわかりやすい。"),
        (C_GREEN, "3回目強制成功という心理的安心設計",
         "「外れ続けない」保証が打ち手のストレスを\n"
         "大幅に軽減。長時間プレイを促進する。"),
        (C_GREEN, "二段階天井で投資計画が立てやすい",
         "850G+2,000Gの多層保護で\n"
         "ハイエナ狙いも明確。\n"
         "来店計画が立てやすいホール訴求力がある。"),
    ]
    for i, (ac, t, b) in enumerate(pros):
        iy = ly + Emu(290000) + i * Emu(1160000)
        rect_b(s, lx, iy, lw, Emu(1090000), C_CARD, ac, 1.2)
        rect(s, lx, iy, Emu(35000), Emu(1090000), ac)
        tb(s, lx + Emu(60000), iy + Emu(50000), lw - Emu(80000), Emu(260000),
           t, 8.5, bold=True, color=ac)
        tb(s, lx + Emu(60000), iy + Emu(310000), lw - Emu(80000), Emu(680000),
           b, 7.5, color=C_WHITE)

    # 課題（右）
    rx, ry = Inches(5.0), Inches(0.72)
    rw = Inches(4.7)

    rect(s, rx, ry, rw, Emu(290000), C_RED)
    tb(s, rx + Emu(60000), ry + Emu(55000), rw - Emu(80000), Emu(220000),
       "課題 ── 改善余地・注意点", 10, bold=True, color=C_WHITE)

    cons = [
        (C_RED,   "天井②2,000Gの投資負担",
         "炎炎激闘間2,000Gは非常に長い。\n"
         "天井②を狙う場合は大きな投資が必要で\n"
         "ライトユーザーには厳しい設定。"),
        (C_FIRE,  "十字目変換の連続外れ体験",
         "3回目保証はあるものの、2連続外れは\n"
         "感情的にマイナス体験になりやすい。\n"
         "保険を知らない初心者には不安を与える。"),
        (C_ORG,   "設定判別難易度の高さ",
         "REGボーナスのシナリオが最重要だが\n"
         "引けなければ判別不能に近い。\n"
         "高設定を確信するまでに時間がかかる。"),
        (C_GRAY,  "上位AT到達前の単調感",
         "炎炎激闘の15Gが積み重なる前の段階は\n"
         "単純作業感が出やすい。\n"
         "ストック数が少ない序盤は離脱リスクあり。"),
    ]
    for i, (ac, t, b) in enumerate(cons):
        iy = ry + Emu(290000) + i * Emu(1160000)
        rect_b(s, rx, iy, rw, Emu(1090000), C_CARD, ac, 1.2)
        rect(s, rx, iy, Emu(35000), Emu(1090000), ac)
        tb(s, rx + Emu(60000), iy + Emu(50000), rw - Emu(80000), Emu(260000),
           t, 8.5, bold=True, color=ac)
        tb(s, rx + Emu(60000), iy + Emu(310000), rw - Emu(80000), Emu(680000),
           b, 7.5, color=C_WHITE)

    net_note(s)
    footer(s, "強みと課題を把握することが設計学習の要点：強みを他機種に応用し、課題を次世代機で克服する視点を持つ",
           "特に天井②の長さとライトユーザー離脱リスクは導入ホール側のケアが重要な課題")


# ══════════════════════════════════════════════════════════════
#  SLIDE 9: まとめ・設計から学べること
# ══════════════════════════════════════════════════════════════
def s_matome(prs):
    s = new_slide(prs)
    hdr(s, "まとめ ── 設計から学べること", "9/9")

    # 左：設計の核心3点
    lx, ly = Inches(0.28), Inches(0.72)
    lw = Inches(4.5)

    rect(s, lx, ly, lw, Emu(290000), RGBColor(0x55, 0x18, 0x00))
    tb(s, lx + Emu(60000), ly + Emu(55000), lw - Emu(80000), Emu(220000),
       "炎炎ノ消防隊2 ── 設計的強み総括", 10, bold=True, color=C_ORG)

    strengths = [
        (C_FIRE,  "十字目変換フローという核心設計",
         "リプレイ→小V停止→PUSH→炎色変換→伝導者決戦\n"
         "という連鎖が毎Gの緊張感を生む。\n"
         "3回目強制成功の保険がストレスを消す。"),
        (C_FLAME, "5.8枚/Gという出玉体験の圧倒性",
         "炎炎大戦ループ中の出玉爆発が\n"
         "他台にはない「速くて大きな勝ち体験」を提供。\n"
         "来店動機・リピート動機の最大要因。"),
        (C_CYAN,  "投資計画を支援する二段階天井",
         "850G+2,000Gの多層セーフティで\n"
         "プレイヤーが安心して遊べる設計。\n"
         "天井狙いの立ち回りも計画しやすい。"),
    ]
    for i, (ac, t, b) in enumerate(strengths):
        iy = ly + Emu(290000) + i * Emu(1280000)
        rect_b(s, lx, iy, lw, Emu(1210000), C_CARD, ac, 1.5)
        rect(s, lx, iy, Emu(40000), Emu(1210000), ac)
        tb(s, lx + Emu(70000), iy + Emu(55000), lw - Emu(90000), Emu(270000),
           t, 9, bold=True, color=ac)
        tb(s, lx + Emu(70000), iy + Emu(330000), lw - Emu(90000), Emu(780000),
           b, 8, color=C_WHITE)

    # 右：設計原則と総括
    rx, ry = Inches(5.0), Inches(0.72)
    rw = Inches(4.7)

    rect(s, rx, ry, rw, Emu(290000), C_CARD2)
    tb(s, rx + Emu(60000), ry + Emu(55000), rw - Emu(80000), Emu(220000),
       "設計から学べる原則", 10, bold=True, color=C_ORG, font=FONT_H)

    principles = [
        (C_FIRE,  "毎Gの行動に意味を持たせよ",
         "「リプレイを引いたら何かが起きる」という\n仕組みが打ち手を能動的にする"),
        (C_FIRE2, "期待度は色で直感的に伝えよ",
         "白→青→赤という直感UXが\n初心者とベテラン両方を取り込む"),
        (C_ORG,   "「報われる」保証を設計に組み込め",
         "3回目強制成功のような\n安心設計がストレスを消し長時間稼働を促す"),
        (C_FLAME, "常に上の目標を見せよ",
         "多層構造の上位状態が\nプレイヤーの離席を防ぎ連チャン体験を作る"),
    ]
    for i, (ac, t, b) in enumerate(principles):
        py0 = ry + Emu(290000) + i * Emu(770000)
        rect_b(s, rx, py0, rw, Emu(720000), C_CARD, ac, 1.0)
        rect(s, rx, py0, Emu(30000), Emu(720000), ac)
        tb(s, rx + Emu(55000), py0 + Emu(50000), rw - Emu(75000), Emu(240000),
           t, 8.5, bold=True, color=ac)
        tb(s, rx + Emu(55000), py0 + Emu(290000), rw - Emu(75000), Emu(360000),
           b, 7.5, color=C_WHITE)

    # 総括ボックス
    rect_b(s, rx, ry + Emu(3380000), rw, Emu(1000000),
           RGBColor(0x1A, 0x06, 0x02), C_FIRE, 2.0)
    rect(s, rx, ry + Emu(3380000), Emu(40000), Emu(1000000), C_FIRE)
    tb(s, rx + Emu(65000), ry + Emu(3430000), rw - Emu(85000), Emu(260000),
       "総括", 9, bold=True, color=C_FIRE)
    tb(s, rx + Emu(65000), ry + Emu(3700000), rw - Emu(85000), Emu(620000),
       "十字目変換×高純増×二段階天井の三位一体。\n"
       "原作の「炎の色」をゲーム性に昇華した\n"
       "2026年導入機の中で設計完成度が高い一台。",
       8, color=C_WHITE)

    net_note(s)
    footer(s, "本機の設計思想：「毎Gに意味・直感的期待表示・保険設計・多層目標」の4原則を次世代機設計に活用せよ",
           "炎炎ノ消防隊2の十字目変換フローは現代ATの教科書的事例として参照価値が高い")


# ══════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════
def main():
    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H

    s_title(prs)    # 1: タイトル・スペック・3ポイント
    s_flow(prs)     # 2: ゲームフロー全体図
    s_normal(prs)   # 3: 通常時の遊び方
    s_at_flow(prs)  # 4: AT炎炎激闘・十字目変換フロー詳細
    s_extend(prs)   # 5: 出玉を伸ばす方法
    s_upper(prs)    # 6: 上位モード
    s_design(prs)   # 7: 面白さの設計
    s_pros_cons(prs) # 8: 良い点と課題
    s_matome(prs)   # 9: まとめ・設計から学べること

    prs.save(OUT_PATH)
    print(f"Saved: {OUT_PATH}")


if __name__ == "__main__":
    main()
