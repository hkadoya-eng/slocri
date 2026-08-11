# -*- coding: utf-8 -*-
"""13:30収集分のローティス2件で、ループモード名の表記を機種分析側の正式表記に是正する。
検索要約の英訳(Heaven/Bliss/Super Bliss)を「至福・超至福」と書いてしまったが、正式は「極楽・超極楽」。
あわせて「復活モードA」という不確かな名称を「引き戻しモード」に直す。"""
import json, urllib.request, urllib.parse, time

ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwemJ0dXVjb3B1Y2FibHd5cWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Mjk2MzEsImV4cCI6MjA5MTIwNTYzMX0.qry7pSzmm3lWK82Vnp7Wz-R9wHsDVwbj7ysy62xUhuA"
BASE = "https://vpzbtuucopucablwyqeq.supabase.co/rest/v1"

FIXES = {
 "rotis_info_bonus_go_32g_yame_tenjo_900g_neraime_sueoki_350g_rieki_500g_fukkatsu_mode_a_tenjo_200g_follow_kanzen_kokuchi_20260706_kitadenshi_shinki_original_ip_hasu_sbb_stock_tengoku_shifuku_chou_shifuku_3loop_mode":
 "スマスロ ローティスは2026年7月6日導入の北電子・完全告知機で 蓮の花をモチーフにした新規オリジナルIP。天井は最大900Gでボーナス当選の恩恵。据え置き狙いの目安は350G〜 利益を求めるなら500G〜からが目安とされている。立ち回りで効くのはやめ時のほうで 基本はボーナス後32G回してヤメ 時間があるときだけ引き戻しモードの200Gまでフォローする形になる。この32Gという数字が独特で 完全告知機なのに「打ち切る位置」が明確に決まっているため 惰性で回すと期待値が一番薄い区間だけを踏み続けることになる。中身はSBBのストックと天国・極楽・超極楽という3段のループモードの組み合わせで どのモードに居るかで同じゲーム数でも価値がまったく変わる。座る前に見るのは総回転数ではなくボーナス後の消化Gと モード示唆の出方だ。",

 "rotis_jissen_hyouka_nibun_kitadenshi_saitei_class_to_ichigeki_houkoku_ga_dokyo_kanzen_kokuchi_nanoni_taikan_ga_gyaku_sbb_stock_to_tengoku_shifuku_chou_shifuku_3loop_de_dedama_wo_tsukuru_kokuchi_no_saki_ni_sou_ga_aru_hikatta_kaisuu_to_dedama_ga_kamiawanai":
 "スマスロ ローティスの評価はきれいに二分している。北電子の中では最低クラスと言い切る打ち手がいる一方 一撃を取った報告も出ていて 同じ台の話をしているとは思えないほど印象がぶれる。原因は出玉の作り方で 本機はSBBのストックと天国・極楽・超極楽という3段のループモードの組み合わせで伸ばすタイプなので 上位ループに乗れたかどうかで1日の体験がまるごと入れ替わる。完全告知機は本来「引けたかどうかが即分かる」ぶん評価がブレにくいはずだが ローティスは告知の先にストックとループの層があるため 告知が見えても価値が確定しない。ゴーゴーランプ系の完全告知に慣れた人ほど 光った回数と出玉が噛み合わない感覚になりやすい。打つなら告知の回数で満足度を測らず 上位ループに何回触れたかで振り返ったほうが台の性格が見える。",
}

def req(url, method="GET", body=None, extra=None):
    h = {"apikey": ANON, "Authorization": "Bearer " + ANON, "Content-Type": "application/json"}
    if extra: h.update(extra)
    data = json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None
    r = urllib.request.Request(url, data=data, headers=h, method=method)
    with urllib.request.urlopen(r) as res:
        raw = res.read().decode("utf-8")
        return json.loads(raw) if raw.strip() else None

for dk, newbody in FIXES.items():
    q = BASE + "/posts?dup_key=eq." + urllib.parse.quote(dk, safe="")
    for attempt in range(3):
        try:
            got = req(q + "&select=id,title")
            break
        except Exception as e:
            print("retry get", e); time.sleep(5)
    print("target:", [g["id"] for g in got])
    for attempt in range(3):
        try:
            req(q, method="PATCH", body={"body": newbody}, extra={"Prefer": "return=minimal"})
            print("patched", dk[:30])
            break
        except Exception as e:
            print("retry patch", e); time.sleep(5)
    time.sleep(1)
print("done")
