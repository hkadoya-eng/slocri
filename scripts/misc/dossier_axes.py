# -*- coding: utf-8 -*-
"""機種深堀り分析（ドシエ）の5軸スコアを算出する。

**経過週を揃える**のが要。①②③はすべて「導入からN週目まで」で測るので、
10週の台と80週の台を同じ条件で比べられる（既定 N=8）。
④関心度と⑤納得感は現時点の累積値しか取れないため揃えられない。だからウェイトを下げ、
取れないときは「測定不能」として残りの軸で再配分する。

  ① 需要      N週目の稼働値               = out_coins ÷ その週の全国平均アウト × 100
  ② 持続      4週目の稼働値 ÷ 初週の稼働値   ← 生のアウト比だと季節性が乗る
  ③ 総稼働     N週目の稼働値 × N週目の平均設置台数 ＝「全国平均の台 何台分か」
              1台あたりの熱量(①)と設置規模を1つにまとめた量。全国平均で割ってあるので季節性なし。
              ※パネル内シェアは分母が週で4〜127機種と動くので使えない（週をまたいだ比較が不能）
  ④ 関心度     YouTube上位20本の再生計（累積・経過週を併記）      ※--interest / --interest-pct
  ⑤ 納得感     DMM評価点                              ※--dmm で渡す。省略＝測定不能

ウェイト: ①35 ②25 ③15 ④15 ⑤10（実測で決定・下記参照）。測定不能の軸は分母から外して残りへ再配分。
重みは固定する。機種ごとに動かすと都合のよい点が作れるため。

使い方:
    python scripts/misc/dossier_axes.py "Lソードアート・オンラインII" --interest 7374367 --dmm 2.38
    python scripts/misc/dossier_axes.py --list              # 8週以上ある機種を一覧
    python scripts/misc/dossier_axes.py "L東京喰種" --week 8 --interest 5604616
"""
import io, os, json, sys, time, subprocess, urllib.parse
from datetime import date, timedelta

ANON = ("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwemJ0dXVjb3B1"
        "Y2FibHd5cWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Mjk2MzEsImV4cCI6MjA5MTIwNTYzMX0."
        "qry7pSzmm3lWK82Vnp7Wz-R9wHsDVwbj7ysy62xUhuA")
BASE = "https://vpzbtuucopucablwyqeq.supabase.co/rest/v1"
CACHE = os.path.join(os.environ.get("TEMP", "."), "dossier_axes_cache.json")
# ウェイトは実測で決めた（2026-08-20）。貢献週を目的変数にした重回帰（185機種）:
#   ① 単独 R²=0.441 ／ ①+② R²=0.443（②の増分は+0.002）
#   ここに③候補を足した増分: 総稼働(平均台換算)+0.028／台数比+0.021／初週台数+0.018
#                            相対粗利の維持+0.005／相対粗利(8週目)+0.002／出玉率±0.000
#   ①②③はどれも「よく回っているか」の別表現で相互相関0.69〜0.79。
#   → 生死の予測は①でほぼ足りる。5軸スコアは予測モデルではなく「どういう台か」の記述。
#   → 増分の実測に合わせて ②を25%へ下げ、③(総稼働)を15%へ上げた。
WEIGHTS = {"demand": 35, "retention": 25, "hall": 15, "interest": 15, "satisfaction": 10}


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


def page(path_tmpl):
    rows, off = [], 0
    while True:
        b = get(path_tmpl % off)
        rows += b
        if len(b) < 1000:
            return rows
        off += 1000


