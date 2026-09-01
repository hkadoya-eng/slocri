"""
SISデータからcolumnData.jsonの機種評価稼働予測を自動更新するスクリプト。
run_sis_import.bat（デイリー）・run_sis_weekly.bat（ウィークリー）から呼び出す。

更新ルール（2026-09-01 改定）:
  [全機種] sis_machine_stats の貢献週が予測上限を超えたら **予測値は変えず**、
           longevityOverrun（実績が上限を超えた事実）だけを記録する。

**やらないこと（過去にやって外した方法）**
  ・デイリー全国ランキングの順位倍率で longevityMin/Max を書き換える方式は廃止した。
    確定4機種すべてで過大評価だった（バイオRE:3 を38〜47週に自動更新→実績5週で終了、
    ビッグドリームを21〜24週→実績5週）。columnData の longevityPolicy には「廃止」と
    書いてあるのにコードだけ残って毎平日3回動いていたため、2026-09-01 に削除した。
    新台の予測は2週診断（sisRecord.tier × update_forecast.py の到達週分布）に一本化する。
  ・実績が上限を超えたときに上限を+4して延長する処理も廃止した。予測は導入2週目で確定し
    以降変えないルールなので、延長すると上振れ側で miss が出ず答え合わせが甘くなる。

"""

import sys
import io
import os
import json
import requests
from datetime import date

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

SUPABASE_URL = "https://vpzbtuucopucablwyqeq.supabase.co"
COLUMN_DATA_PATH = os.path.join(ROOT_DIR, "src", "columnData.json")

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

        # ② 全機種: 実績が予測上限を超えたら「超えた事実」だけ記録する（予測値は変えない）
        contrib = stats.get(sis_name) if sis_name else None
        if contrib and col.get("longevityMax") and contrib > col["longevityMax"]:
            over = {"contribWeeks": contrib, "predictedMax": col["longevityMax"],
                    "overBy": contrib - col["longevityMax"], "asOf": today}
            if col.get("longevityOverrun") != over:
                print(f"  [{col['name']}] SIS実績{contrib}週 > 予測上限{col['longevityMax']}週"
                      f"（+{over['overBy']}週・予測は据え置き）")
                col["longevityOverrun"] = over
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
