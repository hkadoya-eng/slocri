# -*- coding: utf-8 -*-
"""新台診断テーブル v0.3
- 2週/初月(4週)/8週持続率・台数推移・稼働貢献週・状況(継続中/終了)・判定 を週次SISから算出
- 2週しきい値較正用に寿命別平均を出力
- Excel(説明シート＋データシート)を生成
入力: _wk_p*.json（週次SIS全件）/ 出力: ai収集/分析_新台診断_v0.3.xlsx
"""
import json, io, glob, statistics
from collections import defaultdict

rows=[]
for fp in sorted(glob.glob("_wk_p*.json")):
    with io.open(fp,encoding="utf-8") as f: rows+=json.load(f)
if not rows:
    print("週次ファイル無し"); raise SystemExit

def f_(x):
    try: return float(x)
    except: return None

M=defaultdict(list)
latest=""
for r in rows:
    M[r["machine"]].append(r)
    if r["week_start"]>latest: latest=r["week_start"]
for m in M: M[m].sort(key=lambda x:x["week_start"])

# 2週しきい値(較正後に確定)
R2_OK, R2_WARN = 83, 73
def grade(ret4, ret2):
    if ret4 is not None:
        return "優秀" if ret4>=66 else ("注意" if ret4>=50 else "危険")
    if ret2 is not None:
        return "優秀(暫定)" if ret2>=R2_OK else ("注意(暫定)" if ret2>=R2_WARN else "危険(暫定)")
    return "計測中"

recs=[]
for m,rs in M.items():
    def out(i): return f_(rs[i]["out_coins"]) if len(rs)>i else None
    def mc(i):  return f_(rs[i]["avg_machine_count"]) if len(rs)>i else None
    w1,w2,w4,w8=out(0),out(1),out(3),out(7)
    c1,cL=mc(0),mc(len(rs)-1)
    peakv=[f_(r["avg_machine_count"]) for r in rs if f_(r["avg_machine_count"]) is not None]
    active = rs[-1]["week_start"]>="2026-06-01"
    ret2=round(w2/w1*100) if (w1 and w2) else None
    ret4=round(w4/w1*100) if (w1 and w4) else None
    ret8=round(w8/w1*100) if (w1 and w8) else None
    recs.append({
        "機種":m,"初週":rs[0]["week_start"],
        "稼働貢献週":len(rs),"状況":("継続中" if active else "終了"),
        "継続表示":f'{len(rs)}週{"継続中" if active else "で終了"}',
        "2週持続率":ret2,"初月持続率(4週)":ret4,"8週持続率":ret8,
        "台数初週":round(c1,1) if c1 else None,"台数現在":round(cL,1) if cL else None,
        "台数ピーク":round(max(peakv),1) if peakv else None,
        "台数推移%":round((cL/c1-1)*100) if (c1 and cL) else None,
        "判定":grade(ret4,ret2),
    })

# 較正: 寿命別の2週/4週平均
mat=[r for r in recs if r["初週"]<="2025-09-01"]
def bkt(n): return "短命<=13" if n<=13 else ("長寿>=45" if n>=45 else "中")
G=defaultdict(list)
for r in mat: G[bkt(r["稼働貢献週"])].append(r)
def gm(items,k):
    v=[i[k] for i in items if i.get(k) is not None]
    return round(statistics.mean(v),1) if v else None
print("=== 2週/4週持続率 寿命別平均(2週しきい値較正用) ===")
for b in ["短命<=13","中","長寿>=45"]:
    g=G[b]; print(f'{b}: n={len(g):>3}  2週平均={gm(g,"2週持続率")}  4週平均={gm(g,"初月持続率(4週)")}')

