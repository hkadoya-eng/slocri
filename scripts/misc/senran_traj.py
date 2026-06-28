# -*- coding: utf-8 -*-
"""戦国乙女 全バージョンの週次トラジェクトリ。どれが2週で失速するか=体感とデータの照合。"""
import json, io
from collections import defaultdict

with io.open("_senran.json", encoding="utf-8") as f:
    rows = json.load(f)

def f_(x):
    try: return float(x)
    except: return None

M = defaultdict(list)
for r in rows: M[r["machine"]].append(r)
for m in M: M[m].sort(key=lambda x: x["week_start"])

print(f"戦国乙女系 {len(M)} 機種 / 週次{len(rows)}行\n")
for m, rs in sorted(M.items(), key=lambda kv: kv[1][0]["week_start"]):
    base = f_(rs[0]["out_coins"])
    def out(i): return f_(rs[i]["out_coins"]) if len(rs)>i else None
    w2,w4,w8 = out(1),out(3),out(7)
    print(f'■ {m}  初週{rs[0]["week_start"]} / 全{len(rs)}週 / 最終{rs[-1]["week_start"]} / 現役{rs[-1]["week_start"]>="2026-06-01"}')
    print(f'   台数Pk={round(max([f_(r["avg_machine_count"]) for r in rs if f_(r["avg_machine_count"]) is not None]),1)}'
          f' / 持続2週={round(w2/base*100) if (base and w2) else None}%'
          f' / 持続4週={round(w4/base*100) if (base and w4) else None}%'
          f' / 持続8週={round(w8/base*100) if (base and w8) else None}%')
    # 初8週の生トラジェクトリ
    for i, r in enumerate(rs[:8], 1):
        oc=f_(r["out_coins"]); mc=f_(r["avg_machine_count"]); pr=f_(r["payout_rate"])
        ratio=f'{round(oc/base*100)}%' if base else "-"
        print(f'     週{i:>2} {r["week_start"]} アウト{round(oc) if oc else "-":>6} 台数{mc} 割数{pr} 初週比{ratio}')
    print()
