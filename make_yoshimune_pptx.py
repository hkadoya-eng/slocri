"""
「真打吉宗」完全解説 PowerPoint ジェネレーター
出力: proposals/yoshimune_guide_v1.pptx
"""
import io
import os
import sys
import random
from PIL import Image as PILImage, ImageDraw, ImageFilter, ImageEnhance
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

OUT_PATH = os.path.join(os.path.dirname(__file__), "proposals", "yoshimune_guide_v5.pptx")

# ── カラーパレット（江戸・吉宗テーマ）──────────────────────────
C_BG       = RGBColor(0x07, 0x07, 0x0E)   # 深夜の黒
C_CARD     = RGBColor(0x12, 0x0C, 0x04)   # 漆黒・焦げ茶
C_CARD2    = RGBColor(0x10, 0x10, 0x28)   # 藍
C_GOLD     = RGBColor(0xD4, 0xA5, 0x20)   # 金
C_GOLD2    = RGBColor(0xFF, 0xD7, 0x60)   # 明るい金
C_RED      = RGBColor(0xCC, 0x22, 0x00)   # 朱
C_CRIMSON  = RGBColor(0x99, 0x00, 0x00)   # 深紅
C_INDIGO   = RGBColor(0x1A, 0x1A, 0x5C)   # 藍色
C_BLUE     = RGBColor(0x33, 0x66, 0xDD)   # 青
C_LTBLUE   = RGBColor(0x88, 0xAA, 0xFF)   # 薄青
C_CREAM    = RGBColor(0xF5, 0xE6, 0xC8)   # 和紙色
C_WHITE    = RGBColor(0xFF, 0xFF, 0xFF)
C_LTGRAY   = RGBColor(0xBB, 0xBB, 0xBB)
C_GRAY     = RGBColor(0x88, 0x88, 0x88)
C_DARKGRAY = RGBColor(0x44, 0x44, 0x44)
C_GREEN    = RGBColor(0x22, 0xBB, 0x55)
C_ORANGE   = RGBColor(0xFF, 0x88, 0x00)
C_YELLOW   = RGBColor(0xFF, 0xEE, 0x44)
C_PURPLE   = RGBColor(0x88, 0x33, 0xCC)

SLIDE_W = Inches(10)
SLIDE_H = Inches(5.625)


# ── Pillow 背景生成 ────────────────────────────────────────────
def make_edo_bg(width=960, height=540):
    """江戸風暗い背景"""
    random.seed(7)
    img = PILImage.new("RGB", (width, height), (7, 7, 14))
    draw = ImageDraw.Draw(img)

    # 縦縞（暖簾風）
    for x in range(0, width, 48):
        alpha_val = random.randint(8, 22)
        col = random.choice([(80, 40, 0), (60, 10, 10), (20, 20, 60)])
        draw.rectangle([x, 0, x + 22, height], fill=(*col,))

    # 霧・靄
    overlay = PILImage.new("RGBA", (width, height), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay, "RGBA")
    for _ in range(80):
        x = random.randint(0, width)
        y = random.randint(0, height)
        r = random.randint(40, 200)
        a = random.randint(5, 25)
        od.ellipse([x - r, y - r, x + r, y + r], fill=(20, 10, 5, a))
    img = PILImage.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    img = img.filter(ImageFilter.GaussianBlur(2))
    return img


def make_title_bg(width=960, height=540):
    """タイトル用 赤×金×黒"""
    img = make_edo_bg(width, height)
    draw = ImageDraw.Draw(img)
    # 右側に赤い縦帯
    draw.rectangle([width - 320, 0, width, height], fill=(80, 5, 5))
    # 金の装飾線
    for y in range(0, height, 60):
        draw.line([(width - 320, y), (width, y)], fill=(100, 70, 10), width=1)
    img = img.filter(ImageFilter.GaussianBlur(1))
    return img


def pil_to_stream(pil_img):
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG")
    buf.seek(0)
    return buf


# ── pptx ヘルパー ──────────────────────────────────────────────
def new_slide(prs, bg=C_BG):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    fill = s.background.fill
    fill.solid()
    fill.fore_color.rgb = bg
    return s


def add_pic(slide, pil_img, left, top, w, h):
    slide.shapes.add_picture(pil_to_stream(pil_img), left, top, w, h)


def rect(slide, l, t, w, h, color):
    shp = slide.shapes.add_shape(1, l, t, w, h)
    shp.fill.solid()
    shp.fill.fore_color.rgb = color
    shp.line.fill.background()
    return shp


def rect_b(slide, l, t, w, h, fill, border, bpt=1.5):
    shp = slide.shapes.add_shape(1, l, t, w, h)
    shp.fill.solid()
    shp.fill.fore_color.rgb = fill
    shp.line.color.rgb = border
    shp.line.width = Pt(bpt)
    return shp


def tb(slide, l, t, w, h, text, sz=10, bold=False, color=C_WHITE,
       align=PP_ALIGN.LEFT, italic=False, wrap=True):
    txb = slide.shapes.add_textbox(l, t, w, h)
    tf = txb.text_frame
    tf.word_wrap = wrap
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.size = Pt(sz)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = color
    run.font.name = "メイリオ"
    return txb


