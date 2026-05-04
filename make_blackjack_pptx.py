"""
スマスロ スーパーブラックジャック 機種説明＋分析 統合版資料 v1
（セブンリーグ（山佐ネクス）・2025年2月3日導入）
出力: proposals/機種分析/スーパーブラックジャック/blackjack_guide_v1.pptx
テーマ: カジノグリーン × 金(C_GOLD) × 赤 × 白（カジノ・カード世界観）

Part A: 説明パート（プレイヤー視点）  スライド1〜6
Part B: 分析パート                    スライド7〜9
"""
import io
import os
import sys
from PIL import Image as PILImage, ImageDraw
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

OUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)),
           "proposals", "機種分析", "スーパーブラックジャック", "blackjack_guide_v1.pptx")
os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)

# ── カラーパレット（カジノグリーン×金×赤×白）────────────────────
C_BG    = RGBColor(0x03, 0x14, 0x0B)   # ディープカジノグリーン
C_CARD  = RGBColor(0x05, 0x1E, 0x10)   # カード背景
C_CARD2 = RGBColor(0x07, 0x26, 0x16)   # カード背景2
C_ROW   = RGBColor(0x06, 0x22, 0x12)   # テーブル奇数行
C_GRN   = RGBColor(0x0A, 0x6B, 0x3C)   # カジノグリーン
C_GRN2  = RGBColor(0x12, 0x9E, 0x58)   # 明るいグリーン
C_GOLD  = RGBColor(0xC8, 0xA8, 0x40)   # 金（メイン）
C_GOLD2 = RGBColor(0xFF, 0xD7, 0x00)   # 輝く金
C_RED   = RGBColor(0xCC, 0x11, 0x11)   # 赤（カードの赤）
C_RED2  = RGBColor(0xFF, 0x33, 0x33)   # 明るい赤
C_WHITE = RGBColor(0xF0, 0xF0, 0xF0)   # ホワイト
C_CREAM = RGBColor(0xD8, 0xCA, 0xA8)   # クリーム
C_GRAY  = RGBColor(0x88, 0x99, 0x88)   # グレー
C_LTGRY = RGBColor(0x44, 0x55, 0x44)   # ダークグレー
C_BLK   = RGBColor(0x08, 0x08, 0x08)   # ブラック（スペードクラブ）

FONT_H = "游明朝"
FONT_B = "メイリオ"
SLIDE_W = Inches(10)
SLIDE_H = Inches(5.625)

TOTAL_SLIDES = 9


# ── 背景生成（カジノグリーン×金のフェルト風）────────────────────
def make_bg(w=1280, h=720):
    img = PILImage.new("RGB", (w, h), (3, 20, 11))
    draw = ImageDraw.Draw(img)
    # フェルト風の細かいドット/グリッド
    for i in range(0, w + h, 60):
        draw.line([(i, 0), (0, i)], fill=(5, 28, 15), width=1)
    for i in range(0, w + h, 60):
        draw.line([(0, i), (i, 0)], fill=(5, 28, 15), width=1)
    # 下部の金グロー
    for y in range(h - 120, h):
        t = (y - (h - 120)) / 120
        r = int(40 * t)
        g = int(30 * t)
        draw.line([(0, y), (w, y)], fill=(r, g, 0))
    # 上部薄暗化
    for y in range(0, 50):
        t = (50 - y) / 50 * 0.4
        draw.line([(0, y), (w, y)], fill=(0, int(6 * t), 0))
    # 右端のアクセントライン（金）
    for x in range(w - 6, w):
        draw.line([(x, 0), (x, h)], fill=(0x88, 0x60, 0x10))
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


# ── ヘルパー関数 ───────────────────────────────────────────────
def rect(slide, x, y, w, h, color):
    """塗りつぶし矩形（ボーダーなし）"""
    shp = slide.shapes.add_shape(1, x, y, w, h)
    shp.fill.solid()
    shp.fill.fore_color.rgb = color
    shp.line.fill.background()
    return shp


def rect_b(slide, x, y, w, h, fill, border, bw=1.0):
    """塗りつぶし矩形（ボーダーあり）"""
    shp = slide.shapes.add_shape(1, x, y, w, h)
    shp.fill.solid()
    shp.fill.fore_color.rgb = fill
    shp.line.color.rgb = border
    shp.line.width = Pt(bw)
    return shp


def tb(slide, x, y, w, h, text, size=10, bold=False, color=None,
       align=PP_ALIGN.LEFT, font=None, wrap=True):
    """テキストボックス"""
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


