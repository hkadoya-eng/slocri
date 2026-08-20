# -*- coding: utf-8 -*-
"""機種評価（columnData.json）の「答え合わせ」を SIS 実データから更新する。

なぜ必要か:
  update_machine_review_predictions.py は **予測（longevityMin/Max）しか触らない**ため、
  答え合わせ（sisOutcome）が手書きの日付で止まっていた（2026-08-20 時点で1ヶ月古く、
  すでに終了している機種が「継続中」のまま＝答え合わせが画面に出ない状態だった）。

書き込む内容（sisOutcome）:
  contribWeeks  … SIS公式の稼働貢献週（sis_machine_stats）
  status        … 終了 / 継続中
  katsudoLast   … 直近週の稼働値（1台あたりアウト ÷ その週の全国平均アウトの実値 ×100）
  verdict       … 終了時のみ hit / miss。予測レンジに実績が入れば hit
  predicted     … 判定に使った予測値（レンジ内なら実績と同値）
  diff          … 実績 − 予測。レンジ内に収まった的中は0
  asOf          … 判定に使った最新週

終了の判定は update_sis_record.py と同じルールに揃える:
  直近4週すべて稼働値100%以下ならもう貢献週は増えない＝確定。直近にデータが無い（撤去）も確定。

使い方: python scripts/misc/update_review_outcome.py [--dry]
"""
import io
import json
import os
import re
import sys
import time
import subprocess
import unicodedata
from datetime import date, timedelta

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
COL = os.path.join(ROOT, "src", "columnData.json")
DRY = "--dry" in sys.argv

ANON = ("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwemJ0dXVjb3B1"
        "Y2FibHd5cWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Mjk2MzEsImV4cCI6MjA5MTIwNTYzMX0."
        "qry7pSzmm3lWK82Vnp7Wz-R9wHsDVwbj7ysy62xUhuA")
BASE = "https://vpzbtuucopucablwyqeq.supabase.co/rest/v1"

# 名前が機械的に一致しない機種の対応表。部分一致に頼ると別機種を掴むので手で持つ
ALIAS = {
    "異世界かるてっと BT": "LB異世界かるてっと",
}
# SISのL機種パネルに存在しない（パチンコ等）。答え合わせの対象外
NO_SIS = {"eリコリス・リコイル"}


def get(path):
    """Supabase GET。並列禁止・Invalid API key は5秒待って再試行。"""
    for _ in range(4):
        r = subprocess.run(["curl", "-s", "--max-time", "90", BASE + path, "-H", "apikey: " + ANON],
                           capture_output=True, text=True, encoding="utf-8")
        try:
            j = json.loads(r.stdout)
        except Exception:
            time.sleep(5)
            continue
        if isinstance(j, list):
            return j
        time.sleep(5)
    raise SystemExit("Supabase取得に失敗: " + path[:90])


def page(tmpl):
    rows, off = [], 0
    while True:
        b = get(tmpl % off)
        rows += b
        if len(b) < 1000:
            return rows
        off += 1000


def norm(s):
    s = unicodedata.normalize("NFKC", s or "").lower()
    s = re.sub(r"^(l|p|e)?\s*(スマスロ|スロット|パチスロ|スマート沖スロ)?\s*", "", s)
    return re.sub(r"[\s　・－\-—ー〜~！!：:]", "", s)