def load(refresh=False):
    if os.path.exists(CACHE) and not refresh:
        age = time.time() - os.path.getmtime(CACHE)
        if age < 6 * 3600:
            return json.load(io.open(CACHE, encoding="utf-8"))
    nat_rows = page("/sis_national_daily?select=date,avg_in&order=date.asc&limit=1000&offset=%d")
    nat = {r["date"]: r["avg_in"] for r in nat_rows if r.get("avg_in")}
    # order は一意キーにする。不安定なORDER BYでlimit/offsetすると行が重複する
    wk = page("/sis_weekly_data?select=machine,week_start,out_coins,avg_machine_count"
              "&order=week_start.asc,machine.asc&limit=1000&offset=%d")
    d = {"nat": nat, "weekly": wk, "at": date.today().isoformat()}
    json.dump(d, io.open(CACHE, "w", encoding="utf-8"), ensure_ascii=False)
    return d


def natweek(nat, w):
    d0 = date.fromisoformat(w)
    vs = [nat[(d0 + timedelta(days=i)).isoformat()] for i in range(7)
          if (d0 + timedelta(days=i)).isoformat() in nat]
    return sum(vs) / len(vs) if vs else None


def series(data):
    """機種 → 経過週順の [{w, out, k, u}]"""
    by = {}
    for r in data["weekly"]:
        if not r.get("out_coins"):
            continue
        by.setdefault(r["machine"], []).append(r)
    out = {}
    for m, rows in by.items():
        rows.sort(key=lambda r: r["week_start"])
        ser = []
        for r in rows:
            nv = natweek(data["nat"], r["week_start"])
            if nv:
                ser.append({"w": r["week_start"], "out": r["out_coins"],
                            "k": r["out_coins"] / nv * 100, "u": r.get("avg_machine_count")})
        if ser:
            out[m] = ser
    return out


def axes_at(ser, n):
    """N週目時点の①②③。データが足りなければ None。"""
    a = {"demand": None, "retention": None, "hall": None}
    if len(ser) >= n:
        a["demand"] = ser[n - 1]["k"]
        # 総稼働＝稼働値×台数。台数比(8週目/初週)は増台に2ヶ月かかるため8週では4分の1が1.00倍で並んだ
        if ser[n - 1]["u"]:
            a["hall"] = ser[n - 1]["k"] / 100 * ser[n - 1]["u"]
    # 生のアウト比ではなく稼働値比。アウトはお盆・年末に全機種いっせいに上がるので、
    # 導入時期がそこに当たった機種の持続率が実力以上に見える
    if len(ser) >= 4 and ser[0]["k"]:
        a["retention"] = ser[3]["k"] / ser[0]["k"] * 100
    return a


def pct(values, v):
    """パーセンタイル（大きいほど上位＝100に近い）と順位。"""
    vs = sorted([x for x in values if x is not None])
    if not vs or v is None:
        return None, None, len(vs)
    below = sum(1 for x in vs if x < v)
    rank = len(vs) - below
    return round(below / len(vs) * 100), rank, len(vs)