def hdr(slide, title_text, pg=""):
    """スライドヘッダー（グリーンライン＋タイトル）"""
    rect(slide, 0, 0, SLIDE_W, Inches(0.58), C_CARD)
    rect(slide, 0, 0, Emu(45000), Inches(0.58), C_GRN)
    tb(slide, Inches(0.15), Emu(28000), Inches(8.5), Emu(410000),
       title_text, 14, bold=True, color=C_GOLD, font=FONT_H)
    if pg:
        tb(slide, Inches(8.8), Emu(45000), Inches(1.0), Emu(340000),
           pg, 8, color=C_GRAY, align=PP_ALIGN.RIGHT)
    rect(slide, 0, Inches(0.58), SLIDE_W, Emu(7000), C_GRN)


def net_note(slide):
    """右下の※ネット解析情報より"""
    tb(slide, Inches(8.0), Inches(5.35), Inches(1.85), Emu(200000),
       "※ネット解析情報より", 7, color=C_GRAY, align=PP_ALIGN.RIGHT)


def footer(slide, design_comment, sub_text=""):
    """フッター（設計コメント＋補足）"""
    fy = Inches(5.05)
    rect(slide, 0, fy, SLIDE_W, Inches(0.55), RGBColor(0x02, 0x0E, 0x06))
    tb(slide, Inches(0.2), fy + Emu(30000), Inches(7.0), Emu(380000),
       "【設計】" + design_comment, 7.5, bold=True, color=C_GOLD)
    if sub_text:
        tb(slide, Inches(0.2), fy + Emu(230000), Inches(7.5), Emu(200000),
           sub_text, 6.5, color=C_GRAY)
    net_note(slide)


def arrow_r(slide, x, cy, col=None):
    """右向き矢印"""
    shp = slide.shapes.add_shape(13, x, cy - Emu(90000), Emu(200000), Emu(180000))
    shp.fill.solid()
    shp.fill.fore_color.rgb = col or C_GRN
    shp.line.fill.background()


def arrow_d(slide, cx, y, col=None):
    """下向き矢印"""
    shp = slide.shapes.add_shape(17, cx - Emu(90000), y, Emu(180000), Emu(200000))
    shp.fill.solid()
    shp.fill.fore_color.rgb = col or C_GRN
    shp.line.fill.background()


# ══════════════════════════════════════════════════════════════
#  SLIDE 1: タイトル・スペック・この台の3ポイント
# ══════════════════════════════════════════════════════════════
def s_title(prs):
    """Part A – スライド1: タイトル・スペック・3ポイント"""
    s = new_slide(prs)

    # 左パネル（タイトル領域）
    rect(s, 0, 0, Inches(5.2), SLIDE_H, RGBColor(0x02, 0x10, 0x08))
    rect(s, 0, 0, Emu(55000), SLIDE_H, C_GRN)
    rect(s, Inches(5.2), 0, Emu(8000), SLIDE_H, C_GOLD)

    # PartAバッジ
    rect(s, Inches(0.22), Inches(0.2), Inches(1.4), Emu(260000), C_GRN)
    tb(s, Inches(0.22), Inches(0.2), Inches(1.4), Emu(260000),
       "Part A 説明編", 7.5, bold=True, color=C_BG, align=PP_ALIGN.CENTER)

    tb(s, Inches(0.22), Inches(0.6), Inches(5.0), Emu(300000),
       "機種説明＋分析 統合版資料 v1", 10, color=C_GOLD, font=FONT_H)
    tb(s, Inches(0.22), Inches(1.0), Inches(5.0), Emu(550000),
       "スマスロ\nスーパーブラックジャック", 26, bold=True, color=C_GOLD2, font=FONT_H)
    tb(s, Inches(0.22), Inches(2.85), Inches(5.0), Emu(280000),
       "── カードゲームとパチスロの融合が生む新感覚体験", 9, color=C_CREAM, font=FONT_H)

    # アワードバッジ
    rect_b(s, Inches(0.22), Inches(3.35), Inches(2.9), Emu(270000),
           RGBColor(0x3A, 0x2A, 0x00), C_GOLD, 1.5)
    tb(s, Inches(0.22), Inches(3.35), Inches(2.9), Emu(270000),
       "  パチスロアワード2025 BRONZE受賞", 8.5, bold=True, color=C_GOLD2, align=PP_ALIGN.CENTER)

    tb(s, Inches(0.22), Inches(3.82), Inches(5.0), Emu(220000),
       "メーカー: セブンリーグ（山佐ネクス）　導入: 2025年2月3日", 8, color=C_GRAY)
    tb(s, Inches(0.22), Inches(4.07), Inches(5.0), Emu(220000),
       "設定: 1〜6段階　　ボーナス確率: 1/241.7〜1/181.3", 8, color=C_GRAY)
    tb(s, Inches(0.22), Inches(4.32), Inches(5.0), Emu(220000),
       "機械割: 97.8〜112.7%　　純増: 約5.1枚/G（ST/ボーナス中）", 8, color=C_GRAY)
    tb(s, Inches(0.22), Inches(4.57), Inches(5.0), Emu(220000),
       "4号機「スーパーブラックジャック」のリメイク機", 8, color=C_CREAM)

    # 右：この台の3ポイント
    kws = [
        (C_GRN,  "SBJループ（出玉の核心）",
         "BIG→RC高確→リオチャンス→ストックタイム\n連チャンを繰り返して大量出玉獲得"),
        (C_RED,  "リオチャンス（昇格型ボーナス）",
         "前半・後半の2パートで報酬昇格を抽選\nカードをめくる演出がブラックジャック世界観"),
        (C_GOLD, "ジョーカーモード（上位状態）",
         "スーパーSST当選率UP・大量ストック期待\nジョーカーランプ点灯で滞在濃厚"),
    ]
    rx = Inches(5.42)
    for i, (col, ttl, desc) in enumerate(kws):
        ry = Inches(0.72 + i * 1.5)
        rect_b(s, rx, ry, Inches(4.4), Inches(1.3), C_CARD2, col, 1.5)
        rect(s, rx, ry, Emu(55000), Inches(1.3), col)
        tb(s, rx + Emu(70000), ry + Emu(50000), Inches(3.8), Emu(280000),
           ttl, 10.5, bold=True, color=col)
        tb(s, rx + Emu(70000), ry + Emu(330000), Inches(3.8), Emu(560000),
           desc, 8, color=C_CREAM)

    footer(s,
           "BIG→ループ型の連チャン設計。4号機リメイクながら現代スマスロで完全再構築",
           "原作のリオチャンス・ストックタイムの「ストック放出型」DNA を継承しつつ、スマスロの差枚数管理に昇華")


