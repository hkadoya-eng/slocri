# -*- coding: utf-8 -*-
"""10週未満の台を数え直す。導入時期フィルタを外し、終了済み(死亡)と新しすぎ(判定保留)を分ける。"""
import json, io, glob
from collections import defaultdict

rows=[]
for fp in sorted(glob.glob("_wk_p*.json")):
    with io.open(fp,encoding="utf-8") as f: rows+=json.load(f)

M=defaultdict(list)
latest=""
for r in rows:
    M[r["machine"]].append(r)
    if r["week_start"]>latest: latest=r["week_start"]
for m in M: M[m].sort(key=lambda x:x["week_start"])

recs=[]
for m,rs in M.items():
    recs.append({"機種":m,"週数":len(rs),"初週":rs[0]["week_start"],"最終":rs[-1]["week_start"],
                 "現役":rs[-1]["week_start"]>=latest})  # 最新週に居れば現役

# 最新週から10週分の境界(これ以降の導入は10週に達しようがない)
from datetime import date
ly,lm,ld=[int(x) for x in latest.split("-")]
# 10週前 ≒ 70日前。文字列比較用に概算日付を作る(date使用)
import datetime
cut10=(datetime.date(ly,lm,ld)-datetime.timedelta(days=70)).isoformat()

print(f"総機種 {len(recs)} / 最新週 {latest} / 「10週確保の導入期限」={cut10}\n")

short=[r for r in recs if r["週数"]<10]
short_dead=[r for r in short if not r["現役"]]                 # 死亡×10週未満=真の短命
short_new=[r for r in short if r["現役"] and r["初週"]>cut10]   # 新しすぎて未到達(判定保留)
short_odd=[r for r in short if r["現役"] and r["初週"]<=cut10]  # 現役だが断続的?(要確認)

print(f"10週未満: 合計{len(short)}機種")
print(f"  ├ 真の短命(終了済み×10週未満) = {len(short_dead)}機種")
print(f"  ├ 新しすぎ(現役・直近{cut10}以降導入) = {len(short_new)}機種")
print(f"  └ その他(現役だが古い導入=断続稼働?) = {len(short_odd)}機種\n")

print("=== 真の短命(終了×10週未満) 一覧 ===")
for r in sorted(short_dead,key=lambda x:x["週数"]):
    print(f'  {r["週数"]}週  導入{r["初週"]}→終了{r["最終"]}  {r["機種"][:30]}')

# 全終了機の寿命ヒストグラム
ended=[r["週数"] for r in recs if not r["現役"]]
print(f"\n=== 終了機 {len(ended)}台 の寿命ヒストグラム ===")
bins=[(1,5),(5,10),(10,20),(20,30),(30,50),(50,80),(80,999)]
for lo,hi in bins:
    n=sum(1 for w in ended if lo<=w<hi)
    print(f'  {lo:>3}-{hi if hi<999 else "":>3}週: {n:>3}台 {"#"*n}')
