# -*- coding: utf-8 -*-
"""(1)多角化候補(カテゴリ/稼働値傾き/コイン単価)の判別力 (2)2週持続率の解像度検証
入力: _wk_p*.json + ai収集/機種一覧_MY_コイン単価.csv"""
import json, io, glob, csv, statistics, re
from collections import defaultdict

rows=[]
for fp in sorted(glob.glob("_wk_p*.json")):
    with io.open(fp,encoding="utf-8") as f: rows+=json.load(f)
def f_(x):
    try: return float(x)
    except: return None

wk_med={}
_t=defaultdict(list)
for r in rows:
    o=f_(r["out_coins"])
    if o: _t[r["week_start"]].append(o)
for w,a in _t.items(): s=sorted(a); wk_med[w]=s[len(s)//2]

M=defaultdict(list)
for r in rows: M[r["machine"]].append(r)
for m in M: M[m].sort(key=lambda x:x["week_start"])

def norm(s):
    s=re.sub(r'\s','',s or '')
    s=re.sub(r'^(L|スマスロ|スマパチ|Pフィーバー|P|ぱちんこ|パチスロ)+','',s)
    return s.lower()

# CSV: カテゴリ/コイン単価/純増/メーカー
cat_map={}
with open("ai収集/機種一覧_MY_コイン単価.csv",encoding="utf-8") as f:
    for r in csv.DictReader(f):
        cat_map[norm(r["機種名"])]={
            "カテゴリ":r.get("カテゴリ",""),"コイン単価":f_(r.get("コイン単価(公表)")),
            "純増":f_(r.get("純増(最高)")),"メーカー":r.get("メーカー","")}

recs=[]
for m,rs in M.items():
    def out(i): return f_(rs[i]["out_coins"]) if len(rs)>i else None
    w1,w2,w4=out(0),out(1),out(3)
    b1,b2=wk_med.get(rs[0]["week_start"]),(wk_med.get(rs[1]["week_start"]) if len(rs)>1 else None)
    kat1=w1/b1*100 if (w1 and b1) else None
    kat2=w2/b2*100 if (w2 and b2) else None
    info=cat_map.get(norm(m),{})
    recs.append({
        "機種":m,"初週":rs[0]["week_start"],"寿命":len(rs),
        "ret2":round(w2/w1*100) if (w1 and w2) else None,
        "ret4":round(w4/w1*100) if (w1 and w4) else None,
        "kat1":round(kat1) if kat1 else None,"kat2":round(kat2) if kat2 else None,
        "稼働傾き":round(kat2-kat1) if (kat1 and kat2) else None,  # 週1→週2で需要が伸びる/萎む
        "カテゴリ":info.get("カテゴリ"),"コイン単価":info.get("コイン単価"),"純増":info.get("純増"),
    })

mat=[r for r in recs if r["初週"]<="2025-09-01"]
def mean(v): return round(statistics.mean(v),1) if v else None
def longrate(items):
    n=[x for x in items if x["寿命"]>=45]; return round(len(n)/len(items)*100) if items else None

# ===== (1) 多角化候補 =====
print("=== (1) 追加シグナルの判別力 ===")
# カテゴリ別
print("\n[カテゴリ別] (ノーマル系A は長寿か)")
bycat=defaultdict(list)
for r in mat:
    c=(r["カテゴリ"] or "不明").strip()
    bycat[c].append(r)
for c,g in sorted(bycat.items(),key=lambda kv:-len(kv[1])):
    if len(g)<3: continue
    print(f'  {c:<8} n={len(g):>3} 平均寿命={mean([x["寿命"] for x in g])}週 長寿率={longrate(g)}% 2週持続={mean([x["ret2"] for x in g if x["ret2"]])}')

# 稼働傾き(週1→週2)
print("\n[稼働傾き(週2稼働値-週1稼働値)] 寿命別")
def bkt(n): return "短命<=13" if n<=13 else ("長寿>=45" if n>=45 else "中")
G=defaultdict(list)
for r in mat: G[bkt(r["寿命"])].append(r)
for b in ["短命<=13","中","長寿>=45"]:
    g=G[b]; print(f'  {b}: 稼働傾き={mean([x["稼働傾き"] for x in g if x["稼働傾き"] is not None])} コイン単価={mean([x["コイン単価"] for x in g if x["コイン単価"]])} 純増={mean([x["純増"] for x in g if x["純増"]])}')

# ===== (2) 2週持続率の解像度 =====
print("\n=== (2) 2週持続率の解像度（90近辺と94近辺で運命が違うか） ===")
bins=[(-1,73),(73,83),(83,88),(88,92),(92,95),(95,98),(98,200)]
print(f'{"2週持続率帯":<12}{"n":>4}{"平均寿命":>9}{"寿命SD":>8}{"長寿率":>8}{"平均4週持続":>11}')
for lo,hi in bins:
    g=[r for r in mat if r["ret2"] is not None and lo<=r["ret2"]<hi]
    if not g: continue
    lives=[x["寿命"] for x in g]
    r4=[x["ret4"] for x in g if x["ret4"] is not None]
    sd=round(statistics.pstdev(lives),1) if len(lives)>1 else 0
    print(f'{str(lo)+"-"+str(hi):<12}{len(g):>4}{mean(lives):>9}{sd:>8}{str(longrate(g))+"%":>8}{str(mean(r4)):>11}')

# 相関・回帰(2週持続率 → 4週持続率, → 寿命)
def corr(xs,ys):
    n=len(xs)
    if n<3: return None,None
    mx,my=statistics.mean(xs),statistics.mean(ys)
    cov=sum((x-mx)*(y-my) for x,y in zip(xs,ys))/n
    vx=sum((x-mx)**2 for x in xs)/n
    r=cov/((statistics.pstdev(xs)*statistics.pstdev(ys)) or 1)
    slope=cov/vx if vx else 0
    return round(r,2),round(slope,2)
pair4=[(r["ret2"],r["ret4"]) for r in mat if r["ret2"] is not None and r["ret4"] is not None]
pairL=[(r["ret2"],r["寿命"]) for r in mat if r["ret2"] is not None]
r4c,r4s=corr([a for a,_ in pair4],[b for _,b in pair4])
rLc,rLs=corr([a for a,_ in pairL],[b for _,b in pairL])
print(f'\n相関 2週持続率→4週持続率: r={r4c} 傾き={r4s}（2週+1ptで4週+{r4s}pt）')
print(f'相関 2週持続率→寿命:       r={rLc} 傾き={rLs}（2週+1ptで寿命+{rLs}週）')
# 高域(>=88)だけで解像度が残るか
hi4=[(r["ret2"],r["ret4"]) for r in mat if r["ret2"] is not None and r["ret4"] is not None and r["ret2"]>=88]
if len(hi4)>=5:
    c,s=corr([a for a,_ in hi4],[b for _,b in hi4])
    print(f'※高域(2週≥88)のみ: r={c} 傾き={s} → 90と94(差4pt)は4週持続で約{round(abs(s)*4,1)}pt差')
