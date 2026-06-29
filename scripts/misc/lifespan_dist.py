# -*- coding: utf-8 -*-
"""寿命分布: 何週超えると良いかの根拠づけ。終了機=確定寿命、現役機=打ち切り(まだ伸びる)を区別。"""
import json, io, glob, statistics
from collections import defaultdict

rows=[]
for fp in sorted(glob.glob("_wk_p*.json")):
    with io.open(fp,encoding="utf-8") as f: rows+=json.load(f)

M=defaultdict(list)
for r in rows: M[r["machine"]].append(r)
for m in M: M[m].sort(key=lambda x:x["week_start"])

mats=[]
for m,rs in M.items():
    if rs[0]["week_start"]>"2025-09-01": continue  # 成熟(生死が出る時間あり)
    active = rs[-1]["week_start"]>="2026-06-01"
    mats.append({"機種":m,"寿命":len(rs),"現役":active})

ended=[x["寿命"] for x in mats if not x["現役"]]   # 確定寿命
alive=[x["寿命"] for x in mats if x["現役"]]        # 打ち切り(これ以上伸びる)

def pct(v,p):
    s=sorted(v); return s[min(len(s)-1,int(len(s)*p))]
def line(name,v):
    if not v: print(f"{name}: なし"); return
    print(f"{name}: n={len(v)} 中央値={pct(v,.5)}週 25%={pct(v,.25)} 75%={pct(v,.75)} 最大={max(v)} 平均={round(statistics.mean(v))}")

print(f"成熟機種 {len(mats)}（終了{len(ended)} / 現役{len(alive)}）\n")
line("【終了機の確定寿命】", ended)
line("【現役機の現時点週数(まだ伸びる)】", alive)

print("\n=== 各しきい値を超えた割合(成熟全体) ===")
for th in [13,26,39,52,78,104]:
    n=sum(1 for x in mats if x["寿命"]>=th)
    ne=sum(1 for x in ended if x>=th)
    print(f'  {th:>3}週({th//4.33:.0f}ヶ月): 成熟全体 {round(n/len(mats)*100)}% / 終了機だけ {round(ne/len(ended)*100) if ended else "-"}%が到達')
