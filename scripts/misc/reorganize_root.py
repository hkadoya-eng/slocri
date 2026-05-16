"""ルート直下のファイルをサブフォルダに整理する。

  - scripts/make_pptx/  : make_*_pptx.py + make_pptx.py + make_proposal_*.py + make_*_excel.py + propose_game.py + make_madoka_test.py
  - scripts/import/     : import_*.py
  - scripts/build/      : build_*.py, fill_sis_avg.py
  - scripts/misc/       : update_*.py, fetch_ogp.py, normalize_machines.py, analyze_dup.py, check_mtime.py
  - sql/                : *.sql
  - bat/                : run_*.bat
  - tmp_archive/        : 未参照のtmp/debugファイル

移動した python ファイルの `os.path.dirname(__file__)` を ROOT_DIR ベースに置換。
"""
import os
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")

ROOT = r"C:\Users\h.kadoya\Desktop\slocri"

MOVES = {
    "scripts/make_pptx": [
        "make_atarigami_pptx.py", "make_atarigami_pptx_v2.py",
        "make_azurlane_pptx.py", "make_bansho_pptx.py",
        "make_biohazard5_pptx.py", "make_blackjack_pptx.py",
        "make_cz_excel.py", "make_enenno_pptx.py",
        "make_hokuto_pptx.py", "make_kyokosuiri_pptx.py",
        "make_madoka_pptx.py", "make_madoka_test.py",
        "make_mhrise_pptx.py", "make_milliongod_pptx.py",
        "make_monkeyturn_pptx.py", "make_monst_plot_excel.py",
        "make_monst_pptx.py", "make_phoenix_pptx.py",
        "make_pptx.py", "make_proposal_light.py",
        "make_proposal_pptx.py", "make_revuestarlight_pptx.py",
        "make_sedai_pptx.py", "make_series_overview_pptx.py",
        "make_tokyoghoul_pptx.py", "make_tokyorevengers_pptx.py",
        "make_yormungand_pptx.py", "make_yoshimune_pptx.py",
        "propose_game.py",
    ],
    "scripts/import": [
        "import_csv.py", "import_national_daily.py",
        "import_sis.py", "import_sis_weekly.py",
    ],
    "scripts/build": [
        "build_library.py", "build_sis_library.py", "fill_sis_avg.py",
    ],
    "scripts/misc": [
        "analyze_dup.py", "check_mtime.py", "fetch_ogp.py",
        "normalize_machines.py", "update_analysis.py",
        "update_machine_review_predictions.py", "reorganize_root.py",
    ],
    "sql": [
        "chat_messages_setup.sql", "collection_requests_setup.sql",
        "proposal_requests_alter.sql", "proposal_requests_setup.sql",
        "sis_data.sql", "sis_machine_stats.sql", "supabase_push_setup.sql",
    ],
    "bat": [
        "run_import_sis.bat", "run_sis_import.bat", "run_sis_weekly.bat",
    ],
    "tmp_archive": [
        "bigdream.txt", "collection_tmp.json", "dragonball_proposal.json",
        "dragonball_result.txt", "dragonball_result_db.txt", "dupes.txt",
        "ep.txt", "machine_check.txt", "mg.txt", "posts_tmp.json",
        "proposal_tmp.json", "proposals_meta.json", "proposals_pending.json",
        "proposals_tmp.json", "tmp_proposal_debug.txt",
    ],
}


def make_dirs():
    for sub in MOVES.keys():
        os.makedirs(os.path.join(ROOT, sub), exist_ok=True)
    print(f"作成: {len(MOVES)}ディレクトリ")


def git_mv(src, dst):
    """git mv で履歴を保持して移動"""
    try:
        subprocess.run(
            ["git", "mv", src, dst],
            cwd=ROOT, check=True, capture_output=True
        )
        return True
    except subprocess.CalledProcessError as e:
        # ファイルが存在しないなど
        print(f"  skip {src}: {e.stderr.decode('utf-8', errors='replace').strip()}")
        return False


def patch_python_file(path):
    """`os.path.dirname(__file__)` を ROOT_DIR ベースに置換。
       ROOT_DIR は scripts/xxx/file.py から見て ../../ にあたる。"""
    with open(path, encoding="utf-8") as f:
        content = f.read()

    if "os.path.dirname(__file__)" not in content:
        return False

    # ROOT_DIR の挿入が必要かチェック
    if "ROOT_DIR =" in content:
        return False  # 既に存在

    # import os の直後に ROOT_DIR を挿入
    new_content = content.replace(
        "os.path.dirname(__file__)",
        "ROOT_DIR"
    )

    # ROOT_DIR の定義を import 直後に追加
    # 単純化: ファイル先頭の最後のimport行の後に追加
    lines = new_content.split("\n")
    insert_idx = 0
    for i, ln in enumerate(lines):
        if ln.startswith("import ") or ln.startswith("from "):
            insert_idx = i + 1
    # 空行をスキップして挿入
    define = 'ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))'
    lines.insert(insert_idx, "")
    lines.insert(insert_idx + 1, define)
    new_content = "\n".join(lines)

    with open(path, "w", encoding="utf-8") as f:
        f.write(new_content)
    return True


def patch_bat_file(path):
    """BATファイル内のスクリプト参照パスを更新"""
    with open(path, encoding="cp932", errors="replace") as f:
        content = f.read()

    repls = [
        ("python check_mtime.py", "python scripts\\misc\\check_mtime.py"),
        ("python import_sis.py", "python scripts\\import\\import_sis.py"),
        ("python import_sis_weekly.py", "python scripts\\import\\import_sis_weekly.py"),
        ("python import_national_daily.py", "python scripts\\import\\import_national_daily.py"),
        ("python build_sis_library.py", "python scripts\\build\\build_sis_library.py"),
        ("python update_machine_review_predictions.py", "python scripts\\misc\\update_machine_review_predictions.py"),
        ("python fetch_ogp.py", "python scripts\\misc\\fetch_ogp.py"),
        ("python import_csv.py", "python scripts\\import\\import_csv.py"),
    ]
    new_content = content
    for old, new in repls:
        new_content = new_content.replace(old, new)

    if new_content != content:
        with open(path, "w", encoding="cp932", errors="replace") as f:
            f.write(new_content)
        return True
    return False


def main():
    make_dirs()

    moved_python_files = []
    moved_bat_files = []

    for sub, files in MOVES.items():
        for fname in files:
            src = os.path.join(ROOT, fname)
            dst_dir = os.path.join(ROOT, sub)
            dst = os.path.join(dst_dir, fname)
            if not os.path.exists(src):
                print(f"  skip {fname}: 存在しません")
                continue
            if git_mv(src, dst):
                if fname.endswith(".py"):
                    moved_python_files.append(dst)
                elif fname.endswith(".bat"):
                    moved_bat_files.append(dst)
                print(f"  ✓ {fname} → {sub}/")

    # Pythonファイルのパス参照を修正
    patched = 0
    for f in moved_python_files:
        if patch_python_file(f):
            patched += 1
    print(f"\nPython パス修正: {patched}/{len(moved_python_files)}")

    # BATファイルのスクリプトパス参照を修正
    for f in moved_bat_files:
        if patch_bat_file(f):
            print(f"  ✓ BAT 更新: {os.path.basename(f)}")


if __name__ == "__main__":
    main()