def hdr(slide, text, color=C_GOLD):
    rect(slide, Inches(0), Inches(0), SLIDE_W, Emu(430000), RGBColor(0x12, 0x08, 0x02))
    rect(slide, Inches(0), Inches(0), Emu(80000), Emu(430000), color)
    tb(slide, Emu(150000), Emu(60000), Inches(9.5), Emu(340000),
       text, 14, bold=True, color=color)


def mini_card(slide, l, t, w, h, title, body, tc=C_GOLD, bc=C_CREAM, bg=None, sz_body=9):
    bg_col = bg or C_CARD
    rect_b(slide, l, t, w, h, bg_col, tc, 1.5)
    tb(slide, l + Emu(80000), t + Emu(60000), w - Emu(160000), Emu(320000),
       title, 9.5, bold=True, color=tc)
    tb(slide, l + Emu(80000), t + Emu(360000), w - Emu(160000), h - Emu(420000),
       body, sz_body, color=bc)


def flow_box(slide, l, t, w, h, text, fill, border, sz=9.5, bold=True):
    rect_b(slide, l, t, w, h, fill, border, 1.5)
    tb(slide, l, t, w, h, text, sz, bold=bold, color=C_WHITE, align=PP_ALIGN.CENTER)


def arrow_r(slide, x, y, size=Emu(160000), color=C_GRAY):
    shp = slide.shapes.add_shape(13, x, y - size // 4, size, size // 2)
    shp.fill.solid()
    shp.fill.fore_color.rgb = color
    shp.line.fill.background()


def arrow_d(slide, x, y, color=C_GRAY):
    w, h = Emu(100000), Emu(180000)
    shp = slide.shapes.add_shape(13, x - w // 2, y, w, h)
    shp.rotation = 90
    shp.fill.solid()
    shp.fill.fore_color.rgb = color
    shp.line.fill.background()


# ══════════════════════════════════════════════════════════════
#  SLIDE 1: タイトル
# ══════════════════════════════════════════════════════════════
def s_title(prs):
    s = new_slide(prs)
    bg = make_title_bg(960, 540)
    add_pic(s, bg, Inches(0), Inches(0), SLIDE_W, SLIDE_H)

    # 左側オーバーレイ
    rect(s, Inches(0), Inches(0), Inches(6.5), SLIDE_H, RGBColor(0x05, 0x03, 0x01))

    # 縦アクセント線
    rect(s, Inches(0.35), Inches(0.4), Emu(40000), Inches(3.2), C_GOLD)

    tb(s, Inches(0.55), Inches(0.45), Inches(5.5), Emu(380000),
       "スマスロ 大都技研  2026年4月6日導入", 10, color=C_GRAY)
    tb(s, Inches(0.55), Inches(0.9), Inches(5.8), Emu(600000),
       "真打 吉宗", 48, bold=True, color=C_GOLD2)
    tb(s, Inches(0.55), Inches(2.3), Inches(5.8), Emu(380000),
       "完全解説ガイド  ──  ゲーム性・フロー・設定差をすべて理解する", 11, italic=True, color=C_CREAM)

    # キャッチ
    rect(s, Inches(0.55), Inches(3.1), Inches(5.5), Emu(700000), RGBColor(0x18, 0x08, 0x00))
    rect(s, Inches(0.55), Inches(3.1), Emu(60000), Emu(700000), C_RED)
    tb(s, Inches(0.75), Inches(3.18), Inches(5.1), Emu(650000),
       "初代2003年から続く伝説のシリーズ最新作\n"
       "「真BB 2000枚 × 1G連」で爆発する\n"
       "一撃性能と周期システムを徹底解剖",
       11, color=C_CREAM)

    # 右下 導入情報
    tb(s, Inches(6.6), Inches(4.8), Inches(3.2), Emu(320000),
       "機械割  設定1: 97.8%  /  設定6: 114.0%",
       9, color=C_GOLD, align=PP_ALIGN.RIGHT)


# ══════════════════════════════════════════════════════════════
#  SLIDE 2: 吉宗シリーズの歴史
# ══════════════════════════════════════════════════════════════
def s_history(prs):
    s = new_slide(prs)
    hdr(s, "HISTORY  ──  吉宗シリーズの歴史と「真打」の意味")

    timeline = [
        ("2003", "初代 吉宗",
         "業界初・シャッター付き液晶\n全国26万台設置（歴代2位）\n爆裂1G連AT・「おじゃる！」の衝撃\nパチスロ文化を変えた伝説機",
         C_RED, C_CRIMSON),
        ("2013", "吉宗（AT機）",
         "時代の変化でAT機に転換\nゲーム性を現代仕様に再構成\nシリーズファンへの橋渡し役",
         C_GRAY, C_DARKGRAY),
        ("2015", "吉宗 ～極～",
         "BB払出320枚に強化\n演出・システムをさらに進化\n「極」の名の通りパワーアップ",
         C_GRAY, C_DARKGRAY),
        ("2025", "スマスロ 吉宗",
         "スマスロ初代として復活\n天井999G、16:9液晶\n往年のファンを熱狂させた",
         C_GOLD, C_CARD),
        ("2026", "真打 吉宗",
         "スマスロシリーズの集大成\n真BB2000枚 × 1G連を搭載\n「真打」＝歌舞伎で最高位の称号",
         C_GOLD2, RGBColor(0x20, 0x10, 0x00)),
    ]

    bw = Inches(1.77)
    bh = Inches(3.6)
    by = Inches(0.85)
    for i, (year, name, desc, col, bg) in enumerate(timeline):
        bx = Inches(0.2) + i * (bw + Emu(50000))
        is_latest = (i == 4)
        border = C_GOLD2 if is_latest else (C_RED if i == 0 else C_DARKGRAY)
        rect_b(s, bx, by, bw, bh, bg, border, 2.0 if is_latest else 1.0)

        # 年
        rect(s, bx, by, bw, Emu(380000), border)
        tb(s, bx, by + Emu(50000), bw, Emu(300000),
           year, 16, bold=True, color=C_WHITE if is_latest else C_BG,
           align=PP_ALIGN.CENTER)
        tb(s, bx + Emu(80000), by + Emu(420000), bw - Emu(160000), Emu(380000),
           name, 10, bold=True, color=col)
        tb(s, bx + Emu(80000), by + Emu(790000), bw - Emu(160000), bh - Emu(850000),
           desc, 8.5, color=C_CREAM if is_latest else C_LTGRAY)

    # 「真打」説明
    rect(s, Inches(0.2), Inches(4.55), Inches(9.6), Emu(430000),
         RGBColor(0x18, 0x10, 0x00))
    tb(s, Inches(0.35), Inches(4.62), Inches(9.2), Emu(370000),
       "「真打（しんうち）」とは歌舞伎・落語の世界で最高位の称号。シリーズの集大成として、初代の魂を受け継ぎながら進化した最終形態を意味する。",
       9.5, color=C_GOLD)


# ══════════════════════════════════════════════════════════════
#  SLIDE 3: 基本スペック
# ══════════════════════════════════════════════════════════════
def s_spec(prs):
    s = new_slide(prs)
    hdr(s, "SPEC  ──  基本スペック一覧")

    # 左カラム：スペック表
    LX = Inches(0.2)
    rect(s, LX, Inches(0.85), Inches(4.7), Emu(380000), C_RED)
    tb(s, LX + Emu(80000), Inches(0.88), Inches(4.5), Emu(340000),
       "基本スペック", 11, bold=True, color=C_WHITE)

    specs = [
        ("メーカー", "大都技研"),
        ("タイプ", "スマスロ（L型）AT機"),
        ("導入日", "2026年4月6日"),
        ("AT純増", "約2.7枚/G（通常）/ 約9.0枚/G（真BB）"),
        ("ベース", "約31G／50枚"),
        ("CZ初当り", "設定1: 1/313.0  〜  設定6: 1/250.6"),
        ("AT初当り", "設定1: 1/488.9  〜  設定6: 1/354.9"),
        ("CZ天井", "1,000G（真BB後は700Gに短縮）"),
        ("AT天井", "1,500G"),
    ]
    sy = Inches(1.32)
    for j, (k, v) in enumerate(specs):
        bg = RGBColor(0x12, 0x08, 0x02) if j % 2 == 0 else RGBColor(0x18, 0x10, 0x04)
        rect(s, LX, sy, Inches(4.7), Emu(325000), bg)
        tb(s, LX + Emu(80000), sy + Emu(25000), Inches(1.4), Emu(280000),
           k, 8.5, color=C_GRAY, wrap=False)
        tb(s, LX + Emu(1580000), sy + Emu(25000), Inches(2.9), Emu(280000),
           v, 9, bold=True, color=C_CREAM)
        sy += Emu(330000)

    # 右カラム：機械割グラフ
    RX = Inches(5.2)
    rect(s, RX, Inches(0.85), Inches(4.6), Emu(380000), C_RED)
    tb(s, RX + Emu(80000), Inches(0.88), Inches(4.4), Emu(340000),
       "設定別 機械割", 11, bold=True, color=C_WHITE)

    settings = [
        ("設定1", 97.8,  "97.8%",  C_LTGRAY),
        ("設定2", 100.5, "100.5%", C_LTGRAY),
        ("設定3", 102.1, "102.1%", C_LTGRAY),
        ("設定4", 104.5, "104.5%", C_YELLOW),
        ("設定5", 107.8, "107.8%", C_ORANGE),
        ("設定6", 114.0, "114.0%", C_GOLD2),
    ]
    bar_lx   = RX + Emu(700000)
    bar_wmax = Inches(2.0)           # バーを短くしてラベル幅を確保
    bar_h    = Emu(240000)
    gy = Inches(1.35)
    for lbl, val, val_str, col in settings:
        ratio = (val - 95) / (114 - 95)
        rect(s, bar_lx, gy, bar_wmax, bar_h, RGBColor(0x20, 0x15, 0x05))
        rect(s, bar_lx, gy, int(bar_wmax * ratio), bar_h, col)
        tb(s, RX + Emu(80000), gy + Emu(30000), Emu(580000), Emu(240000),
           lbl, 9, color=C_CREAM, wrap=False)
        tb(s, bar_lx + bar_wmax + Emu(100000), gy + Emu(20000), Emu(900000), Emu(260000),
           val_str, 10, bold=True, color=col, wrap=False)
        gy += Emu(345000)

    # 注記
    rect(s, Inches(0.2), Inches(4.55), Inches(9.6), Emu(450000), RGBColor(0x08, 0x04, 0x00))
    tb(s, Inches(0.35), Inches(4.62), Inches(9.2), Emu(390000),
       "設定6の114.0%は現行スマスロの中でも高水準。設定1の97.8%は微マイナスだが天井（CZ間1000G / AT間1500G）がカバー。",
       9, color=C_GOLD)


# ══════════════════════════════════════════════════════════════
#  SLIDE 4: 通常時の仕組み
# ══════════════════════════════════════════════════════════════
def s_normal(prs):
    s = new_slide(prs)
    hdr(s, "通常時の仕組み  ──  夜回りカウンター × 周期システム × CZモード4種")

    # ── 夜回りカウンター（左上）──
    rect_b(s, Inches(0.2), Inches(0.85), Inches(3.1), Inches(2.1),
           C_CARD, C_GOLD, 1.5)
    tb(s, Inches(0.3), Inches(0.9), Inches(2.8), Emu(330000),
       "① 夜回りカウンター", 10, bold=True, color=C_GOLD)
    tb(s, Inches(0.3), Inches(1.25), Inches(2.9), Inches(1.4),
       "画面左下に常時表示するポイントゲージ。\n毎ゲーム役に応じてPTが加算される。\n\n"
       "  ハズレ     ▶  1PT\n"
       "  リプレイ   ▶  5PT以上\n"
       "  弱スイカ   ▶  10PT以上\n"
       "  強チェリー ▶  さらに大量PT\n\n"
       "規定PT（100〜600PT）到達で周期進行！",
       8.5, color=C_CREAM)

    # ── 周期システム（中上）──
    rect_b(s, Inches(3.45), Inches(0.85), Inches(3.1), Inches(2.1),
           C_CARD, C_RED, 1.5)
    tb(s, Inches(3.55), Inches(0.9), Inches(2.9), Emu(330000),
       "② 周期システム", 10, bold=True, color=C_RED)
    tb(s, Inches(3.55), Inches(1.25), Inches(2.9), Inches(1.4),
       "規定PT到達 = 1周期クリア。\n規定周期数に到達するとCZ「悪人成敗チャンス」へ。\n\n"
       "周期カウンターの色が示唆する：\n"
       "  白…通常  /  青…やや期待\n"
       "  赤…大チャンス  /  金…CZ濃厚",
       8.5, color=C_CREAM)

    # ── CZモード4種（右上）──
    rect_b(s, Inches(6.7), Inches(0.85), Inches(3.1), Inches(2.1),
           C_CARD, C_GOLD2, 1.5)
    tb(s, Inches(6.8), Inches(0.9), Inches(2.9), Emu(330000),
       "③ CZモード4種（内部管理）", 10, bold=True, color=C_GOLD2)
    modes = [
        ("通常A", "最大6周期でCZ当選", C_LTGRAY),
        ("通常B", "通常Aより少ない周期", C_LTGRAY),
        ("通常C", "最速ルート（少周期）", C_YELLOW),
        ("天国",  "1周期のみ・CZ最速", C_GOLD2),
    ]
    my = Inches(1.27)
    for m_name, m_desc, m_col in modes:
        tb(s, Inches(6.8), my, Inches(0.85), Emu(280000), m_name, 8.5, bold=True, color=m_col)
        tb(s, Inches(7.65), my, Inches(2.0), Emu(280000), m_desc, 8.5, color=C_CREAM)
        my += Emu(285000)

    # ── 抜刀チャンス（左下）──
    rect_b(s, Inches(0.2), Inches(3.1), Inches(4.7), Inches(1.5),
           RGBColor(0x14, 0x05, 0x00), C_RED, 1.5)
    tb(s, Inches(0.3), Inches(3.15), Inches(4.4), Emu(330000),
       "④ 抜刀チャンス（ベル10PT到達で発生）", 10, bold=True, color=C_RED)
    tb(s, Inches(0.3), Inches(3.55), Inches(4.4), Inches(0.9),
       "刀エフェクトが走る演出バトル。\n"
       "成功 → ポイント特化ゾーン or CZ直当選\n"
       "スイカ契機なら「人馬一体チャンス以上」濃厚！\n"
       "刀エフェクトが豪華なほど期待度UP",
       8.5, color=C_CREAM)

    # ── 通常時フロー図（右下）──
    rect_b(s, Inches(5.1), Inches(3.1), Inches(4.7), Inches(1.5),
           RGBColor(0x08, 0x08, 0x18), C_BLUE, 1.5)
    tb(s, Inches(5.2), Inches(3.15), Inches(4.4), Emu(330000),
       "通常時フロー（ざっくり）", 10, bold=True, color=C_BLUE)
    tb(s, Inches(5.2), Inches(3.55), Inches(4.4), Inches(0.9),
       "毎ゲーム夜回りPT加算\n  ↓ 規定PT到達\n周期クリア（最大6周期）\n  ↓ 規定周期到達\nCZ「悪人成敗チャンス」へ！",
       8.5, color=C_LTBLUE)

    # ── 下注記 ──
    rect(s, Inches(0.2), Inches(4.7), Inches(9.6), Emu(380000), RGBColor(0x08, 0x05, 0x00))
    tb(s, Inches(0.35), Inches(4.76), Inches(9.2), Emu(330000),
       "★ 天国モード時は1周期のみでCZ到達。AT後は天国移行率約43%なので「連チャンしやすい状態」が頻繁に発生する。",
       9, color=C_GOLD)


# ══════════════════════════════════════════════════════════════
#  SLIDE 5: CZ → AT「勧善懲悪RUSH」
# ══════════════════════════════════════════════════════════════
def s_cz_at(prs):
    s = new_slide(prs)
    hdr(s, "CZ → AT  ──  悪人成敗チャンス → 勧善懲悪RUSH")

    # CZブロック（左）
    rect_b(s, Inches(0.2), Inches(0.85), Inches(4.4), Inches(3.0),
           RGBColor(0x14, 0x06, 0x00), C_RED, 2.0)
    tb(s, Inches(0.3), Inches(0.90), Inches(4.1), Emu(330000),
       "CZ「悪人成敗チャンス」", 12, bold=True, color=C_RED)
    tb(s, Inches(0.3), Inches(1.28), Inches(4.1), Inches(2.3),
       "成功期待度：約55%\n\n"
       "【ルール】\n"
       "「BARを狙え！」演出が最大3回発生。\n"
       "対戦相手は5種類（強さで期待度変化）。\n"
       "対応役（強チェリー/強スイカ等）成立で\n"
       "大チャンス演出に格上げ。\n\n"
       "成功 → AT「勧善懲悪RUSH」へ直行\n"
       "失敗 → 天国移行抽選（継続のチャンス）",
       9.5, color=C_CREAM)

    # 矢印
    arrow_r(s, Inches(4.65), Inches(2.35), Emu(280000), C_RED)

    # ATブロック（右）
    rect_b(s, Inches(5.1), Inches(0.85), Inches(4.7), Inches(3.0),
           RGBColor(0x06, 0x06, 0x18), C_BLUE, 2.0)
    tb(s, Inches(5.2), Inches(0.90), Inches(4.4), Emu(330000),
       "AT「勧善懲悪RUSH」", 12, bold=True, color=C_LTBLUE)
    tb(s, Inches(5.2), Inches(1.28), Inches(4.4), Inches(2.3),
       "差枚数管理型AT  /  純増：約2.7枚/G\n初期差枚数：150枚\n\n"
       "【消化中の仕組み】\n"
       "  ・毎G：弱スイカ等でPT直乗せ抽選\n"
       "  ・強レア役：上乗せ100%確定\n"
       "  ・弱スイカ：約15%で上乗せ\n\n"
       "  ・40G周期：「勧善懲悪チャンス」\n"
       "    　→ 上乗せ ＋ 真高確率ジャッジ\n"
       "  ・周期10・20G目：柳生一族対決濃厚",
       9.5, color=C_CREAM)

    # 下段：AT内の主な分岐
    rect(s, Inches(0.2), Inches(3.95), Inches(9.6), Emu(40000), C_GOLD)
    tb(s, Inches(0.35), Inches(4.05), Inches(9.2), Emu(330000),
       "AT内の上乗せ分岐", 10, bold=True, color=C_GOLD)

    branches = [
        ("差枚数直乗せ", "毎G小役成立時に\n枚数を直接加算", C_LTGRAY),
        ("ビジョンチャンス", "演出発展で\n大量上乗せ抽選", C_YELLOW),
        ("勧善懲悪チャンス", "40G周期で必ず発生\n勝利で大量上乗せ", C_ORANGE),
        ("真高確率突入", "最大の分岐点\n真BBへの入口", C_RED),
    ]
    bx = Inches(0.25)
    for title, desc, col in branches:
        rect_b(s, bx, Inches(4.42), Inches(2.28), Emu(650000),
               RGBColor(0x10, 0x10, 0x1C), col, 1.2)
        tb(s, bx + Emu(80000), Inches(4.47), Inches(2.1), Emu(290000),
           title, 9, bold=True, color=col)
        tb(s, bx + Emu(80000), Inches(4.75), Inches(2.1), Emu(340000),
           desc, 8, color=C_CREAM)
        bx += Inches(2.42)


# ══════════════════════════════════════════════════════════════
#  SLIDE 6: 真高確率 → 真BB → 1G連
# ══════════════════════════════════════════════════════════════
def s_truemode(prs):
    s = new_slide(prs)
    hdr(s, "クライマックス  ──  真高確率 → 真BB（2000枚）→ 1G連")

    # 真高確率（左）
    rect_b(s, Inches(0.2), Inches(0.85), Inches(2.9), Inches(3.3),
           RGBColor(0x10, 0x05, 0x00), C_ORANGE, 2)
    tb(s, Inches(0.3), Inches(0.90), Inches(2.6), Emu(330000),
       "真高確率ゾーン", 11, bold=True, color=C_ORANGE)
    tb(s, Inches(0.3), Inches(1.28), Inches(2.6), Inches(2.5),
       "AT内「勧善懲悪チャンス」勝利後に\n突入する上乗せ特化状態。\n\n"
       "消化中は「青7を狙え」\nカットインが頻発！\n\n"
       "  青7揃い（約1/168）\n  　↓ 真BIG BONUS確定！\n\n"
       "真BB1枚ごとに上乗せ抽選も走る。\n平均上乗せ：約150枚",
       9, color=C_CREAM)

    # 矢印
    arrow_r(s, Inches(3.2), Inches(2.5), Emu(270000), C_RED)

    # 真BB（中）
    rect_b(s, Inches(3.65), Inches(0.85), Inches(3.1), Inches(3.3),
           RGBColor(0x18, 0x08, 0x00), C_RED, 2.5)
    tb(s, Inches(3.75), Inches(0.90), Inches(2.9), Emu(330000),
       "真 BIG BONUS", 13, bold=True, color=C_GOLD2)
    tb(s, Inches(3.75), Inches(1.28), Inches(2.9), Inches(2.5),
       "獲得枚数：約 2,000枚\n純増：約 9.0枚/G\n\n"
       "【1G連抽選（核心！）】\n消化中に「成敗役」成立で\n次ゲームに連チャン抽選！\n\n"
       "  非成敗役  ▶  約 5.5%で1G連\n"
       "  成敗役   ▶  約30〜100%で1G連\n\n"
       "「月下ノ花道」演出が発生すると\n次の真BB確定！",
       9, color=C_CREAM)

    # 矢印
    arrow_r(s, Inches(6.85), Inches(2.5), Emu(270000), C_GOLD)

    # 1G連（右）
    rect_b(s, Inches(7.3), Inches(0.85), Inches(2.5), Inches(3.3),
           RGBColor(0x1C, 0x14, 0x00), C_GOLD2, 2.5)
    tb(s, Inches(7.4), Inches(0.90), Inches(2.3), Emu(330000),
       "1G連 ループ", 11, bold=True, color=C_GOLD2)
    tb(s, Inches(7.4), Inches(1.28), Inches(2.3), Inches(2.5),
       "真BB終了後、\n次の1ゲームで\n再び真BBが発動！\n\n"
       "ループするたびに\n2000枚×N回が\n積み上がる。\n\n"
       "★ 4〜5連で\n   1万枚超えも夢ではない",
       9, color=C_CREAM)

    # 下段：まとめ
    rect(s, Inches(0.2), Inches(4.25), Inches(9.6), Emu(750000),
         RGBColor(0x14, 0x0A, 0x00))
    rect(s, Inches(0.2), Inches(4.25), Emu(60000), Emu(750000), C_GOLD)

    tb(s, Inches(0.45), Inches(4.3), Inches(9.2), Emu(330000),
       "この台の爆発力の仕組み", 10, bold=True, color=C_GOLD)
    tb(s, Inches(0.45), Inches(4.65), Inches(9.2), Emu(330000),
       "AT（勧善懲悪RUSH）→ 真高確率 → 真BB（2000枚）→ 1G連ループ\n"
       "1G連が連続すれば「2000枚 × 複数回」の大爆発。これが真打吉宗の醍醐味。",
       9.5, color=C_CREAM)


# ══════════════════════════════════════════════════════════════
#  SLIDE 7: 全体ゲームフロー図
# ══════════════════════════════════════════════════════════════
def s_flow(prs):
    s = new_slide(prs)
    hdr(s, "ゲームフロー全体図  ──  通常時から爆発まで")

    # フロー定義
    boxes = [
        # (x, y, w, h, text, fill, border)
        (Inches(0.2),  Inches(0.9),  Inches(2.3), Emu(500000),
         "通常時\n夜回りカウンター\nPT加算", C_CARD, C_GRAY),
        (Inches(0.2),  Inches(1.7),  Inches(2.3), Emu(500000),
         "周期到達\n（100〜600PT×最大6周期）", C_CARD, C_GRAY),
        (Inches(0.2),  Inches(2.55), Inches(2.3), Emu(500000),
         "CZ\n悪人成敗チャンス\n成功率約55%", RGBColor(0x18,0x06,0x00), C_RED),
        (Inches(2.8),  Inches(2.55), Inches(2.3), Emu(500000),
         "AT\n勧善懲悪RUSH\n純増2.7枚/G", RGBColor(0x06,0x06,0x18), C_BLUE),
        (Inches(5.4),  Inches(2.55), Inches(2.3), Emu(500000),
         "真高確率\n青7狙え！\n約1/168で真BB", RGBColor(0x18,0x0A,0x00), C_ORANGE),
        (Inches(7.5),  Inches(2.55), Inches(2.3), Emu(500000),
         "真BB\n約2000枚\n純増9.0枚/G", RGBColor(0x20,0x08,0x00), C_RED),
        (Inches(7.5),  Inches(1.7),  Inches(2.3), Emu(500000),
         "1G連\nループ\n2000枚×N回！", RGBColor(0x22,0x16,0x00), C_GOLD2),
    ]
    for (l, t, w, h, txt, fill, bdr) in boxes:
        rect_b(s, l, t, w, h, fill, bdr, 1.8)
        tb(s, l, t, w, h, txt, 9, bold=True, color=C_WHITE, align=PP_ALIGN.CENTER)

    # 矢印
    def ar(x, y): arrow_d(s, x, y, C_GRAY)
    def arr(x, y): arrow_r(s, x, y, Emu(240000), C_RED)

    ar(Inches(1.35), Inches(1.42))   # 通常時→周期
    ar(Inches(1.35), Inches(2.22))   # 周期→CZ
    arr(Inches(2.55), Inches(2.8))   # CZ→AT
    arr(Inches(5.15), Inches(2.8))   # AT→真高確率
    arr(Inches(7.75), Inches(2.8))   # 真高確率→真BB
    ar(Inches(8.65), Inches(1.72))   # 真BB→1G連

    # 1G連ループ矢印 ── ボックス外側に描く（x=7.3"：ボックス左端7.5"の外）
    rect(s, Inches(7.3), Inches(1.28), Emu(80000), Emu(530000), C_GOLD)   # 縦線（外側）
    rect(s, Inches(7.3), Inches(1.28), Emu(2350000), Emu(80000), C_GOLD)  # 横線上
    # 下向き矢印の三角（右端）
    rect(s, Inches(9.57), Inches(1.28), Emu(80000), Emu(180000), C_GOLD)

    tb(s, Inches(3.8), Inches(0.92), Inches(3.5), Emu(340000),
       "↺ 1G連ループ（2000枚×N）", 9, bold=True, color=C_GOLD2, align=PP_ALIGN.CENTER)

    # 天井ルート
    rect_b(s, Inches(0.2), Inches(3.75), Inches(2.5), Emu(700000),
           RGBColor(0x06, 0x08, 0x28), C_BLUE, 2.0)
    tb(s, Inches(0.32), Inches(3.82), Inches(2.3), Emu(620000),
       "天井ルート\nCZ間 1,000G\nAT間 1,500G\n→ 天井到達でAT保証", 9.5, bold=True, color=C_LTBLUE)

    # 凡例
    rect(s, Inches(3.0), Inches(3.8), Inches(6.8), Emu(750000), RGBColor(0x08, 0x05, 0x00))
    tb(s, Inches(3.15), Inches(3.85), Inches(6.5), Emu(700000),
       "★ 鍵は「真BB + 1G連」。AT自体の純増は2.7枚とおとなしいが、真高確率→真BBに到達すれば\n"
       "　2000枚×複数ループが現実的になる。「当たりをいくつ引けるか」よりも「真BBを連鎖できるか」が勝負。",
       9, color=C_GOLD)


# ══════════════════════════════════════════════════════════════
#  SLIDE 8: 設定示唆・設定差
# ══════════════════════════════════════════════════════════════
def s_setting(prs):
    s = new_slide(prs)
    hdr(s, "設定示唆 & 設定差  ──  高設定を見抜く判別ポイント")

    # 左：設定示唆一覧
    LX = Inches(0.2)
    rect_b(s, LX, Inches(0.85), Inches(4.7), Inches(3.65),
           C_CARD, C_GOLD, 1.5)
    tb(s, LX + Emu(80000), Inches(0.90), Inches(4.4), Emu(330000),
       "設定示唆演出", 11, bold=True, color=C_GOLD)

    hints = [
        ("コパンダトロフィー色",
         "銅→設定2以上 / 銀→設定3以上\n金→設定4以上 / 虹→設定6濃厚！", C_GOLD2),
        ("真BB中ボイス",
         "特定キャラのセリフで示唆\n「江戸を守る！」→ 設定6濃厚", C_RED),
        ("御白洲ビジョン",
         "吉宗＜大岡越前＜天英院\n天英院出現で高設定期待大", C_LTBLUE),
        ("AT終了画面（差枚表示）",
         "456枚→設4以上 / 555枚→設5以上\n666枚→設定6濃厚！", C_ORANGE),
    ]
    hy = Inches(1.3)
    for h_name, h_desc, h_col in hints:
        rect(s, LX + Emu(80000), hy, Inches(4.4), Emu(50000), h_col)
        tb(s, LX + Emu(80000), hy + Emu(60000), Inches(4.4), Emu(270000),
           h_name, 9, bold=True, color=h_col)
        tb(s, LX + Emu(80000), hy + Emu(320000), Inches(4.4), Emu(360000),
           h_desc, 8.5, color=C_CREAM)
        hy += Emu(750000)

    # 右：設定差比較表
    RX = Inches(5.2)
    rect(s, RX, Inches(0.85), Inches(4.6), Emu(380000), C_RED)
    tb(s, RX + Emu(80000), Inches(0.90), Inches(4.4), Emu(340000),
       "設定差まとめ", 11, bold=True, color=C_WHITE)

    cols = ["設定", "CZ初当り", "AT初当り", "機械割"]
    cxs  = [RX + Emu(50000), RX + Emu(800000), RX + Emu(1700000), RX + Emu(2700000)]
    cws  = [Emu(700000), Emu(850000), Emu(900000), Emu(850000)]
    for c, cx, cw in zip(cols, cxs, cws):
        tb(s, cx, Inches(1.3), cw, Emu(320000), c, 9, bold=True, color=C_GOLD, align=PP_ALIGN.CENTER)

    setting_data = [
        ("1", "1/313.0", "1/488.9", "97.8%",  C_LTGRAY),
        ("2", "1/300.3", "1/465.2", "100.5%", C_LTGRAY),
        ("3", "1/288.1", "1/441.8", "102.1%", C_LTGRAY),
        ("4", "1/274.6", "1/415.3", "104.5%", C_YELLOW),
        ("5", "1/261.9", "1/388.4", "107.8%", C_ORANGE),
        ("6", "1/250.6", "1/354.9", "114.0%", C_GOLD2),
    ]
    ry = Inches(1.65)
    for row in setting_data:
        sd, cz, at_prob, mw, col = row
        bg = RGBColor(0x10, 0x08, 0x02) if int(sd) % 2 == 1 else RGBColor(0x16, 0x0E, 0x04)
        rect(s, RX, ry, Inches(4.6), Emu(330000), bg)
        vals = [sd, cz, at_prob, mw]
        for val, cx, cw in zip(vals, cxs, cws):
            c = col if val == mw else (C_GOLD2 if val == sd else C_CREAM)
            tb(s, cx, ry + Emu(30000), cw, Emu(280000),
               val, 9, bold=(val == mw), color=c, align=PP_ALIGN.CENTER, wrap=False)
        ry += Emu(335000)

    # 注記
    rect(s, Inches(0.2), Inches(4.55), Inches(9.6), Emu(450000), RGBColor(0x08, 0x04, 0x00))
    tb(s, Inches(0.35), Inches(4.62), Inches(9.2), Emu(390000),
       "設定差はCZ・AT当選率に集中。設定6の114%は高水準だが「荒い」機種なので、設定4でも厳しい局面あり。判別は累積示唆演出で総合判断が重要。",
       9, color=C_GOLD)


# ══════════════════════════════════════════════════════════════
#  SLIDE 9: 市場評価・総評
# ══════════════════════════════════════════════════════════════
def s_review(prs):
    s = new_slide(prs)
    hdr(s, "市場評価 & 総評  ──  この台を一言で言うと？")

    # 上段：総評カード（高さを十分確保）
    rect_b(s, Inches(0.2), Inches(0.82), Inches(9.6), Emu(900000),
           RGBColor(0x14, 0x08, 0x00), C_GOLD, 2)
    tb(s, Inches(0.35), Inches(0.88), Inches(9.2), Emu(310000),
       "一言まとめ", 10, bold=True, color=C_GOLD)
    tb(s, Inches(0.35), Inches(1.20), Inches(9.2), Emu(480000),
       "「初代吉宗の魂をスマスロで再現した爆裂機。AT自体は地味だが、真BBに辿り着けば"
       "2000枚×1G連ループで一撃性能は業界トップクラス。\n"
       "　荒波は強めで設定1は厳しめだが、設定6の114%は高水準。」",
       9.5, color=C_CREAM)

    # 中段：好評 / 批評（y を一言まとめカード終端+0.1" に）
    rect_b(s, Inches(0.2), Inches(1.92), Inches(4.6), Inches(1.55),
           RGBColor(0x06, 0x14, 0x06), C_GREEN, 1.5)
    tb(s, Inches(0.3), Inches(1.97), Inches(4.3), Emu(310000),
       "ユーザー好評点", 10, bold=True, color=C_GREEN)
    tb(s, Inches(0.3), Inches(2.30), Inches(4.3), Emu(1050000),
       "✔ 「爆発力が凄い。2000枚を複数回取れた」\n"
       "✔ 「真BBの1G連が来た時の興奮は段違い」\n"
       "✔ 「吉宗ファンなら絶対打つべき台」\n"
       "✔ 「周期システムが分かると楽しい」",
       9, color=C_CREAM)

    rect_b(s, Inches(5.1), Inches(1.92), Inches(4.7), Inches(1.55),
           RGBColor(0x14, 0x06, 0x06), C_RED, 1.5)
    tb(s, Inches(5.2), Inches(1.97), Inches(4.4), Emu(310000),
       "ユーザー批評点", 10, bold=True, color=C_RED)
    tb(s, Inches(5.2), Inches(2.30), Inches(4.4), Emu(1050000),
       "✗ 「低設定はATに入っても出ない」\n"
       "✗ 「CZを連続スルーすると萎える」\n"
       "✗ 「真高確率に入れても真BB引けないことも」\n"
       "✗ 「初当りが重く感じる局面がある」",
       9, color=C_CREAM)

    # 下段：導入・稼働概要
    rect_b(s, Inches(0.2), Inches(3.57), Inches(9.6), Emu(480000),
           RGBColor(0x10, 0x08, 0x00), C_GOLD, 1.2)
    tb(s, Inches(0.35), Inches(3.63), Inches(9.2), Emu(390000),
       "導入台数 約15,000台（2026年4月導入）  /  評価 ★1.79（まだ集計途中）  /  吉宗シリーズ累計ファン多数",
       9.5, color=C_GOLD)

    # まとめ（下端を Inches(5.3) 以内に収める）
    rect(s, Inches(0.2), Inches(4.15), Inches(9.6), Emu(700000), RGBColor(0x08, 0x05, 0x00))
    tb(s, Inches(0.35), Inches(4.22), Inches(9.2), Emu(600000),
       "向いているユーザー：「爆発力重視」「吉宗シリーズファン」「高設定を確保できる環境」\n"
       "この3条件が揃う場面で最大限に輝く台。低設定・全台低設定のホールでは荒波に注意。",
       9, color=C_CREAM)


# ══════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════
def main():
    print("=" * 55)
    print("  真打吉宗 完全解説 PowerPoint ジェネレーター")
    print("=" * 55)

    prs = Presentation()
    prs.slide_width  = SLIDE_W
    prs.slide_height = SLIDE_H

    print("\n📊 スライド生成中...")
    s_title(prs);   print("  1/9 タイトル")
    s_history(prs); print("  2/9 吉宗シリーズの歴史")
    s_spec(prs);    print("  3/9 基本スペック")
    s_normal(prs);  print("  4/9 通常時の仕組み")
    s_cz_at(prs);   print("  5/9 CZ → AT")
    s_truemode(prs);print("  6/9 真高確率 → 真BB → 1G連")
    s_flow(prs);    print("  7/9 全体ゲームフロー図")
    s_setting(prs); print("  8/9 設定示唆・設定差")
    s_review(prs);  print("  9/9 市場評価・総評")

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    prs.save(OUT_PATH)
    print(f"\n✅ 保存完了: {OUT_PATH}")


if __name__ == "__main__":
    main()
