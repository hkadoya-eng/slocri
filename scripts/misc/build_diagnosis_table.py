# -*- coding: utf-8 -*-
"""新台診断テーブル v0.4（2軸: 稼働値×持続率）
- 稼働値(アウト÷その週の全機種中央値)=人気/絶対需要、持続率=定着/減衰 の2軸で早期診断
- 2週/初月(4週)/8週持続率・初週/2週稼働値・台数推移・稼働貢献週・状況(継続中/終了)・判定
- Excel(説明シート＋データシート)を生成
入力: _wk_p*.json / 出力: ai収集/分析_新台診断_v0.3.xlsx（同ファイル上書き＝最新版）
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

# 週ごとの全機種アウト中央値（稼働値の基準）
wk_med={}
_tmp=defaultdict(list)
for r in rows:
    o=f_(r["out_coins"])
    if o: _tmp[r["week_start"]].append(o)
for w,a in _tmp.items():
    s=sorted(a); wk_med[w]=s[len(s)//2]

M=defaultdict(list)
for r in rows: M[r["machine"]].append(r)
for m in M: M[m].sort(key=lambda x:x["week_start"])

# 較正済みしきい値
def grade(ret4, ret2, k):
    if ret4 is not None:
        return "優秀" if ret4>=66 else ("注意" if ret4>=50 else "危険")
    if ret2 is not None:
        persistOK, persistBad = ret2>=83, ret2<73
        demandOK = (k is None or k>=260); demandBad = (k is not None and k<190)
        if persistOK and demandOK: return "優秀(暫定)"
        if persistBad or demandBad: return "危険(暫定)"
        return "注意(暫定)"
    return "計測中"

recs=[]
for m,rs in M.items():
    def out(i): return f_(rs[i]["out_coins"]) if len(rs)>i else None
    def mc(i):  return f_(rs[i]["avg_machine_count"]) if len(rs)>i else None
    w1,w2,w4,w8=out(0),out(1),out(3),out(7)
    c1,cL=mc(0),mc(len(rs)-1)
    peakv=[f_(r["avg_machine_count"]) for r in rs if f_(r["avg_machine_count"]) is not None]
    b1,b2=wk_med.get(rs[0]["week_start"]), (wk_med.get(rs[1]["week_start"]) if len(rs)>1 else None)
    active = rs[-1]["week_start"]>="2026-06-01"
    ret2=round(w2/w1*100) if (w1 and w2) else None
    ret4=round(w4/w1*100) if (w1 and w4) else None
    ret8=round(w8/w1*100) if (w1 and w8) else None
    kat1=round(w1/b1*100) if (w1 and b1) else None
    kat2=round(w2/b2*100) if (w2 and b2) else None
    k=kat2 if kat2 is not None else kat1
    recs.append({
        "機種":m,"初週":rs[0]["week_start"],
        "稼働貢献週":len(rs),"状況":("継続中" if active else "終了"),
        "継続表示":f'{len(rs)}週{"継続中" if active else "で終了"}',
        "初週稼働値":kat1,"2週稼働値":kat2,
        "2週持続率":ret2,"初月持続率(4週)":ret4,"8週持続率":ret8,
        "台数初週":round(c1,1) if c1 else None,"台数現在":round(cL,1) if cL else None,
        "台数ピーク":round(max(peakv),1) if peakv else None,
        "台数推移%":round((cL/c1-1)*100) if (c1 and cL) else None,
        "判定":grade(ret4,ret2,k),
    })

# 較正出力
mat=[r for r in recs if r["初週"]<="2025-09-01"]
def bkt(n): return "短命<=13" if n<=13 else ("長寿>=45" if n>=45 else "中")
G=defaultdict(list)
for r in mat: G[bkt(r["稼働貢献週"])].append(r)
def gm(items,k2):
    v=[i[k2] for i in items if i.get(k2) is not None]
    return round(statistics.mean(v),1) if v else None
print("=== 寿命別平均(判別力較正) ===")
for b in ["短命<=13","中","長寿>=45"]:
    g=G[b]; print(f'{b}: n={len(g):>3} 初週稼働値={gm(g,"初週稼働値")} 2週稼働値={gm(g,"2週稼働値")} 2週持続={gm(g,"2週持続率")} 4週持続={gm(g,"初月持続率(4週)")}')

# Excel
try:
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.utils import get_column_letter
    wb=Workbook()
    ws0=wb.active; ws0.title="説明"
    L=[
        ("新台診断テーブル ― 指標の説明（2軸: 稼働値×持続率）", True, "D85A30", 14),
        ("",False,"",11),
        ("【考え方】台数やIPは“入口”でしかない。台の生死は『人気(稼働値)』と『定着(持続率)』の2軸で決まる。2週で仮説→4週/8週で検証。",False,"333333",11),
        ("",False,"",11),
        ("● 稼働値 = アウト ÷ その週の全機種アウト中央値 ×100（人気・絶対需要。市場が来たか）",True,"333333",11),
        ("   寿命別平均: 長寿 初週335%/2週291% ・ 短命 初週262%/2週190%。判別力1.0前後で有効。",False,"555555",11),
        ("● 持続率 = ◯週目アウト ÷ 初週アウト ×100（定着・減衰）",True,"333333",11),
        ("   初月(4週): 優秀≥66/注意≥50/危険<50（長寿66 vs 短命47）。2週: 長寿86 vs 短命72。判別力最強(1.31)。",False,"555555",11),
        ("● 8週持続率 … 中期の定着度。",True,"333333",11),
        ("● 台数(初週→現在 / 推移% / ピーク) = 1店あたり平均設置台数の変化。減少=店が撤去。",True,"333333",11),
        ("● 稼働貢献週 / 状況 = SISで稼働を計上した週数と継続中/終了（『◯週継続中』『◯週で終了』）。",True,"333333",11),
        ("",False,"",11),
        ("【判定ロジック】",True,"333333",12),
        ("  ・4週が揃う → 初月持続率で確定: 優秀≥66% / 注意≥50% / 危険<50%",False,"555555",11),
        ("  ・4週未到達(新台) → 2週で暫定: 稼働値≥260%かつ持続率≥83%=優秀 / 稼働値<190%または持続率<73%=危険 / 中間=注意",False,"555555",11),
        ("  ・2週も未到達 → 計測中",False,"555555",11),
        ("  ・⚠供給過剰 = 大量導入(台数ピーク≥6)なのに判定が注意/危険（戦国乙女型。台数で初動は出るが客が薄まる）",False,"C77B00",11),
        ("",False,"",11),
        ("【非採用】割数(判別力0.34)・台数初動(0.7)は寿命をほぼ分けず材料にしない。機械割(設定6)は規則で全台115%未満に張付き＝比較情報ゼロ。",False,"888888",10),
        ("【データ源】SIS週次(sis_weekly_data)。生成: scripts/misc/build_diagnosis_table.py。週次更新に追従。",False,"888888",10),
    ]
    for i,(t,b,c,sz) in enumerate(L,1):
        cell=ws0.cell(i,1,t); cell.font=Font(bold=b,color=c or "000000",size=sz)
        cell.alignment=Alignment(wrap_text=True,vertical="top")
    ws0.column_dimensions["A"].width=115

    cols=["機種","初週","継続表示","稼働貢献週","状況","初週稼働値","2週稼働値","2週持続率",
          "初月持続率(4週)","8週持続率","台数初週","台数現在","台数ピーク","台数推移%","判定"]
    ws=wb.create_sheet("新台診断データ")
    ws.append(["※直近導入順。判定/しきい値の意味は『説明』シート参照。稼働値=アウト÷週中央値、持続率=◯週÷初週。"])
    ws.merge_cells(start_row=1,start_column=1,end_row=1,end_column=len(cols))
    ws.cell(1,1).font=Font(italic=True,color="996600")
    ws.append(cols); hr=ws.max_row
    for c in range(1,len(cols)+1):
        cell=ws.cell(hr,c); cell.font=Font(bold=True,color="FFFFFF")
        cell.fill=PatternFill("solid",fgColor="444444"); cell.alignment=Alignment(horizontal="center")
    GC={"優秀":"E3F5E9","注意":"FFF3DC","危険":"FCE4E4","優秀(暫定)":"E3F5E9","注意(暫定)":"FFF3DC","危険(暫定)":"FCE4E4","計測中":"ECECEC"}
    for r in sorted(recs,key=lambda x:x["初週"],reverse=True):
        ws.append([r[c] for c in cols]); rr=ws.max_row
        fill=GC.get(r["判定"])
        if fill: ws.cell(rr,cols.index("判定")+1).fill=PatternFill("solid",fgColor=fill)
        if ("北斗の拳" in r["機種"] and "転生" not in r["機種"] and "無双" not in r["機種"]) or "モンキーターン" in r["機種"] or "戦国乙女" in r["機種"]:
            ws.cell(rr,1).fill=PatternFill("solid",fgColor="FFF2CC")
    for i,w in enumerate([30,11,12,9,7,9,9,9,13,9,9,9,9,9,11],1):
        ws.column_dimensions[get_column_letter(i)].width=w
    ws.freeze_panes="A3"
    wb.save("ai収集/分析_新台診断_v0.3.xlsx")
    print("\n出力: ai収集/分析_新台診断_v0.3.xlsx （説明シート＋データ{}機種）".format(len(recs)))
except ImportError:
    print("openpyxl無し")

print("\n=== 戦国乙女 ===")
for r in recs:
    if "戦国乙女" in r["機種"]:
        print(f' {r["機種"][:26]} {r["継続表示"]} 初週稼働値{r["初週稼働値"]} 2週稼働値{r["2週稼働値"]} 2週持続{r["2週持続率"]} 判定={r["判定"]}')
