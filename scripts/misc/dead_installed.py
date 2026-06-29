# -*- coding: utf-8 -*-
"""「実質早期死亡(初月で稼働枯れ)」だが設置は長く残る台を数える＝撤去は死より遅れる、の検証。"""
import json, io, glob, statistics
from collections import defaultdict

rows=[]
for fp in sorted(glob.glob("_wk_p*.json")):
    with io.open(fp,encoding="utf-8") as f: rows+=json.load(f)
def f_(x):
    try: return float(x)
    except: return None

M=defaultdict(list)
for r in rows: M[r["machine"]].append(r)
for m in M: M[m].sort(key=lambda x:x["week_start"])

recs=[]
for m,rs in M.items():
    if len(rs)<4: continue
    w1=f_(rs[0]["out_coins"]); w4=f_(rs[3]["out_coins"])
    if not (w1 and w4): continue
    recs.append({"機種":m,"寿命":len(rs),"ret4":round(w4/w1*100)})

def med(v): return sorted(v)[len(v)//2] if v else None
# 実質早期死亡 = 初月でper台が半分以下(ret4<50)
dead=[r for r in recs if r["ret4"]<50]
mid =[r for r in recs if 50<=r["ret4"]<66]
ok  =[r for r in recs if r["ret4"]>=66]
print(f"4週持続率が出せる {len(recs)}機種\n")
for lab,g in [("実質早期死亡(ret4<50)",dead),("微妙(50-66)",mid),("健全(ret4>=66)",ok)]:
    lives=[r["寿命"] for r in g]
    print(f'{lab}: {len(g)}台  設置週数の中央値={med(lives)}週  (20週以上設置={sum(1 for w in lives if w>=20)}台 / 30週以上={sum(1 for w in lives if w>=30)}台)')

print("\n=== 実質早期死亡なのに長く設置され続けた台(ret4<50 かつ 設置30週+) ===")
for r in sorted([x for x in dead if x["寿命"]>=30],key=lambda x:-x["寿命"])[:12]:
    print(f'  設置{r["寿命"]}週 なのに初月持続率{r["ret4"]}%  {r["機種"][:30]}')
