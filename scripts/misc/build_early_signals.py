# -*- coding: utf-8 -*-
"""2週時点で取れる多角シグナルの判別力検証。
どのシグナルが長寿/短命を最も分けるか＝早期仮説の材料選び。
入力: _wk_p*.json"""
import json, io, glob, statistics
from collections import defaultdict

rows=[]
for fp in sorted(glob.glob("_wk_p*.json")):
    with io.open(fp,encoding="utf-8") as f: rows+=json.load(f)
def f_(x):
    try: return float(x)
    except: return None

# 週ごとの全機種アウト中央値(稼働値の基準=平均稼働)
wk_outs=defaultdict(list)
for r in rows:
    o=f_(r["out_coins"])
    if o: wk_outs[r["week_start"]].append(o)
wk_med={w:statistics.median(v) for w,v in wk_outs.items() if v}

M=defaultdict(list)
for r in rows: M[r["machine"]].append(r)
for m in M: M[m].sort(key=lambda x:x["week_start"])

recs=[]
for m,rs in M.items():
    if len(rs)<2: continue
    w1,w2=f_(rs[0]["out_coins"]),f_(rs[1]["out_coins"])
    d1,d2=f_(rs[0]["avg_machine_count"]),f_(rs[1]["avg_machine_count"])
    p1=f_(rs[0]["payout_rate"])
    fw,sw=rs[0]["week_start"],rs[1]["week_start"]
    base1,base2=wk_med.get(fw),wk_med.get(sw)
    recs.append({
        "機種":m,"初週":fw,"寿命":len(rs),
        "2週持続率": round(w2/w1*100) if (w1 and w2) else None,
        "初週稼働値": round(w1/base1*100) if (w1 and base1) else None,   # 市場が来たか(絶対力)
        "2週稼働値": round(w2/base2*100) if (w2 and base2) else None,
        "台数初動%": round((d2/d1-1)*100) if (d1 and d2) else None,        # 店が即増やす/削る
        "初週割数": p1,
        "台数初週": d1,
    })

mat=[r for r in recs if r["初週"]<="2025-09-01"]
def bkt(n): return "短命<=13" if n<=13 else ("長寿>=45" if n>=45 else "中")
G=defaultdict(list)
for r in mat: G[bkt(r["寿命"])].append(r)
def gm(items,k):
    v=[i[k] for i in items if i.get(k) is not None]
    return round(statistics.mean(v),1) if v else None

sigs=["2週持続率","初週稼働値","2週稼働値","台数初動%","初週割数","台数初週"]
print(f"成熟機種 {len(mat)} / 週中央値基準\n")
print(f'{"シグナル":<12}{"短命<=13":>10}{"中":>8}{"長寿>=45":>10}{"長寿-短命":>10}{"判別力":>8}')
for s in sigs:
    a=gm(G["短命<=13"],s); c=gm(G["中"],s); b=gm(G["長寿>=45"],s)
    if a is None or b is None:
        print(f'{s:<12}{str(a):>10}{str(c):>8}{str(b):>10}'); continue
    gap=round(b-a,1)
    # 判別力 = 長寿と短命の差 / 全体ばらつき
    allv=[x[s] for x in mat if x.get(s) is not None]
    sd=statistics.pstdev(allv) if len(allv)>1 else 0
    power=round(abs(gap)/sd,2) if sd else 0
    print(f'{s:<12}{a:>10}{str(c):>8}{b:>10}{gap:>10}{power:>8}')

print("\n※判別力(=|長寿-短命|/標準偏差)が大きいほど、2週時点で生死を分ける力が強い")

print("\n=== 戦国乙女 早期シグナル ===")
for r in recs:
    if "戦国乙女" in r["機種"]:
        print(f' {r["機種"][:26]} 2週持続{r["2週持続率"]} 初週稼働値{r["初週稼働値"]} 2週稼働値{r["2週稼働値"]} 台数初動{r["台数初動%"]}% 台数{r["台数初週"]}')