def main():
    args = sys.argv[1:]
    n = 8
    if "--week" in args:
        i = args.index("--week")
        n = int(args[i + 1]); del args[i:i + 2]
    interest = dmm = None
    for flag in ("--interest", "--dmm"):
        if flag in args:
            i = args.index(flag)
            v = float(args[i + 1]); del args[i:i + 2]
            if flag == "--interest":
                interest = v
            else:
                dmm = v
    refresh = "--refresh" in args
    args = [a for a in args if a != "--refresh"]

    data = load(refresh)
    ser = series(data)
    pop = {m: axes_at(s, n) for m, s in ser.items() if len(s) >= n}
    print("データ: %s〜%s ／ %d週以上ある機種 %d件" %
          (min(data["nat"]), max(data["nat"]), n, len(pop)))

    if "--list" in args:
        rows = sorted(pop.items(), key=lambda kv: -(kv[1]["demand"] or 0))
        print("\n%-34s %8s %8s %8s %6s" % ("機種", "%d週目稼働" % n, "4週持続", "台数比", "週数"))
        for m, a in rows[:40]:
            print("%-34s %8s %8s %8s %6d" % (
                m[:34], "%.0f%%" % a["demand"] if a["demand"] else "—",
                "%.1f%%" % a["retention"] if a["retention"] else "—",
                "%.2f倍" % a["hall"] if a["hall"] else "—", len(ser[m])))
        return 0

    if not args:
        print(__doc__)
        return 1
    m = args[0]
    if m not in ser:
        cand = [k for k in ser if m.replace(" ", "") in k.replace(" ", "")]
        print("DBに『%s』が無い。候補: %s" % (m, cand[:8] or "なし"))
        return 1
    if m not in pop:
        print("『%s』は%d週分のデータが無い（%d週）。--week を下げるか対象外。" % (m, n, len(ser[m])))
        return 1

    a = dict(pop[m])
    # 累計のまま扱う。週あたりに直すと経過1週の機種が最上位に来て逆のバイアスになる
    a["interest"] = interest
    a["satisfaction"] = dmm
    LABEL = {"demand": "① 需要（%d週目の稼働値）" % n, "retention": "② 持続（4週目÷初週の稼働値）",
             "hall": "③ 総稼働（%d週目・平均台換算）" % n,
             "interest": "④ 関心度（YouTube上位20本の累計）", "satisfaction": "⑤ 納得感（DMM評価点）"}
    UNIT = {"demand": "%.0f%%", "retention": "%.1f%%", "hall": "%.2f台分",
            "interest": "%.0f回", "satisfaction": "%.2f"}

    print("\n■ %s（%d週経過・%s〜%s）" % (m, len(ser[m]), ser[m][0]["w"], ser[m][-1]["w"]))
    print("%-30s %12s %8s %s" % ("軸", "値", "位置", "母数"))
    scores, wsum = {}, 0
    for k in ("demand", "retention", "hall", "interest", "satisfaction"):
        v = a[k]
        if k in ("interest", "satisfaction"):
            # ④⑤は経過週を揃えられないので母集団比較をここでは出さない（呼び出し側が渡した値をそのまま使う）
            print("%-30s %12s %8s %s" % (LABEL[k], (UNIT[k] % v) if v is not None else "測定不能",
                                         "—", "経過週を揃えられない軸"))
            continue
        p, rank, tot = pct([x[k] for x in pop.values()], v)
        scores[k] = p
        print("%-30s %12s %8s %d機種" % (LABEL[k], (UNIT[k] % v) if v is not None else "測定不能",
                                        ("%d位" % rank) if rank else "—", tot))
    if "--interest-pct" in sys.argv:
        scores["interest"] = float(sys.argv[sys.argv.index("--interest-pct") + 1])
    if "--dmm-pct" in sys.argv:
        scores["satisfaction"] = float(sys.argv[sys.argv.index("--dmm-pct") + 1])
    live = {k: v for k, v in scores.items() if v is not None}
    wtot = sum(WEIGHTS[k] for k in live)
    total = sum(WEIGHTS[k] * v for k, v in live.items()) / wtot if wtot else None
    print("\n総合スコア: %s" % ("%.0f" % total if total is not None else "算出不可"))
    print("  内訳: " + " ＋ ".join("%s %d%%×%.0f" % (k, WEIGHTS[k], v) for k, v in live.items()))
    dead = [k for k in WEIGHTS if k not in live]
    if dead:
        print("  測定不能: %s → ウェイト計%d%%を残りへ再配分（分母%d%%）"
              % ("・".join(dead), 100 - wtot, wtot))
    have = [k for k in ("demand", "retention", "hall") if scores.get(k) is not None]
    base = sum(scores[k] for k in have) / len(have) if have else None
    print("\n実績3軸（①②③）のスコア: %s" % ("%.0f" % base if base is not None else "算出不可"))
    print("ウェイト（固定）: " + " / ".join("%s %d%%" % (k, v) for k, v in WEIGHTS.items()))
    print("④⑤のパーセンタイルは母集団の経過週が揃わないため、母数を明示して手で入れる。")
    print("測定不能の軸はウェイトの分母から外し、残りの軸で再配分する。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