def main():
    nat_rows = page("/sis_national_daily?select=date,avg_in&order=date.asc&limit=1000&offset=%d")
    nat = {r["date"]: r["avg_in"] for r in nat_rows if r.get("avg_in")}

    def natweek(w):
        d0 = date.fromisoformat(w)
        v = [nat[(d0 + timedelta(days=i)).isoformat()] for i in range(7)
             if (d0 + timedelta(days=i)).isoformat() in nat]
        return sum(v) / len(v) if v else None

    wk = page("/sis_weekly_data?select=machine,week_start,out_coins"
              "&order=week_start.asc,machine.asc&limit=1000&offset=%d")
    stats = {r["machine"]: r["contrib_weeks"]
             for r in get("/sis_machine_stats?select=machine,contrib_weeks&limit=2000")}

    ser = {}
    for r in wk:
        if r.get("out_coins"):
            ser.setdefault(r["machine"], []).append(r)
    for m in ser:
        ser[m].sort(key=lambda r: r["week_start"])
    latest = max(r["week_start"] for r in wk)

    d = json.loads(io.open(COL, encoding="utf-8").read())
    by_norm = {norm(k): k for k in ser}

    changed, skipped = [], []
    for col in d["columns"]:
        name = col["name"]
        if name in NO_SIS:
            skipped.append((name, "SISパネルに無い機種（パチンコ等）"))
            continue
        target = ALIAS.get(name)
        hit = target if target in ser else None
        if hit is None:
            n = norm(name)
            hit = by_norm.get(n)
        if hit is None:
            n = norm(name)
            cands = [v for k, v in by_norm.items() if k and (k in n or n in k) and min(len(k), len(n)) >= 5]
            hit = cands[0] if len(cands) == 1 else None
        if hit is None:
            skipped.append((name, "SISの機種名と紐付けできず"))
            continue

        arr = ser[hit]
        ks = []
        for r in arr:
            nv = natweek(r["week_start"])
            if nv:
                ks.append((r["week_start"], r["out_coins"] / nv * 100))
        if not ks:
            skipped.append((name, "全国平均が無く稼働値を出せない"))
            continue

        k_last = ks[-1][1]
        # 直近にデータが無い＝撤去
        if ks[-1][0] < latest:
            done, why = True, "撤去（直近週にデータなし）"
        else:
            tail = [v for _, v in ks[-4:]]
            done = len(tail) > 0 and not any(v > 100 for v in tail)
            if done:
                why = "直近4週すべて市場平均以下"
            elif k_last > 100:
                why = "直近稼働値%d%%で市場平均超え" % k_last
            else:
                # 直近は割っているが直近4週のどこかで超えている＝貢献週はまだ増える余地がある
                why = "直近は%d%%だが直近4週に市場平均超えの週あり" % k_last

        cw = stats.get(hit)
        out = {"contribWeeks": cw, "status": "終了" if done else "継続中",
               "katsudoLast": round(k_last), "asOf": ks[-1][0], "reason": why}

        # 予測レンジに実績が入れば的中。判定は終了した機種だけ
        lo, hi = col.get("longevityMin"), col.get("longevityMax")
        if done and cw is not None and lo is not None and hi is not None:
            # レンジ内なら的中で差0。外れたときだけ、近い側の端との差を出す
            # （レンジ上限との差を常に出すと「的中なのに差−4週」という矛盾表示になる）
            if lo <= cw <= hi:
                out["verdict"], out["predicted"], out["diff"] = "hit", cw, 0
            elif cw < lo:
                out["verdict"], out["predicted"], out["diff"] = "miss", lo, cw - lo
            else:
                out["verdict"], out["predicted"], out["diff"] = "miss", hi, cw - hi

        old = col.get("sisOutcome") or {}
        if {k: old.get(k) for k in out} != out:
            changed.append((name, old, out))
            col["sisOutcome"] = out

    print("機種評価 %d件 ／ 更新 %d件 ／ 対象外 %d件" % (len(d["columns"]), len(changed), len(skipped)))
    print()
    print("%-30s %8s %10s %10s %s" % ("機種", "予測", "旧", "新", "判定"))
    for name, old, new in changed:
        col = next(c for c in d["columns"] if c["name"] == name)
        pred = "%s-%s週" % (col.get("longevityMin"), col.get("longevityMax"))
        v = new.get("verdict")
        mark = {"hit": "✓的中", "miss": "✗外れ"}.get(v, "…継続中")
        print("%-30s %8s %5s週/%s %5s週/%s  %s（%s）"
              % (name[:30], pred, old.get("contribWeeks", "—"), old.get("status", "—"),
                 new.get("contribWeeks", "—"), new["status"], mark, new["reason"]))
    if skipped:
        print()
        for name, why in skipped:
            print("  対象外: %-28s %s" % (name[:28], why))

    if DRY:
        print("\n※--dry のため書き込みなし")
        return 0
    if changed:
        d["updatedAt"] = latest
        io.open(COL, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
        json.load(io.open(COL, encoding="utf-8"))
        print("\ncolumnData.json を更新（updatedAt=%s）" % latest)
    else:
        print("\n差分なし。書き込みなし")
    return 0


if __name__ == "__main__":
    sys.exit(main())
