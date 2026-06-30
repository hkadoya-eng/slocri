# -*- coding: utf-8 -*-
"""① 死に台アラート(自己相対:直近がピークの何%か) ② 2週シグナル→最終稼働貢献週の経験的予測
入力: _wk_p*.json + _stats.json(公式contrib_weeks)"""
import json, io, glob, statistics, datetime
from collections import defaultdict

rows=[]
for fp in sorted(glob.glob("_wk_p*.json")):
    rows+=json.load(io.open(fp,encoding="utf-8"))
def f_(x):
    try: return float(x)
    except: return None
contrib={}
for r in json.load(io.open("_stats.json",encoding="utf-8")):
    if r.get("machine") and r["machine"]!="__config__": contrib[r["machine"]]=r.get("contrib_weeks")

wk=defaultdict(list)
for r in rows:
    o=f_(r["out_coins"])
    if o: wk[r["week_start"]].append(o)
wk_med={w:sorted(v)[len(v)//2] for w,v in wk.items()}
latest=max(r["week_start"] for r in rows)
ly,lm,ld=[int(x) for x in latest.split("-")]
cut_new=(datetime.date(ly,lm,ld)-datetime.timedelta(days=12*7)).isoformat()  # 直近12週=新台

M=defaultdict(list)
for r in rows: M[r["machine"]].append(r)
for m in M: M[m].sort(key=lambda x:x["week_start"])

recs=[]
for m,rs in M.items():
    outs=[f_(r["out_coins"]) for r in rs if f_(r["out_coins"])]
    if not outs: continue
    w1=f_(rs[0]["out_coins"]); w2=f_(rs[1]["out_coins"]) if len(rs)>1 else None
    b2=wk_med.get(rs[1]["week_start"]) if len(rs)>1 else None
    peak=max(outs); recent=statistics.mean([o for o in [f_(r["out_coins"]) for r in rs[-3:]] if o])
    recs.append({"m":m,"first":rs[0]["week_start"],"weeks":len(rs),
        "active":rs[-1]["week_start"]>=latest,
        "ret2":round(w2/w1*100) if (w1 and w2) else None,
        "kat2":round(w2/b2*100) if (w2 and b2) else None,
        "peak":round(peak),"recent":round(recent),"drop":round(recent/peak*100),
        "contrib":contrib.get(m)})

def strength(r):
    k,p=r["kat2"],r["ret2"]
    if p is None: return None
    if p>=83 and (k is None or k>=260): return "強"
    if p<73 or (k is not None and k<190): return "弱"
    return "中"

# ===== ② 2週シグナル→最終稼働貢献週(経験的) =====
mat=[r for r in recs if r["first"]<="2025-09-01" and r["contrib"] is not None and strength(r)]
B=defaultdict(list)
for r in mat: B[strength(r)].append(r)
print("=== ② 2週シグナル別の最終稼働貢献週(経験的予測・成熟機種で学習) ===")
for s in ["強","中","弱"]:
    g=B[s]
    if not g: continue
    cs=sorted(x["contrib"] for x in g)
    half=round(sum(1 for c in cs if c>=26)/len(cs)*100)
    print(f'  2週判定[{s}]: n={len(g):>3}  最終貢献週 中央={cs[len(cs)//2]} 平均={round(statistics.mean(cs),1)}  半年(26週)超率={half}%')
print("  → 2週時点でこの判定なら、最終的にこのくらい(=予測を確率で語る・点では言わない)")

print("\n  --- 現行新台(直近12週導入)の2週判定と見込み ---")
for r in sorted([x for x in recs if x["first"]>=cut_new and strength(x)],key=lambda x:-(x["kat2"] or 0)):
    print(f'  [{strength(r)}] {r["m"][:30]:<31} 2週持続{r["ret2"]} 稼働値{r["kat2"]} (公式貢献{r["contrib"]}週/設置{r["weeks"]}週)')

# ===== ① 死に台アラート(自己相対) =====
print("\n=== ① 死に台アラート: 現役なのに直近がピークの40%未満=貢献停止・入替候補 ===")
dead=[r for r in recs if r["active"] and r["weeks"]>=8 and r["drop"]<40]
dead.sort(key=lambda r:r["drop"])
print(f'該当 {len(dead)}台')
for r in dead[:20]:
    print(f'  ピーク{r["peak"]:>6}→直近{r["recent"]:>5} ({r["drop"]:>2}%) 設置{r["weeks"]:>3}週 公式貢献{str(r["contrib"]):>3}週  {r["m"][:26]}')