# ══════════════════════════════════════════════════════════════
#  SLIDE 2: ゲームフロー全体図
# ══════════════════════════════════════════════════════════════
def s_gameflow(prs):
    """Part A – スライド2: ゲームフロー全体図（蛇行2段）"""
    s = new_slide(prs)
    hdr(s, "ゲームフロー全体図", f"2 / {TOTAL_SLIDES}")

    # ── 上段（通常〜初当り）────────────────────────────────────
    nodes_top = [
        (C_LTGRY, "通常時\n（低確/高確）"),
        (C_GRN,   "ボーナス\n高確"),
        (C_GOLD,  "BIG BONUS\n(青7/赤7)"),
        (C_GRN2,  "RC高確\n(リオチャンス\n高確率)"),
    ]
    xs = [Inches(0.3), Inches(2.55), Inches(4.8), Inches(7.05)]
    for i, (col, label) in enumerate(nodes_top):
        rect_b(s, xs[i], Inches(0.75), Inches(1.9), Inches(1.5), C_CARD2, col, 2.0)
        tb(s, xs[i], Inches(0.75), Inches(1.9), Inches(1.5),
           label, 9.5, bold=True, color=col, align=PP_ALIGN.CENTER)

    # 上段矢印
    for i in range(len(nodes_top) - 1):
        arrow_r(s, xs[i] + Inches(1.9), Inches(0.75) + Inches(0.75), C_GOLD)

    # 右上から下へ折り返し矢印
    arrow_d(s, Inches(7.05) + Inches(0.95), Inches(2.25), C_GOLD)

    # ── 下段（リオチャンス〜ジョーカーモード）─────────────────
    nodes_bot = [
        (C_GOLD,  "ジョーカー\nモード"),
        (C_GRN2,  "スーパー\nストックタイム"),
        (C_GRN,   "ストックタイム\n(50G+α)"),
        (C_RED,   "リオチャンス\n(RC)"),
    ]
    xs_b = [Inches(0.3), Inches(2.55), Inches(4.8), Inches(7.05)]
    for i, (col, label) in enumerate(nodes_bot):
        rect_b(s, xs_b[i], Inches(2.9), Inches(1.9), Inches(1.5), C_CARD2, col, 2.0)
        tb(s, xs_b[i], Inches(2.9), Inches(1.9), Inches(1.5),
           label, 9.5, bold=True, color=col, align=PP_ALIGN.CENTER)

    # 下段矢印（右→左方向）
    for i in range(len(nodes_bot) - 1, 0, -1):
        ax = xs_b[i - 1] + Inches(1.9)
        cy = Inches(2.9) + Inches(0.75)
        shp = s.shapes.add_shape(14, ax, cy - Emu(90000), Emu(200000), Emu(180000))
        shp.fill.solid()
        shp.fill.fore_color.rgb = C_GOLD
        shp.line.fill.background()

    # エンディングボーナス（右下）
    rect_b(s, Inches(7.8), Inches(2.9), Inches(2.0), Inches(1.5),
           RGBColor(0x3A, 0x2A, 0x00), C_GOLD2, 2.0)
    tb(s, Inches(7.8), Inches(2.9), Inches(2.0), Inches(1.5),
       "エンディング\nボーナス\n(差枚数完走)", 9, bold=True, color=C_GOLD2, align=PP_ALIGN.CENTER)

    # REG BONUS（サイドボックス）
    rect_b(s, Inches(9.0), Inches(0.75), Inches(0.9), Inches(1.5),
           C_CARD2, C_RED2, 1.5)
    tb(s, Inches(9.0), Inches(0.75), Inches(0.9), Inches(1.5),
       "REG\nBONUS", 8, bold=True, color=C_RED2, align=PP_ALIGN.CENTER)

    # 天井表示
    rect_b(s, Inches(0.3), Inches(4.65), Inches(4.6), Emu(310000),
           RGBColor(0x10, 0x18, 0x10), C_GRAY, 1.0)
    tb(s, Inches(0.4), Inches(4.68), Inches(4.4), Emu(280000),
       "天井: BIG間最大999G → BIG確定　|　スイカ天井: 規定回数到達でSTに直撃", 8, color=C_CREAM)

    footer(s,
           "BIG→RC高確→RC→STのループが出玉の本体。REGはシナリオ昇格のカウンター役",
           "有利区間管理：差枚数2000枚超でエンディング移行。ジョーカーモードは終了後に確定移行")