# Excel
try:
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.utils import get_column_letter
    wb=Workbook()

    # --- 説明シート ---
    ws0=wb.active; ws0.title="説明"
    L=[
        ("新台診断テーブル ― 指標の説明", True, "D85A30", 14),
        ("",False,"",11),
        ("【目的】台数やIPは“入口”でしかなく、台の生死を決めるのは『波が客を離さない力＝持続率』。それを早期に数値化して優秀/危険を見抜く。",False,"333333",11),
        ("",False,"",11),
        ("● 初月持続率(4週) = 4週目アウト ÷ 初週アウト",True,"333333",11),
        ("   判定: 優秀≥66% / 注意≥50% / 危険<50%。実データで長寿台の平均66%・短命台47%と明確に分かれた中核指標。",False,"555555",11),
        ("● 2週持続率 = 2週目アウト ÷ 初週アウト",True,"333333",11),
        ("   出て間もない新台(4週未満)の早期サイン。暫定判定: 優秀≥{}% / 注意≥{}% / 危険<{}%（較正値）。".format(R2_OK,R2_WARN,R2_WARN),False,"555555",11),
        ("● 8週持続率 = 8週目アウト ÷ 初週アウト  … 中期の定着度。",True,"333333",11),
        ("● 台数(初週→現在 / 推移% / ピーク) = 1店あたり平均設置台数の変化。減少=店が見切って撤去。",True,"333333",11),
        ("   ⚠ 大量導入(ピーク≥6台)なのに初月持続率が低い → 『供給過剰の疑い』(戦国乙女型)。台数で稼ぎ初動は出るが客が薄まり失速。",False,"C77B00",11),
        ("● 稼働貢献週 / 状況 = SISで稼働を計上した週数と、継続中/終了。『◯週継続中』『◯週で終了』。",True,"333333",11),
        ("● 判定 = 4週が揃えばその基準、まだ揃わない新台は2週基準(暫定)。『計測中』は2週も未到達。",True,"333333",11),
        ("",False,"",11),
        ("【補足・数字の罠】機械割(設定6)は規則で全台115%未満に張り付き＝比較情報価値ゼロ。型式試験は1回約181万円・適合率10〜20%で“運”要素大。",False,"888888",10),
        ("【データ源】SIS週次(sis_weekly_data)。生成: scripts/misc/build_diagnosis_table.py。直近の週次更新に追従。",False,"888888",10),
    ]
    for i,(t,b,c,sz) in enumerate(L,1):
        cell=ws0.cell(i,1,t); cell.font=Font(bold=b,color=c or "000000",size=sz)
        cell.alignment=Alignment(wrap_text=True,vertical="top")
    ws0.column_dimensions["A"].width=110

    # --- データシート ---
    cols=["機種","初週","継続表示","稼働貢献週","状況","2週持続率","初月持続率(4週)","8週持続率",
          "台数初週","台数現在","台数ピーク","台数推移%","判定"]
    ws=wb.create_sheet("新台診断データ")
    ws.append(["※直近導入順。判定/しきい値の意味は『説明』シート参照。"])
    ws.merge_cells(start_row=1,start_column=1,end_row=1,end_column=len(cols))
    ws.cell(1,1).font=Font(italic=True,color="996600")
    ws.append(cols); hr=ws.max_row
    for c in range(1,len(cols)+1):
        cell=ws.cell(hr,c); cell.font=Font(bold=True,color="FFFFFF")
        cell.fill=PatternFill("solid",fgColor="444444"); cell.alignment=Alignment(horizontal="center")
    GC={"優秀":"E3F5E9","注意":"FFF3DC","危険":"FCE4E4","優秀(暫定)":"E3F5E9","注意(暫定)":"FFF3DC","危険(暫定)":"FCE4E4","計測中":"ECECEC"}
    for r in sorted(recs,key=lambda x:x["初週"],reverse=True):
        ws.append([r[c] for c in cols]); rr=ws.max_row
        fill=GC.get(r["判定"]);
        if fill: ws.cell(rr,cols.index("判定")+1).fill=PatternFill("solid",fgColor=fill)
        if ("北斗の拳" in r["機種"] and "転生" not in r["機種"] and "無双" not in r["機種"]) or "モンキーターン" in r["機種"] or "戦国乙女" in r["機種"]:
            ws.cell(rr,1).fill=PatternFill("solid",fgColor="FFF2CC")
    for i,w in enumerate([30,11,12,9,7,9,13,9,9,9,9,9,11],1):
        ws.column_dimensions[get_column_letter(i)].width=w
    ws.freeze_panes="A3"
    wb.save("ai収集/分析_新台診断_v0.3.xlsx")
    print("\n出力: ai収集/分析_新台診断_v0.3.xlsx （説明シート＋データ{}機種）".format(len(recs)))
except ImportError:
    print("openpyxl無し")

# 戦国乙女確認
print("\n=== 戦国乙女 ===")
for r in recs:
    if "戦国乙女" in r["機種"]:
        print(f' {r["機種"][:28]} {r["継続表示"]} 2週={r["2週持続率"]} 4週={r["初月持続率(4週)"]} 台数{r["台数初週"]}→{r["台数現在"]}(Pk{r["台数ピーク"]}) 判定={r["判定"]}')
