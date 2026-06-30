# -*- coding: utf-8 -*-
"""メーカーグループ別「打率」= 公式稼働貢献週の平均/長寿率。
グループが稼働貢献週を分けるか(=作り手で良し悪しが出るか)を検証。
入力: _stats.json(公式contrib_weeks) + ai収集/機種一覧_MY_コイン単価.csv(メーカー)"""
import json, io, csv, re, statistics
from collections import defaultdict

def norm(s):
    s=re.sub(r'\s','',s or '')
    s=re.sub(r'^(L|スマスロ|スマパチ|Pフィーバー|P|ぱちんこ|パチスロ)+','',s)
    return s.lower()

# 公式稼働貢献週
contrib={}
for r in json.load(io.open("_stats.json",encoding="utf-8")):
    if r.get("machine") and r["machine"]!="__config__":
        contrib[norm(r["machine"])]=r.get("contrib_weeks")

# メーカー(CSV)
maker={}
for r in csv.DictReader(io.open("ai収集/機種一覧_MY_コイン単価.csv",encoding="utf-8-sig")):
    m=(r.get("メーカー") or "").strip()
    if m: maker[norm(r["機種名"])]=m

# グループ統合(販社/資本グループ)
GROUP={
 "ユニバーサル":"ユニバーサル系","ミズホ":"ユニバーサル系","エレコ":"ユニバーサル系",
 "サミー":"セガサミー系","ロデオ":"セガサミー系",
 "サンキョー":"SANKYO系","ビスティ":"SANKYO系","JFJ":"SANKYO系",
 "平和":"平和系","オリンピア":"平和系",
 "山佐":"山佐系","コンネクスト":"山佐系","ネクスト":"山佐系",
 "フィールズ":"フィールズ系","エンターライズ":"フィールズ系","スパイキー":"フィールズ系","七匠":"フィールズ系","新日":"フィールズ系",
}
def grp(mk): return GROUP.get(mk, mk)  # 未定義は単独扱い

# 結合
g_contrib=defaultdict(list)
matched=0
for nk,c in contrib.items():
    mk=maker.get(nk)
    if mk is None or c is None: continue
    matched+=1
    g_contrib[grp(mk)].append(c)

allc=[c for v in g_contrib.values() for c in v]
print(f"公式{len(contrib)}機種中 メーカー結合成功={matched}  全体平均稼働貢献週={round(statistics.mean(allc),1)}\n")

rows=[]
for g,cs in g_contrib.items():
    if len(cs)<3: continue
    rows.append((g,len(cs),round(statistics.mean(cs),1),round(statistics.median(cs),1),
                 round(sum(1 for x in cs if x>=26)/len(cs)*100),round(max(cs))))
rows.sort(key=lambda x:-x[2])
print(f'{"グループ":<14}{"n":>4}{"平均貢献週":>9}{"中央":>6}{"半年超率":>9}{"最高":>6}')
for g,n,mean,med,rate,mx in rows:
    print(f'{g:<14}{n:>4}{mean:>9}{med:>6}{str(rate)+"%":>9}{mx:>6}')

print("\n(n<3で除外したグループ・単独メーカーは母数不足のため非表示)")
print("※打率=平均稼働貢献週(公式)。これがグループ間で大きく違えば『作り手で生死が分かれる』")