# ══════════════════════════════════════════════════════════════
#  SLIDE 3: 通常時の遊び方
# ══════════════════════════════════════════════════════════════
def s_normal(prs):
    """Part A – スライド3: 通常時の遊び方（ルート・天井）"""
    s = new_slide(prs)
    hdr(s, "通常時の遊び方 ── 初当りへの3ルート", f"3 / {TOTAL_SLIDES}")

    # 3ルートカード
    routes = [
        (C_GRN,  "①チャンス役ルート",
         "スイカ・チェリーなどのチャンス役で\nボーナス高確への移行を抽選\n"
         "スイカは天井カウンターにもなる",
         "最もオーソドックスな突入ルート"),
        (C_RED,  "②小役連続ルート",
         "通常時に小役が複数回連続すると\n高確率状態（ボーナス高確）に移行\n"
         "設定が高いほど移行率がUP",
         "設定判別の重要指標でもある"),
        (C_GOLD, "③ゲーム数天井ルート",
         "BIG間999G消化でBIG確定\n（BIGスルー時は天井カウントあり）\nスイカ規定回数到達でSTに直撃",
         "低設定でも拾える狙い目ルート"),
    ]
    for i, (col, ttl, body, note) in enumerate(routes):
        rx = Inches(0.22 + i * 3.25)
        ry = Inches(0.78)
        rect_b(s, rx, ry, Inches(3.0), Inches(3.2), C_CARD2, col, 2.0)
        rect(s, rx, ry, Inches(3.0), Emu(60000), col)
        tb(s, rx + Emu(40000), ry + Emu(70000), Inches(2.7), Emu(270000),
           ttl, 10.5, bold=True, color=col)
        tb(s, rx + Emu(40000), ry + Emu(340000), Inches(2.7), Emu(1150000),
           body, 8.5, color=C_WHITE)
        rect_b(s, rx + Emu(40000), ry + Emu(1540000), Inches(2.7), Emu(330000),
               RGBColor(0x04, 0x18, 0x0A), col, 0.8)
        tb(s, rx + Emu(60000), ry + Emu(1560000), Inches(2.6), Emu(310000),
           note, 7.5, color=C_CREAM)

    # BIG BONUS 2種類
    rect_b(s, Inches(0.22), Inches(4.15), Inches(9.6), Emu(680000),
           C_CARD, C_GRN, 1.0)
    tb(s, Inches(0.35), Inches(4.18), Inches(9.2), Emu(260000),
       "BIG BONUS 2種類", 10, bold=True, color=C_GRN2)
    tb(s, Inches(0.35), Inches(4.45), Inches(4.4), Emu(310000),
       "青7揃い BIG（300枚払い出し）→ RC高確確定・SBJループ突入", 8.5, color=C_WHITE)
    tb(s, Inches(4.9), Inches(4.45), Inches(4.9), Emu(310000),
       "赤7揃い BIG（100枚払い出し）→ RC高確移行・ループ期待度やや低", 8.5, color=C_RED2)

    footer(s,
           "通常時は「いかに早くBIGを引くか」に集約。高確移行ルートを複数設けることで単調さを回避",
           "スイカは天井カウンター兼高確移行契機の二役。スイカ天井はAT直撃（ST）なので中間狙いも有効")


