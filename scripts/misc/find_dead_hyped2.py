# -*- coding: utf-8 -*-
"""期待外れ(高台数なのにper台急減=じわ死に)＋アワード台の実トラジェクトリ検証。
週次SIS全件(_wk_p*.json)。評価(アワード)と実稼働の乖離を炙る。"""
import json, io, glob, statistics
from collections import defaultdict

rows=[]
for fp in sorted(glob.glob("_wk_p*.json")):
    with io.open(fp,encoding="utf-8") as f: rows+=json.load(f)

def f(x):
    try: return float(x)
    except: return None

M=defaultdict(list)
for r in rows: M[r["machine"]].append(r)
for m in M: M[m].sort(key=lambda x:x["week_start"])

recs={}
for m,rs in M.items():
    mcs=[f(r["avg_machine_count"]) for r in rs if f(r["avg_machine_count"]) is not None]
    def out(i): return f(rs[i]["out_coins"]) if len(rs)>i else None
    w1,w4,w8=out(0),out(3),out(7)
    recs[m]={
        "初週":rs[0]["week_start"],"最終":rs[-1]["week_start"],"総週数":len(rs),
        "現役": rs[-1]["week_start"]>="2026-06-01",
        "台数ピーク": round(max(mcs),1) if mcs else None,
        "台数最終": f(rs[-1]["avg_machine_count"]),
        "持続率4": round(w4/w1*100) if (w1 and w4) else None,
        "持続率8": round(w8/w1*100) if (w1 and w8) else None,
        "rs":rs,
    }

def line(m,r):
    return (f'{m[:30]:<31}{r["初週"]:>11}{r["総週数"]:>5}現役{str(r["現役"]):>5}'
            f' Pk台{str(r["台数ピーク"]):>5} 持続4={str(r["持続率4"]):>4} 持続8={str(r["持続率8"]):>4}')

print("=== 2025アワード台の実トラジェクトリ（評価 vs 稼働） ===")
awards=["東京喰種","マギアレコード","マギレコ","ブラックジャック"]
for m,r in recs.items():
    if any(a in m for a in awards):
        print(line(m,r))

print("\n=== 期待外れ候補: 大量導入(台数Pk>=4.4)なのにper台が萎んだ順(持続8 昇順) ===")
pushed=[(m,r) for m,r in recs.items() if (r["台数ピーク"] or 0)>=4.4 and r["持続率8"] is not None and r["初週"]<="2025-12-01"]
pushed.sort(key=lambda kv:kv[1]["持続率8"])
print(f'{"機種":<31}{"初週":>11}{"総週":>5}{"現役":>7}{"Pk台":>7}{"持4":>6}{"持8":>6}')
for m,r in pushed[:15]:
    print(f'{m[:30]:<31}{r["初週"]:>11}{r["総週数"]:>5}{str(r["現役"]):>7}{str(r["台数ピーク"]):>7}{str(r["持続率4"]):>6}{str(r["持続率8"]):>6}')

print("\n=== 対比: 優秀上位(持続8 降順, 台数Pk>=4.4) ===")
pushed.sort(key=lambda kv:-kv[1]["持続率8"])
for m,r in pushed[:8]:
    print(f'{m[:30]:<31}{r["初週"]:>11}{r["総週数"]:>5}{str(r["現役"]):>7}{str(r["台数ピーク"]):>7}{str(r["持続率4"]):>6}{str(r["持続率8"]):>6}')
