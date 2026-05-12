"""
週毎SISデータ一覧_2026.xlsm から稼働貢献週を Supabase の sis_machine_stats にインポートする。

使い方:
  python import_sis_weekly.py
"""

import sys
import io
import os
import re
import json
import requests

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

WEEKLY_PATH = "Z:/01_SISデータ/PS/週毎SISデータ一覧_2026.xlsm"
SUPABASE_URL = "https://vpzbtuucopucablwyqeq.supabase.co"


def load_env_local():
    env_path = os.path.join(os.path.dirname(__file__), ".env.local")
    if not os.path.exists(env_path):
        return
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, val = line.partition("=")
                os.environ.setdefault(key.strip(), val.strip())


def extract_records(path):
    try:
        import openpyxl
    except ImportError:
        print("openpyxl が未インストールです: pip install openpyxl")
        sys.exit(1)

    print(f"Excelを読み込み中: {path}")
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True, keep_vba=True)

    ws = wb["機種一覧表"]
    rows = list(ws.iter_rows(values_only=True))

    # ヘッダー行1のcol3が最新確定週（例: "4.27~5.3"）
    last_week_start = None
    header = rows[1]
    week_str = header[3] if len(header) > 3 else None
    if week_str and isinstance(week_str, str) and "~" in week_str:
        start = week_str.split("~")[0].strip()
        parts = start.split(".")
        if len(parts) == 2:
            try:
                month, day = int(parts[0]), int(parts[1])
                last_week_start = f"2026-{month:02d}-{day:02d}"
            except ValueError:
                pass

    records = []
    for row in rows[2:]:  # row 0〜1はヘッダー
        machine = row[1]
        contrib_raw = row[2]
        if not machine or not isinstance(machine, str):
            continue
        if not machine.startswith("L"):
            continue
        # "X週稼動貢献中" からX を抽出
        if contrib_raw and isinstance(contrib_raw, str):
            m = re.search(r"(\d+)週", contrib_raw)
            weeks = int(m.group(1)) if m else 0
        else:
            weeks = 0

        records.append({
            "machine": machine.strip(),
            "contrib_weeks": weeks,
        })

    wb.close()
    return records, last_week_start


def upsert_records(records, api_key):
    headers = {
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }

    total = len(records)
    res = requests.post(
        f"{SUPABASE_URL}/rest/v1/sis_machine_stats",
        headers=headers,
        data=json.dumps(records),
    )
    if res.status_code in (200, 201):
        print(f"  アップロード完了: {total} 件")
    else:
        print(f"  エラー ({res.status_code}): {res.text[:200]}")


def upsert_config(last_week_start, api_key):
    if not last_week_start:
        return
    headers = {
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }
    config = [{"machine": "__config__", "contrib_weeks": 0, "last_week_start": last_week_start}]
    res = requests.post(
        f"{SUPABASE_URL}/rest/v1/sis_machine_stats",
        headers=headers,
        data=json.dumps(config),
    )
    if res.status_code in (200, 201):
        print(f"  最終確定週を保存: {last_week_start}")
    else:
        print(f"  configエラー ({res.status_code}): {res.text[:200]}")


def run():
    load_env_local()

    api_key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")
    if not api_key:
        print("エラー: VITE_SUPABASE_ANON_KEY が未設定です")
        sys.exit(1)

    win_path = WEEKLY_PATH.replace("/", "\\")
    if not os.path.exists(win_path):
        print(f"エラー: ファイルが見つかりません: {WEEKLY_PATH}")
        sys.exit(1)

    records, last_week_start = extract_records(WEEKLY_PATH)
    print(f"\n抽出: {len(records)} 機種　最終確定週: {last_week_start}\n")

    if not records:
        print("レコードなし。終了します。")
        return

    print("Supabase にアップロード中...")
    upsert_records(records, api_key)
    upsert_config(last_week_start, api_key)
    print("\n完了。")

    print("稼働貢献週 上位10機種:")
    top = sorted(records, key=lambda r: r["contrib_weeks"], reverse=True)[:10]
    for r in top:
        print(f"  {r['contrib_weeks']:3d}週  {r['machine']}")


if __name__ == "__main__":
    run()