# ══════════════════════════════════════════════════════════════
#  SLIDE 4: ブラックジャックゲームの仕組み
# ══════════════════════════════════════════════════════════════
def s_bjmechanism(prs):
    """Part A – スライド4: ブラックジャックゲームの仕組み（独自ゲーム性）"""
    s = new_slide(prs)
    hdr(s, "ブラックジャックゲームの仕組み ── 独自ゲーム性の核心", f"4 / {TOTAL_SLIDES}")

    # リオチャンス説明（左大ブロック）
    rect_b(s, Inches(0.22), Inches(0.75), Inches(5.5), Inches(4.1), C_CARD, C_RED, 2.0)
    tb(s, Inches(0.35), Inches(0.82), Inches(5.2), Emu(280000),
       "リオチャンス（RC）── 昇格型ボーナス準備状態", 11, bold=True, color=C_RED2)
    tb(s, Inches(0.35), Inches(1.2), Inches(5.2), Emu(1200000),
       "RCはBIG後のRC高確中にボーナス当選で移行する「準備状態」。\n"
       "カードをめくる演出でブラックジャックの世界観を表現。\n\n"
       "【前半パート】カードをめくって報酬を昇格抽選\n"
       "  → REG / エピソードボーナス / BIG へ昇格の可能性\n\n"
       "【後半パート】「狙えカットイン」のタイミングで報酬確定\n"
       "  → 報酬の種類によってストックタイム(ST)移行が決まる\n\n"
       "RC3回→金BARシナリオへ昇格→次RC時にジョーカーモード大チャンス",
       8.5, color=C_WHITE)

    # ストックタイム説明（右上）
    rect_b(s, Inches(5.95), Inches(0.75), Inches(3.85), Inches(2.0), C_CARD2, C_GRN, 1.5)
    tb(s, Inches(6.05), Inches(0.82), Inches(3.6), Emu(250000),
       "ストックタイム（ST）", 10.5, bold=True, color=C_GRN2)
    tb(s, Inches(6.05), Inches(1.15), Inches(3.6), Emu(1280000),
       "継続: 50G〜777G（リプレイ・レア役でRC抽選）\n"
       "リーチ目出現 → RC濃厚\n"
       "平均ストック数: 約2個\n"
       "獲得RCは50Gごとに放出", 8.5, color=C_WHITE)

    # スーパーストックタイム（右中）
    rect_b(s, Inches(5.95), Inches(2.9), Inches(3.85), Inches(1.95), C_CARD2, C_GOLD, 2.0)
    tb(s, Inches(6.05), Inches(2.97), Inches(3.6), Emu(250000),
       "スーパーストックタイム（SST）", 10.5, bold=True, color=C_GOLD2)
    tb(s, Inches(6.05), Inches(3.3), Inches(3.6), Emu(1100000),
       "継続: 100G+α　純増: 約5.1枚/G（ベルナビ発生）\n"
       "消化中だけで500枚以上獲得可能\n"
       "RCを大量ストック→放出で爆発力抜群\n"
       "ジョーカーモード中はSST当選率が大幅UP", 8.5, color=C_WHITE)

    footer(s,
           "「カードをめくって昇格確認」という行為がBJ体験を演出。リール機にカードゲームを融合した希少設計",
           "RC前半・後半の2段構えで、プレイヤーは「まず昇格を期待→確定タイミングで報酬確認」という2つのドキドキを体験")


# ══════════════════════════════════════════════════════════════
#  SLIDE 5: AT/ボーナス（出玉の伸ばし方）
# ══════════════════════════════════════════════════════════════
def s_bonus(prs):
    """Part A – スライド5: AT/ボーナス 出玉が伸びる仕組み"""
    s = new_slide(prs)
    hdr(s, "AT/ボーナス ── 何をすれば出玉が伸びるか", f"5 / {TOTAL_SLIDES}")

    # SBJループ図
    flow = [
        (C_GOLD,  "BIG BONUS\n青7/赤7"),
        (C_GRN,   "RC高確\n（ループの土台）"),
        (C_RED,   "リオチャンス\n（RC）"),
        (C_GRN2,  "ストックタイム\n（ST/SST）"),
    ]
    fxs = [Inches(0.3), Inches(2.72), Inches(5.14), Inches(7.56)]
    for i, (col, label) in enumerate(flow):
        rect_b(s, fxs[i], Inches(0.78), Inches(2.2), Inches(1.45), C_CARD2, col, 2.0)
        tb(s, fxs[i], Inches(0.78), Inches(2.2), Inches(1.45),
           label, 10, bold=True, color=col, align=PP_ALIGN.CENTER)
        if i < len(flow) - 1:
            arrow_r(s, fxs[i] + Inches(2.2), Inches(0.78) + Inches(0.725), col)

    # 折り返し矢印（ST→RC高確へ）
    tb(s, Inches(0.4), Inches(2.45), Inches(9.2), Emu(220000),
       "↑ RCをストックして放出 → BIG当選 → RC高確継続 → SBJループ繰り返し ↑", 9,
       bold=True, color=C_GOLD, align=PP_ALIGN.CENTER)

    # 出玉ポイント
    pts = [
        (C_GRN,  "RC高確維持が最重要",
         "BIG後は必ずRC高確移行。\nRC高確中のボーナス当選でRC突入。\nRC高確が続く限りループは継続する。"),
        (C_RED,  "RCでの報酬昇格を狙う",
         "RC前半のカード演出で BIG昇格が理想。\nBIG獲得→ST移行→大量RC放出で爆発。\nREGはシナリオカウンター（3回→金BAR）。"),
        (C_GOLD, "SSTで一気に積む",
         "SSTは純増5.1枚×100G以上で500枚超。\nジョーカーモード中はSST頻発。\nエンディングまで駆け抜ければ最高。"),
    ]
    for i, (col, ttl, body) in enumerate(pts):
        rx = Inches(0.22 + i * 3.25)
        rect_b(s, rx, Inches(2.8), Inches(3.0), Inches(2.0), C_CARD, col, 1.5)
        tb(s, rx + Emu(50000), Inches(2.88), Inches(2.7), Emu(280000),
           ttl, 10, bold=True, color=col)
        tb(s, rx + Emu(50000), Inches(3.22), Inches(2.7), Emu(1250000),
           body, 8, color=C_CREAM)

    footer(s,
           "「ST中にRCをどれだけストックできるか」が1セットの出玉規模を決める核心変数",
           "純増5.1枚のSSTを何度引けるかが連チャンの深さを左右。RC3回→金BARシナリオ昇格はジョーカーモードへの最短ルート")


