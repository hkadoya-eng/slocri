"""
SISデータからcolumnData.jsonの機種評価稼働予測を自動更新するスクリプト。
run_sis_import.bat（デイリー）・run_sis_weekly.bat（ウィークリー）から呼び出す。

更新ルール:
  [デイリー] 発売7日以内の機種: sis_dataのランキングから longevityMin/Max を自動調整
  [ウィークリー] 全機種: sis_machine_stats の貢献週が予測上限を超えていれば延長
"""

import sys
import io
import os
import json
import requests
from datetime import datetime, date

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

SUPABASE_URL = "https://vpzbtuucopucablwyqeq.supabase.co"
COLUMN_DATA_PATH = os.path.join(ROOT_DIR, "src", "columnData.json")

# デイリーランキング順位 → 予測倍率
RANK_MULTIPLIER = [
    (1,   3,  1.25),
    (4,   7,  1.10),
    (8,  15,  1.00),
    (16, 30,  0.85),
    (31, 999, 0.70),
]

def load_env():
    env_path = os.path.join(ROOT_DIR, ".env.local")
    if not os.path.exists(env_path):
        return
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())

def api_key():
    return os.environ.get("VITE_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_SERVICE_KEY")

def hdrs(key):
    return {"apikey": key, "Authorization": f"Bearer {key}"}

def days_since_release(release_str):
    if not release_str:
        return 9999
    try:
        fmt = "%Y-%m-%d" if len(release_str) == 10 else "%Y-%m"
        d = datetime.strptime(release_str if fmt == "%Y-%m-%d" else release_str + "-01", "%Y-%m-%d").date()
        return (date.today() - d).days
    except Exception:
        return 9999

def get_multiplier(rank):
    for lo, hi, mult in RANK_MULTIPLIER:
        if lo <= rank <= hi:
            return mult
    return 0.70

def apply_range_rule(target):
    t = round(target)
    if t <= 9:
        return t, t
    elif t < 15:
        return t, t + 1
    elif t < 20:
        return t, t + 2
    elif t < 25:
        return t, t + 3
    elif t < 30:
        return t, t + 4
    else:
        return t, t + 9

def run():
    load_env()
    key = api_key()
    if not key:
        print("エラー: APIキー未設定")
        sys.exit(1)

    h = hdrs(key)

    # sis_data 最新日付
    r = requests.get(f"{SUPABASE_URL}/rest/v1/sis_data",
                     params={"select": "date", "order": "date.desc", "limit": "1"}, headers=h)
    rows = r.json()
    if not rows:
        print("sis_data にデータなし")
        return
    latest_date = rows[0]["date"]
    print(f"SIS最新日付: {latest_date}")

    # 最新日 Top50 ランキング
    r = requests.get(f"{SUPABASE_URL}/rest/v1/sis_data",
                     params={"select": "machine,out_coins,payout_rate,coin_price",
                             "date": f"eq.{latest_date}",
                             "order": "out_coins.desc", "limit": "50"}, headers=h)
    rankings = r.json() if r.status_code == 200 else []
    rank_map = {row["machine"]: (i + 1, row) for i, row in enumerate(rankings)}

    # sis_machine_stats（貢献週）
    r = requests.get(f"{SUPABASE_URL}/rest/v1/sis_machine_stats",
                     params={"select": "machine,contrib_weeks"}, headers=h)
    stats = {d["machine"]: d["contrib_weeks"]
             for d in (r.json() if r.status_code == 200 else [])
             if d.get("machine") != "__config__"}

    with open(COLUMN_DATA_PATH, encoding="utf-8") as f:
        column_data = json.load(f)

    today = date.today().isoformat()
    changed = False

    for col in column_data["columns"]:
        sis_name = col.get("sisDataMachine", "")
        days = days_since_release(col.get("releaseDate", ""))

        # ① 発売7日以内: デイリーランキングで予測更新
        if days <= 7 and sis_name:
            if sis_name in rank_map:
                rank, row = rank_map[sis_name]
                mult = get_multiplier(rank)
                base = col.get("longevityMin") or 12
                new_min, new_max = apply_range_rule(max(4, base * mult))
                if new_min != col.get("longevityMin") or new_max != col.get("longevityMax"):
                    print(f"  [{col['name']}] {col.get('longevityMin')}〜{col.get('longevityMax')}週"
                          f" → {new_min}〜{new_max}週 (rank {rank}, out_coins {row['out_coins']:,}枚)")
                    col["longevityMin"] = new_min
                    col["longevityMax"] = new_max
                    col["longevityNote"] = (
                        f"{latest_date} SIS: {row['out_coins']:,}枚・全国{rank}位"
                        f"（payout {row['payout_rate']}%・単価{row['coin_price']}円）。"
                        f"デイリーデータから{new_min}〜{new_max}週に自動更新。"
                    )
                    changed = True
            else:
                # Top50圏外
                base = col.get("longevityMin") or 12
                new_min, new_max = apply_range_rule(max(4, base * 0.65))
                if new_min != col.get("longevityMin") or new_max != col.get("longevityMax"):
                    print(f"  [{col['name']}] → {new_min}〜{new_max}週 (top50圏外)")
                    col["longevityMin"] = new_min
                    col["longevityMax"] = new_max
                    col["longevityNote"] = (
                        f"{latest_date} SIS: top50圏外のため{new_min}〜{new_max}週に下方修正。"
                    )
                    changed = True

        # ② 全機種: 実績が予測上限を超えていれば延長
        contrib = stats.get(sis_name) if sis_name else None
        if contrib and col.get("longevityMax") and contrib > col["longevityMax"]:
            new_max = contrib + 4
            print(f"  [{col['name']}] SIS実績{contrib}週 > 予測上限{col['longevityMax']}週 → {new_max}週に延長")
            col["longevityMax"] = new_max
            col["longevityNote"] = (col.get("longevityNote") or "") + \
                f" ※SIS実績{contrib}週超のため上限を{new_max}週に自動延長（{today}）。"
            changed = True

    if not changed:
        print("更新なし")
        return

    column_data["updatedAt"] = today
    with open(COLUMN_DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(column_data, f, ensure_ascii=False, indent=2)
    print(f"columnData.json を更新しました（{today}）")

if __name__ == "__main__":
    run()
