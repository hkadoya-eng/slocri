# -*- coding: utf-8 -*-
"""稼働貢献週の定義検証: 「アウトが その週の平均稼働を超えた週の累計数」を再構成し、
SIS公式 contrib_weeks と一致するか確認(平均/中央値どちらの基準かも判定)。
入力: _wk_p*.json + _stats.json"""
import json, io, glob, statistics
from collections import defaultdict

rows=[]
for fp in sorted(glob.glob("_wk_p*.json")):
    with io.open(fp,encoding="utf-8") as f: rows+=json.load(f)
def f_(x):
    try: return float(x)
    except: return None

stats={}
with io.open("_stats.json",encoding="utf-8") as f:
    for r in json.load(f):
        if r.get("machine") and r["machine"]!="__config__":
            stats[r["machine"]]=r.get("contrib_weeks")

# 週ごとの平均/中央値(L機種のみ=sis_weekly_dataの母集団)
wk_vals=defaultdict(list)
for r in rows:
    o=f_(r["out_coins"])
    if o: wk_vals[r["week_start"]].append(o)
wk_mean={w:statistics.mean(v) for w,v in wk_vals.items()}
wk_med ={w:statistics.median(v) for w,v in wk_vals.items()}

M=defaultdict(list)
for r in rows: M[r["machine"]].append(r)

recon=[]
for m,rs in M.items():
    above_mean=sum(1 for r in rs if (f_(r["out_coins"]) or 0) > wk_mean.get(r["week_start"],1e9))
    above_med =sum(1 for r in rs if (f_(r["out_coins"]) or 0) > wk_med.get(r["week_start"],1e9))
    recon.append({"機種":m,"設置":len(rs),"超平均":above_mean,"超中央":above_med,"公式":stats.get(m)})

print(f'{"機種":<30}{"公式":>5}{"超平均":>7}{"超中央":>7}{"設置":>6}')
test=["北斗の拳","モンキーターン","戦国乙女","ヴァルヴレイヴ","真・北斗無双","ディスクアップ","主役は銭形４","ソードアート"]
for t in test:
    for r in recon:
        if t in r["機種"]:
            print(f'{r["機種"][:29]:<30}{str(r["公式"]):>5}{r["超平均"]:>7}{r["超中央"]:>7}{r["設置"]:>6}')

# 全体一致度(公式がある機種で、超平均/超中央 と公式の平均絶対誤差)
both=[r for r in recon if r["公式"] is not None]
def mae(key): return round(statistics.mean(abs(r[key]-r["公式"]) for r in both),1)
print(f'\n公式あり {len(both)}機種  平均絶対誤差: 超平均基準={mae("超平均")}週 / 超中央基準={mae("超中央")}週')
exact_mean=sum(1 for r in both if r["超平均"]==r["公式"])
exact_med =sum(1 for r in both if r["超中央"]==r["公式"])
print(f'完全一致: 超平均={exact_mean}機種 / 超中央={exact_med}機種')