# ══════════════════════════════════════════════════════════════
#  SLIDE 6: 上位ATへの道（ジョーカーモード）
# ══════════════════════════════════════════════════════════════
def s_joker(prs):
    """Part A – スライド6: 上位ATへの道とジョーカーモードの遊び方"""
    s = new_slide(prs)
    hdr(s, "上位ATへの道 ── ジョーカーモード", f"6 / {TOTAL_SLIDES}")

    # ジョーカーモード概要
    rect_b(s, Inches(0.22), Inches(0.75), Inches(9.6), Inches(1.05),
           RGBColor(0x28, 0x20, 0x00), C_GOLD2, 2.0)
    tb(s, Inches(0.4), Inches(0.82), Inches(9.2), Emu(320000),
       "ジョーカーモード：RC高確のロングバージョン。滞在中はSST当選率が大幅UP。ジョーカーランプ（筐体上部）が点灯で滞在濃厚",
       9.5, bold=True, color=C_GOLD2)

    # 突入条件
    tb(s, Inches(0.3), Inches(1.92), Inches(9.0), Emu(280000),
       "ジョーカーモード 突入条件", 11, bold=True, color=C_GOLD)
    conditions = [
        (C_GRN,  "①エンディング後",
         "エンディングボーナス（差枚数2000枚完走）終了後\n→ ジョーカーモード確定移行"),
        (C_RED,  "②スペシャルエピソードボーナス",
         "RC経由のREGを3回引いて金BARシナリオ昇格後\n4回目のREG（スペシャルエピソード発生）"),
        (C_GOLD, "③有利区間リセット時",
         "有利区間リセット（設定変更除く）\n→ 必ずジョーカーモード突入"),
        (C_GRN2, "④その他の条件",
         "金BAR獲得 / RC高確中に差枚2000枚でRC当選\n/ 有利区間差枚1800枚でRC当選"),
    ]
    for i, (col, ttl, body) in enumerate(conditions):
        rx = Inches(0.22 + (i % 2) * 4.85)
        ry = Inches(2.32 + (i // 2) * 1.35)
        rect_b(s, rx, ry, Inches(4.6), Inches(1.2), C_CARD2, col, 1.5)
        rect(s, rx, ry, Emu(55000), Inches(1.2), col)
        tb(s, rx + Emu(70000), ry + Emu(50000), Inches(4.2), Emu(260000),
           ttl, 10, bold=True, color=col)
        tb(s, rx + Emu(70000), ry + Emu(320000), Inches(4.2), Emu(640000),
           body, 8, color=C_CREAM)

    footer(s,
           "ジョーカーモードはSST頻発モード。RC3回→金BAR→スペシャルエピソードが最もオーソドックスな到達ルート",
           "ランプ消灯でも滞在継続の可能性あり。ジョーカーモード中REG引くと次RCに必ずSST出現が最大の恩恵")


# ══════════════════════════════════════════════════════════════
#  SLIDE 7: 面白さの設計（カードゲームとパチスロの融合）
# ══════════════════════════════════════════════════════════════
def s_design(prs):
    """Part B – スライド7: 面白さの設計（なぜカードゲーム×パチスロが機能するか）"""
    s = new_slide(prs)
    hdr(s, "面白さの設計 ── カードゲームとパチスロの融合がなぜ機能するか", f"7 / {TOTAL_SLIDES}")

    # PartBバッジ
    rect(s, Inches(9.0), Inches(0.0), Inches(1.0), Inches(0.58), C_RED)
    tb(s, Inches(9.0), Emu(25000), Inches(1.0), Emu(340000),
       "Part B", 8, bold=True, color=C_WHITE, align=PP_ALIGN.CENTER)

    design_pts = [
        (C_RED,  "インタラクション設計",
         "RCのカードめくり演出は「プレイヤーが選択・確認する」行為を模倣。\n"
         "パチスロは本来受動的だが、BJ演出で能動感を演出。\n"
         "報酬昇格の瞬間に「自分が勝った」感覚を付与。"),
        (C_GRN,  "2段階ドキドキ設計",
         "前半（昇格を期待） → 後半（確定確認）の2パートで\n"
         "1回のRCに2つの感情的ピークを設計。\n"
         "単純な「当たった/外れた」より体験密度が高い。"),
        (C_GOLD, "ループ × カウンター設計",
         "SBJループは「次もある」という期待を持続させる設計。\n"
         "REGのカウンター（3回→金BAR）は悔しさを次回への動機に変換。\n"
         "損失を「蓄積」に変える心理設計。"),
        (C_GRN2, "4号機リメイクの情緒価値",
         "原作「スーパーブラックジャック」のプレイヤーへのノスタルジー。\n"
         "リオチャンス・ストックタイムの名称を踏襲し親近感を担保。\n"
         "新規層には新鮮、経験者には懐かしい二重訴求。"),
    ]
    for i, (col, ttl, body) in enumerate(design_pts):
        rx = Inches(0.22 + (i % 2) * 4.85)
        ry = Inches(0.85 + (i // 2) * 1.75)
        rect_b(s, rx, ry, Inches(4.6), Inches(1.55), C_CARD, col, 1.5)
        rect(s, rx, ry, Emu(55000), Inches(1.55), col)
        tb(s, rx + Emu(70000), ry + Emu(55000), Inches(4.2), Emu(280000),
           ttl, 10, bold=True, color=col)
        tb(s, rx + Emu(70000), ry + Emu(340000), Inches(4.2), Emu(820000),
           body, 8, color=C_CREAM)

    footer(s,
           "「カードゲームの意思決定感覚」をパチスロの演出に落とし込んだ希少な設計アプローチ",
           "BJ本来のルール（21を目指す）をそのまま使うのではなく、「昇格」という概念に変換した点が巧みな翻訳設計")


# ══════════════════════════════════════════════════════════════
#  SLIDE 8: 良い点と課題
# ══════════════════════════════════════════════════════════════
def s_pros_cons(prs):
    """Part B – スライド8: 良い点と課題"""
    s = new_slide(prs)
    hdr(s, "良い点と課題", f"8 / {TOTAL_SLIDES}")

    # 良い点
    rect_b(s, Inches(0.22), Inches(0.75), Inches(4.65), Inches(4.1), C_CARD, C_GRN2, 2.0)
    rect(s, Inches(0.22), Inches(0.75), Inches(4.65), Emu(65000), C_GRN)
    tb(s, Inches(0.35), Inches(0.82), Inches(4.3), Emu(280000),
       "良い点（Pros）", 11, bold=True, color=C_GRN2)
    pros = [
        "● BJ演出でパチスロに能動感を付与（業界稀少）",
        "● RC2段構えで1回の当選体験の密度が高い",
        "● SBJループの連鎖性が高く「次もある」期待を持続",
        "● ジョーカーモードという明確な上位状態で目標設定しやすい",
        "● 4号機リメイクによる情緒価値・二重訴求（新旧ユーザー）",
        "● 天井・スイカ天井で狙い目が明確。ホールでの立ち回りしやすさ◎",
        "● スペック（機械割）は設定5で110%・高設定は十分な性能",
    ]
    for i, txt in enumerate(pros):
        tb(s, Inches(0.35), Inches(1.26) + Emu(i * 390000), Inches(4.3), Emu(360000),
           txt, 8, color=C_WHITE)

    # 課題
    rect_b(s, Inches(5.1), Inches(0.75), Inches(4.72), Inches(4.1), C_CARD, C_RED2, 2.0)
    rect(s, Inches(5.1), Inches(0.75), Inches(4.72), Emu(65000), C_RED)
    tb(s, Inches(5.23), Inches(0.82), Inches(4.3), Emu(280000),
       "課題（Cons）", 11, bold=True, color=C_RED2)
    cons = [
        "● 低設定は初当り確率が重く「何もできない」体験になりやすい",
        "● BIGを引けないとループが始まらない完全ボーナス依存設計",
        "● RC昇格なしのREGは出玉貢献が低く、連続で引くと消化感",
        "● SBJループは理解するまでゲームフローが複雑に見える",
        "● ジョーカーモードの認識にランプ依存（演出上の分かりにくさ）",
        "● BJ要素が「演出」止まりで実際の戦略性はない（好みが分かれる）",
    ]
    for i, txt in enumerate(cons):
        tb(s, Inches(5.23), Inches(1.26) + Emu(i * 430000), Inches(4.3), Emu(400000),
           txt, 8, color=C_WHITE)

    footer(s,
           "高設定での爆発力・BJ演出の新鮮さはBRONZE受賞に値するが、低設定での体験改善が普及の鍵",
           "「BJ演出が楽しめるかどうか」がこの台との相性を決定する。純粋な連チャン快感だけを求めるユーザーには刺さりにくい")


# ══════════════════════════════════════════════════════════════
#  SLIDE 9: まとめ・設計から学べること
# ══════════════════════════════════════════════════════════════
def s_summary(prs):
    """Part B – スライド9: まとめ・設計から学べること"""
    s = new_slide(prs)
    hdr(s, "まとめ ── 設計から学べること", f"9 / {TOTAL_SLIDES}")

    # 総括ボックス
    rect_b(s, Inches(0.22), Inches(0.75), Inches(9.6), Inches(0.9),
           RGBColor(0x28, 0x20, 0x00), C_GOLD, 2.0)
    tb(s, Inches(0.4), Inches(0.82), Inches(9.2), Emu(550000),
       "スマスロ SBJは「他ジャンルのゲーム性をパチスロに翻訳した実践例」として\n"
       "設計の教科書的価値を持つ。パチスロアワード2025 BRONZE受賞もその証左。",
       9.5, bold=True, color=C_CREAM)

    # 学び3点
    learnings = [
        (C_GRN,  "設計学び①\n異ジャンル翻訳",
         "BJ（ボード/カードゲーム）の「昇格確認」への翻訳\n"
         "→ 既存ゲームの面白さをそのまま使わず、\n"
         "　パチスロの文脈に合う形に変換する発想が重要。\n"
         "「21を目指す戦略性」→「昇格期待の演出体験」への昇華"),
        (C_RED,  "設計学び②\n感情ピーク2段化",
         "前半（昇格期待）× 後半（報酬確定）の2段階設計\n"
         "→ 1回の当選に複数の感情ピークを組み込む手法は\n"
         "　様々なゲームジャンルに応用可能。\n"
         "「ドキドキの数」を増やすことで体験価値を高める"),
        (C_GOLD, "設計学び③\nループ×カウンター",
         "SBJループ（連鎖）× REGカウンター（蓄積）の組み合わせ\n"
         "→「失敗が次回への期待に変換される」設計は\n"
         "　プレイヤーのモチベーション維持に直結。\n"
         "悔しさ・損失を「次は成功する」動機に変える心理工学"),
    ]
    for i, (col, ttl, body) in enumerate(learnings):
        rx = Inches(0.22 + i * 3.25)
        ry = Inches(1.82)
        rect_b(s, rx, ry, Inches(3.0), Inches(2.85), C_CARD, col, 2.0)
        rect(s, rx, ry, Inches(3.0), Emu(55000), col)
        tb(s, rx + Emu(50000), ry + Emu(65000), Inches(2.7), Emu(330000),
           ttl, 9, bold=True, color=col)
        tb(s, rx + Emu(50000), ry + Emu(400000), Inches(2.7), Emu(1850000),
           body, 7.5, color=C_CREAM)

    # 総合評価
    rect_b(s, Inches(0.22), Inches(4.83), Inches(9.6), Emu(390000),
           C_CARD2, C_GOLD2, 1.5)
    tb(s, Inches(0.4), Inches(4.87), Inches(9.2), Emu(350000),
       "総合：カードゲームIPとパチスロの融合を「演出翻訳」で成立させた意欲作。"
       "高設定のループ爆発力と新感覚BJ演出が評価され受賞。"
       "低設定の体験改善が次の課題。",
       8.5, bold=True, color=C_GOLD2)

    footer(s,
           "「異ジャンル翻訳×感情2段化×ループカウンター」の3軸設計がSBJの本質",
           "4号機リメイクという情緒的入口と、スマスロとしての現代設計の両立が2025年のBRONZE評価を獲得した要因")


# ══════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════
def main():
    prs = Presentation()
    prs.slide_width  = SLIDE_W
    prs.slide_height = SLIDE_H

    print("Slide 1: タイトル・スペック・3ポイント")
    s_title(prs)
    print("Slide 2: ゲームフロー全体図")
    s_gameflow(prs)
    print("Slide 3: 通常時の遊び方")
    s_normal(prs)
    print("Slide 4: ブラックジャックゲームの仕組み")
    s_bjmechanism(prs)
    print("Slide 5: AT/ボーナス（出玉の伸ばし方）")
    s_bonus(prs)
    print("Slide 6: 上位AT（ジョーカーモード）")
    s_joker(prs)
    print("Slide 7: 面白さの設計")
    s_design(prs)
    print("Slide 8: 良い点と課題")
    s_pros_cons(prs)
    print("Slide 9: まとめ・設計から学べること")
    s_summary(prs)

    prs.save(OUT_PATH)
    print(f"\n保存完了: {OUT_PATH}")


if __name__ == "__main__":
    main()
