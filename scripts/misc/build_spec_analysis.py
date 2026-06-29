# -*- coding: utf-8 -*-
"""初当たり確率・MY が寿命を分けるか検証（取れるスペック軸の判別力）
初当り=machineAnalysis.json spec から正規表現抽出 / MY=CSV / 寿命=週次SIS
入力: _wk_p*.json + src/machineAnalysis.json + ai収集/機種一覧_MY_コイン単価.csv"""
import json, io, glob, csv, re, statistics
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

def norm(s):
    s=re.sub(r'\s','',s or '')
    s=re.sub(r'^(L|スマスロ|スマパチ|Pフィーバー|P|ぱちんこ|パチスロ)+','',s)
    return s.lower()

# 初当り(設1=最大分母, 設6=最小分母)を spec から抽出
def parse_hatsu(spec):
    if not spec: return None,None
    for tok in re.split(r'\s/\s', spec):
        if '初当' in tok:
            nums=[float(x) for x in re.findall(r'1/(\d+\.?\d*)', tok.replace(',',''))]
            if nums: return max(nums), min(nums)
    return None,None

ana=json.load(open("src/machineAnalysis.json",encoding="utf-8"))
hatsu={}  # norm -> (設1分母,設6分母)
for name,v in ana.items():
    s1,s6=parse_hatsu(v.get("spec"))
    if s6: hatsu[norm(name)]=(s1,s6)
    for al in v.get("aliases",[]) or []:
        if s6: hatsu[norm(al)]=(s1,s6)

myc={}  # norm -> MY(設1), SIS平均MY
with open("ai収集/機種一覧_MY_コイン単価.csv",encoding="utf-8") as f:
    for r in csv.DictReader(f):
        myc[norm(r["機種名"])]={"MY設1":f_(r.get("MY(設定1)")),"SIS平均MY":f_(r.get("SIS平均MY"))}

recs=[]
for m,rs in M.items():
    if rs[0]["week_start"]>"2025-09-01": continue  # 成熟のみ
    nk=norm(m)
    h=hatsu.get(nk); my=myc.get(nk,{})
    recs.append({"機種":m,"寿命":len(rs),
        "初当り設6": h[1] if h else None, "初当り設1": h[0] if h else None,
        "MY設1": my.get("MY設1"), "SIS平均MY": my.get("SIS平均MY")})

def mean(v): return round(statistics.mean(v),1) if v else None
def longrate(items):
    return round(len([x for x in items if x["寿命"]>=45])/len(items)*100) if items else None

cov_h=[r for r in recs if r["初当り設6"] is not None]
cov_my=[r for r in recs if r["MY設1"] is not None]
print(f"成熟{len(recs)}機種中  初当り取得={len(cov_h)}  MY取得={len(cov_my)}\n")

print("=== 初当り確率(設6・分母小=よく当たる)別 寿命 ===")
hb=[(0,250,"≤250(軽い)"),(250,330,"250-330"),(330,430,"330-430"),(430,9999,">430(重い)")]
for lo,hi,lab in hb:
    g=[r for r in cov_h if lo<=r["初当り設6"]<hi]
    if g: print(f'  {lab:<12} n={len(g):>2} 平均寿命={mean([x["寿命"] for x in g])}週 長寿率={longrate(g)}%')

print("\n=== MY(設1)別 寿命 ===")
mb=[(0,2800,"≤2800(小)"),(2800,3400,"2800-3400"),(3400,4000,"3400-4000"),(4000,99999,">4000(大)")]
for lo,hi,lab in mb:
    g=[r for r in cov_my if r["MY設1"] and lo<=r["MY設1"]<hi]
    if g: print(f'  {lab:<12} n={len(g):>2} 平均寿命={mean([x["寿命"] for x in g])}週 長寿率={longrate(g)}%')

def corr(xs,ys):
    n=len(xs)
    if n<3: return None
    mx,my2=statistics.mean(xs),statistics.mean(ys)
    cov=sum((x-mx)*(y-my2) for x,y in zip(xs,ys))/n
    sx,sy=statistics.pstdev(xs),statistics.pstdev(ys)
    return round(cov/((sx*sy) or 1),2)
ph=[(r["初当り設6"],r["寿命"]) for r in cov_h]
pm=[(r["MY設1"],r["寿命"]) for r in cov_my if r["MY設1"]]
print(f'\n相関 初当り設6(分母)→寿命: r={corr([a for a,_ in ph],[b for _,b in ph])}（分母大ほど…の向き）')
print(f'相関 MY設1→寿命:          r={corr([a for a,_ in pm],[b for _,b in pm])}')
