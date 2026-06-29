# -*- coding: utf-8 -*-
"""北斗第1弾 vs モンキーV の週次トラジェクトリ＋持続率＋台数推移"""
import json, io

def load(p):
    with io.open(p, encoding="utf-8") as f:
        return json.load(f)

def by_machine(rows):
    d={}
    for r in rows: d.setdefault(r["machine"],[]).append(r)
    for m in d: d[m].sort(key=lambda x:x["week_start"])
    return d

hok=by_machine(load("_wk_hokuto.json"))
mon=by_machine(load("_wk_monkey.json"))

print("=== 北斗系 候補 ===")
for m,rs in sorted(hok.items(),key=lambda kv:kv[1][0]["week_start"]):
    print(f'  [{rs[0]["week_start"]}] 週数{len(rs):>3}  {m}')
print("=== モンキー系 候補 ===")
for m,rs in sorted(mon.items(),key=lambda kv:kv[1][0]["week_start"]):
    print(f'  [{rs[0]["week_start"]}] 週数{len(rs):>3}  {m}')

def pick(d, must, first_lo, first_hi, ng=()):
    cand=[]
    for m,rs in d.items():
        fw=rs[0]["week_start"]
        if must in m and first_lo<=fw<first_hi and not any(n in m for n in ng):
            cand.append((len(rs),m,rs))
    cand.sort(reverse=True)
    return cand[0] if cand else None

h=pick(hok,"北斗の拳","2023-01","2023-07",ng=("無双","転生","新")) or pick(hok,"北斗","2023-01","2023-07",ng=("無双","転生"))
mk=pick(mon,"モンキーターン","2023-09","2024-03") or pick(mon,"モンキー","2023-09","2024-03")

def traj(label, picked):
    if not picked:
        print(f"\n[{label}] 該当なし"); return
    n,m,rs=picked
    print(f"\n=== {label}: {m} （初週 {rs[0]['week_start']} / 全{n}週） ===")
    print(f'{"週":>3}{"week_start":>13}{"アウト":>9}{"割数%":>8}{"台数":>8}')
    base=rs[0]["out_coins"]
    for i,r in enumerate(rs[:10],1):
        oc=r["out_coins"]; pr=r["payout_rate"]; mc=r["avg_machine_count"]
        ratio=f'{round(oc/base*100)}%' if base else "-"
        print(f'{i:>3}{r["week_start"]:>13}{str(round(oc)):>9}{str(pr):>8}{str(mc):>8}  初週比{ratio}')
    # 持続率
    def at(i): return rs[i]["out_coins"] if len(rs)>i else None
    w1,w4,w8=at(0),at(3),at(7)
    if w1:
        print(f'  持続率 4週/初週 = {round(w4/w1*100)}%' if w4 else '  4週データ無し',
              f' / 8週/初週 = {round(w8/w1*100)}%' if w8 else '/ 8週データ無し')
    # 台数推移
    c1=rs[0]["avg_machine_count"];
    cL=rs[min(7,len(rs)-1)]["avg_machine_count"]
    if c1: print(f'  台数推移 初週{c1} → {min(8,len(rs))}週目{cL}  ({round((cL/c1-1)*100)}%)')

traj("北斗(第1弾)", h)
traj("モンキーV", mk)
