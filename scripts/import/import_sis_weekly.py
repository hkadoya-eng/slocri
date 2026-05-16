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

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

WEEKLY_PATH = "Z:/01_SISデータ/PS/週毎SISデータ一覧_2026.xlsm"
SUPABASE_URL = "https://vpzbtuucopucablwyqeq.supabase.co"


def load_env_local():
    env_path = os.path.join(ROOT_DIR, ".env.local")
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


def parse_week_start(sheet_name):
    """シート名から週開始日(月曜)を返す。例: '4.27~5.3' → '2026-04-27'"""
    if "~" not in sheet_name:
        return None
    start = sheet_name.split("~")[0].strip().lstrip(".")
    parts = start.split(".")
    if len(parts) != 2:
        return None
    try:
        month, day = int(parts[0]), int(parts[1])
        if not (1 <= month <= 12 and 1 <= day <= 31):
            return None
        return f"2026-{month:02d}-{day:02d}"
    except ValueError:
        return None


def extract_weekly_records(path):
    try:
        import openpyxl
    except ImportError:
        print("openpyxl が未インストールです")
        sys.exit(1)

    wb = openpyxl.load_workbook(path, read_only=True, data_only=True, keep_vba=True)
    all_records = []
    for sheet_name in wb.sheetnames:
        week_start = parse_week_start(sheet_name)
        if not week_start:
            continue
        ws = wb[sheet_name]
        rows = list(ws.iter_rows(values_only=True))
        if len(rows) < 2:
            continue
        for row in rows[1:]:
            machine = row[1]
            if not machine or not isinstance(machine, str) or not machine.startswith("L"):
                continue
            out = row[6]
            if not isinstance(out, (int, float)):
                continue
            profit = row[8]
            payout = row[11]
            coin_price = row[9]
            avg_count = row[5]
            all_records.append({
                "machine": machine.strip(),
                "week_start": week_start,
                "out_coins": float(out),
                "gross_profit": float(profit) if isinstance(profit, (int, float)) else None,
                "payout_rate": float(payout) if isinstance(payout, (int, float)) else None,
                "coin_price": float(coin_price) if isinstance(coin_price, (int, float)) else None,
                "avg_machine_count": float(avg_count) if isinstance(avg_count, (int, float)) else None,
            })
    wb.close()
    return all_records


def upsert_weekly_records(records, api_key):
    if not records:
        return
    headers = {
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }
    chunk_size = 500
    total = 0
    for i in range(0, len(records), chunk_size):
        chunk = records[i:i + chunk_size]
        res = requests.post(
            f"{SUPABASE_URL}/rest/v1/sis_weekly_data",
            headers=headers,
            data=json.dumps(chunk),
        )
        if res.status_code in (200, 201):
            total += len(chunk)
        else:
            print(f"  エラー ({res.status_code}): {res.text[:200]}")
    print(f"  週次データアップロード完了: {total} 件")


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

    print("\n週次データを抽出中...")
    weekly_records = extract_weekly_records(WEEKLY_PATH)
    print(f"  {len(weekly_records)} 件")
    upsert_weekly_records(weekly_records, api_key)
    print("\n完了。")

    print("稼働貢献週 上位10機種:")
    top = sorted(records, key=lambda r: r["contrib_weeks"], reverse=True)[:10]
    for r in top:
        print(f"  {r['contrib_weeks']:3d}週  {r['machine']}")


if __name__ == "__main__":
    run()
