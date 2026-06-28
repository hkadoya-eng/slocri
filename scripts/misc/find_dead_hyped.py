# -*- coding: utf-8 -*-
"""期待外れの真のダメ台 = 高台数(大量導入)×短命(5-10週で稼働終了)×死亡(現役でない)を炙る。
週次SIS(_wk_p*.json)から。北斗/モンキー(優秀)と対比。"""
import json, io, glob, statistics
from collections import defaultdict

rows=[]
for fp in sorted(glob.glob("_wk_p*.json")):
    try:
        with io.open(fp,encoding="utf-8") as f: rows+=json.load(f)
    except Exception as e: print("skip",fp,e)
if not rows:
    print("週次ファイル無し(_wk_p*.json)。再取得が必要。"); raise SystemExit

def f(x):
    try: return float(x)
    except: return None

M=defaultdict(list)
for r in rows: M[r["machine"]].append(r)
for m in M: M[m].sort(key=lambda x:x["week_start"])

recs=[]
for m,rs in M.items():
    mcs=[f(r["avg_machine_count"]) for r in rs if f(r["avg_machine_count"]) is not None]
    def out(i): return f(rs[i]["out_coins"]) if len(rs)>i else None
    w1,w4,w8=out(0),out(3),out(7)
    recs.append({
        "機種":m,"初週":rs[0]["week_start"],"最終":rs[-1]["week_start"],"総週数":len(rs),
        "現役": rs[-1]["week_start"]>="2026-06-01",
        "台数初週": f(rs[0]["avg_machine_count"]),
        "台数ピーク": round(max(mcs),1) if mcs else None,
        "台数最終": f(rs[-1]["avg_machine_count"]),
        "持続率4": round(w4/w1*100) if (w1 and w4) else None,
        "持続率8": round(w8/w1*100) if (w1 and w8) else None,
    })

# 台数の分布(導入規模の基準)
peaks=[r["台数ピーク"] for r in recs if r["台数ピーク"] is not None]
med=round(statistics.median(peaks),1); p75=round(sorted(peaks)[int(len(peaks)*0.75)],1)
print(f"全{len(recs)}機種 台数ピーク 中央値={med} 75%点={p75}（これ以上＝大量導入の目安）\n")

# 期待外れ: 現役でない & 総週数<=12 & 台数ピーク>=中央値(=そこそこ導入されたのに死)
dead_hyped=[r for r in recs if (not r["現役"]) and r["総週数"]<=12 and (r["台数ピーク"] or 0)>=med]
dead_hyped.sort(key=lambda r:-(r["台数ピーク"] or 0))
print(f"=== 期待外れ(死亡×短命≤12週×台数ピーク≥{med}) {len(dead_hyped)}台 ===")
print(f'{"機種":<30}{"初週":>11}{"総週":>5}{"台数初":>7}{"台数Pk":>7}{"持続4":>7}{"持続8":>7}')
for r in dead_hyped[:25]:
    print(f'{r["機種"][:29]:<30}{r["初週"]:>11}{r["総週数"]:>5}{str(r["台数初週"]):>7}{str(r["台数ピーク"]):>7}{str(r["持続率4"]):>7}{str(r["持続率8"]):>7}')

print("\n=== 対比: 優秀(北斗/モンキー) ===")
for r in recs:
    if ("北斗の拳" in r["機種"] and "転生" not in r["機種"] and "無双" not in r["機種"]) or "モンキーターン" in r["機種"]:
        print(f'{r["機種"][:29]:<30}{r["初週"]:>11}{r["総週数"]:>5}{str(r["台数初週"]):>7}{str(r["台数ピーク"]):>7}{str(r["持続率4"]):>7}{str(r["持続率8"]):>7}')
