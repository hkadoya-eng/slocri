# -*- coding: utf-8 -*-
"""
長寿台 因果分析 v0.1
問い: 長期稼働している台を前提に「何があったから落ちずに伸びたか」
方法: 長寿生存組(貢献中×高稼働週) vs 早死に組(終了×低稼働週) の特性平均を比較し差分を出す
入力: ai収集/機種一覧_MY_コイン単価.csv
注意: 稼働週は導入時期に交絡(新台は週が短い)。状況×稼働週で生死を分離する。
"""
import csv, statistics

SRC = "ai収集/機種一覧_MY_コイン単価.csv"

def num(x):
    if x is None: return None
    s=str(x).strip().replace("+","").replace(",","").replace("%","")
    if s=="": return None
    try: return float(s)
    except: return None

def wk(x):
    try: return int(float(str(x).strip()))
    except: return None

rows=[]
with open(SRC,encoding="utf-8") as f:
    for r in csv.DictReader(f): rows.append(r)

recs=[]
for r in rows:
    out=num(r.get("SIS平均アウト")); tan=num(r.get("コイン単価(公表)"))
    recs.append({
        "名": r.get("機種名",""), "メーカー": r.get("メーカー",""),
        "状況": r.get("状況","") or "", "週": wk(r.get("稼働週")),
        "単価": tan, "MY設1": num(r.get("MY(設定1)")), "純増": num(r.get("純増(最高)")),
        "ATTS": num(r.get("ATTS")), "アウト": out, "MYsis": num(r.get("SIS平均MY")),
        "割数": num(r.get("SIS割数%")),
        "リテンション": round(out/tan) if (out and tan) else None,
    })

def grp_mean(items,key):
    v=[i[key] for i in items if i.get(key) is not None]
    return round(statistics.mean(v),2) if v else None

# 生死分離
longlive=[x for x in recs if "貢献中" in x["状況"] and (x["週"] or 0)>=15]
shortdie=[x for x in recs if "終了"   in x["状況"] and (x["週"] or 99)<=8]

print(f"長寿生存組(貢献中×15週+): n={len(longlive)}")
print(f"早死に組  (終了×8週-)   : n={len(shortdie)}\n")

keys=["単価","純増","ATTS","MY設1","アウト","MYsis","割数","リテンション"]
print(f'{"指標":<8}{"長寿生存":>10}{"早死に":>10}{"差(生存-死)":>12}')
for k in keys:
    a=grp_mean(longlive,k); b=grp_mean(shortdie,k)
    d=round(a-b,2) if (a is not None and b is not None) else None
    print(f'{k:<8}{str(a):>10}{str(b):>10}{str(d):>12}')

# 長寿生存トップ(稼働週降順)
print("\n=== 長く生きて伸びた台 トップ12(貢献中・稼働週降順) ===")
top=sorted([x for x in recs if "貢献中" in x["状況"]],key=lambda x:(x["週"] or 0),reverse=True)[:12]
print(f'{"機種":<26}{"週":>4}{"単価":>6}{"純増":>6}{"アウト":>8}{"割数":>7}{"リテン":>8}')
for x in top:
    print(f'{x["名"][:25]:<26}{str(x["週"]):>4}{str(x["単価"]):>6}{str(x["純増"]):>6}'
          f'{str(x["アウト"]):>8}{str(x["割数"]):>7}{str(x["リテンション"]):>8}')
