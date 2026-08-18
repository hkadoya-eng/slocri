# -*- coding: utf-8 -*-
"""machineAnalysis.json の各機種に SIS稼働の実績(sisRecord)を付与・更新する。

なぜ必要か:
  新台診断ビューは「直近約26週に導入された機種」だけを表示するため、窓を出た機種の
  「稼働貢献◯週で終了」がどこにも残らなかった。機種分析側に永続記録として持たせることで、
  過去機種の答え合わせ(FB)を後からでも参照できるようにする。

sisRecord の内容:
  contribWeeks   … SIS公式の稼働貢献週(sis_machine_stats.contrib_weeks)
  status         … 終了 / 継続中
  statusReason   … その判定理由
  installedWeeks … 週次データに現れた週数(=設置週数)
  deadWeeks      … 設置週数 - 貢献週。稼働が死んでも撤去されず放置された期間の目安
  katsudoLast    … 直近週の稼働値(アウト÷その週の全機種中央値)

「終了」の判定:
  貢献週=市場平均超えの週数の累計なので、直近4週すべて稼働値100%以下ならもう増えない=確定。
  直近にデータが無い(撤去)場合も確定。設置終了だけを条件にすると、ホールは筐体代が沈むため
  死に台でも数十週放置するので誤判定になる。

使い方: python scripts/misc/update_sis_record.py [--dry]
"""
import json, io, os, sys, statistics as st, urllib.request
from datetime import date, timedelta

ANON = os.environ.get("SLOCRI_ANON") or "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwemJ0dXVjb3B1Y2FibHd5cWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Mjk2MzEsImV4cCI6MjA5MTIwNTYzMX0.qry7pSzmm3lWK82Vnp7Wz-R9wHsDVwbj7ysy62xUhuA"
BASE = "https://vpzbtuucopucablwyqeq.supabase.co/rest/v1"
HERE = os.path.dirname(os.path.abspath(__file__))
MA_PATH = os.path.normpath(os.path.join(HERE, "..", "..", "src", "machineAnalysis.json"))
DRY = "--dry" in sys.argv


def get_all(path):
    """PostgRESTは1リクエスト1000件で頭打ちなのでページングする"""
    out, off = [], 0
    while True:
        req = urllib.request.Request(BASE + path + "&limit=1000&offset=%d" % off,
                                     headers={"apikey": ANON, "Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=60) as r:
            rows = json.loads(r.read().decode("utf-8"))
        out.extend(rows)
        if len(rows) < 1000:
            return out
        off += 1000
        if off > 100000:
            raise RuntimeError("runaway paging")


def main():
    ma = json.loads(io.open(MA_PATH, encoding="utf-8").read())

    # SIS表記 → machineAnalysisの正式キー（aliases経由・lookupAnalysisと同じ完全一致方式）
    resolve = {}
    for key, val in ma.items():
        resolve[key] = key
        for a in (val.get("aliases") or []):
            if a:
                resolve[a] = key

    # order は必ず一意になるキー(week_start+machine)で。week_start だけだと
    # limit/offset ページング間で並びが揺れ、行の重複取得/取りこぼしが起きる。
    weekly = get_all("/sis_weekly_data?select=machine,week_start,out_coins&order=week_start.asc,machine.asc")
    stats = get_all("/sis_machine_stats?select=machine,contrib_weeks")
    contrib = {s["machine"].replace(" ", ""): s.get("contrib_weeks") for s in stats}

    weeks = sorted({r["week_start"] for r in weekly})
    if not weeks:
        print("週次データが空。中止")
        return 1
    latest = weeks[-1]
    med = {}
    for w in weeks:
        v = [r["out_coins"] for r in weekly if r["week_start"] == w and r["out_coins"]]
        med[w] = st.median(v) if v else None

    by = {}
    for r in weekly:
        by.setdefault(r["machine"], []).append(r)
    for m in by:
        by[m].sort(key=lambda r: r["week_start"])

    recent = (date.fromisoformat(latest) - timedelta(days=21)).isoformat()

    recs, unresolved = {}, []
    for m, arr in by.items():
        canon = resolve.get(m)
        if not canon:
            unresolved.append(m)
            continue
        cw = contrib.get(m.replace(" ", ""))
        last = arr[-1]
        k_last = (round(last["out_coins"] / med[last["week_start"]] * 100)
                  if last["out_coins"] and med[last["week_start"]] else None)
        if last["week_start"] < recent:
            done, why = True, "撤去(直近にデータなし)"
        else:
            tail = [r["out_coins"] / med[r["week_start"]] * 100
                    for r in arr[-4:] if r["out_coins"] and med[r["week_start"]]]
            done = len(tail) > 0 and not any(v > 100 for v in tail)
            why = "直近4週すべて市場平均以下" if done else (
                "直近稼働値%d%%で市場平均超え" % k_last if k_last is not None else "継続中")
        rec = {
            "sisName": m,
            "contribWeeks": cw,
            "status": "終了" if done else "継続中",
            "statusReason": why,
            "installedWeeks": len(arr),
            "firstWeek": arr[0]["week_start"],
            "lastWeek": last["week_start"],
            "katsudoLast": k_last,
            "deadWeeks": (len(arr) - cw) if cw is not None else None,
            "asOf": latest,
        }
        # 同一エントリに複数のSIS表記が当たる場合は貢献週が多い方を採用
        prev = recs.get(canon)
        if prev is None or (rec["contribWeeks"] or 0) > (prev["contribWeeks"] or 0):
            recs[canon] = rec

    ended = sum(1 for r in recs.values() if r["status"] == "終了")
    print("SIS %d機種 / 紐付け %d件(終了%d・継続中%d) / 紐付け不可 %d件"
          % (len(by), len(recs), ended, len(recs) - ended, len(unresolved)))

    changed = 0
    for canon, rec in recs.items():
        if ma[canon].get("sisRecord") != rec:
            changed += 1
        ma[canon]["sisRecord"] = rec
    print("更新対象: %d件" % changed)

    if DRY:
        print("※--dry のため書き込みなし")
        return 0
    if changed == 0:
        print("差分なし。書き込みスキップ")
        return 0

    io.open(MA_PATH, "w", encoding="utf-8").write(json.dumps(ma, ensure_ascii=False, indent=2) + "\n")
    json.load(io.open(MA_PATH, encoding="utf-8"))  # 破損検証
    print("書き込み完了 / json.load OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
