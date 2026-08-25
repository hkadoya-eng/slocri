# -*- coding: utf-8 -*-
"""導入から8週以内に公開された動画だけを選ぶ。

コメントの温度は時間で変わるため、機種間で比べるには公開時期を揃える必要がある。
既に集めた候補（fetch_youtube_clips.py の出力）から公開日を取り、
導入日＋0〜56日に入る動画だけを残す。

  python scripts/misc/yt_window_pick.py <clips.json> <導入日 YYYY-MM-DD> <出力json> [--top 20]
"""
import io
import json
import os
import re
import subprocess
import sys
from datetime import date

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/122 Safari/537.36")
TMP = os.path.join(os.environ.get("TEMP", "."), "_ytw.html")
CACHE = os.path.join(os.environ.get("TEMP", "."), "yt_pubdate_cache.json")


def pubdate(vid, cache):
    if vid in cache:
        return cache[vid]
    subprocess.run(["curl", "-s", "-A", UA, "-L", "--max-time", "40",
                    "https://www.youtube.com/watch?v=" + vid, "-o", TMP], check=False)
    d = None
    if os.path.exists(TMP):
        h = io.open(TMP, encoding="utf-8", errors="replace").read()
        m = (re.search(r'"uploadDate":"(\d{4}-\d{2}-\d{2})', h)
             or re.search(r'"publishDate":"(\d{4}-\d{2}-\d{2})', h))
        d = m.group(1) if m else None
    cache[vid] = d
    io.open(CACHE, "w", encoding="utf-8").write(json.dumps(cache))
    return d


def main():
    clips, rel, out = sys.argv[1], sys.argv[2], sys.argv[3]
    top = int(sys.argv[sys.argv.index("--top") + 1]) if "--top" in sys.argv else 20
    j = json.load(io.open(clips, encoding="utf-8"))
    items = j if isinstance(j, list) else (j.get("clips") or j.get("items"))
    items = sorted(items, key=lambda x: -(x.get("views") or 0))[:top]
    cache = json.load(io.open(CACHE, encoding="utf-8")) if os.path.exists(CACHE) else {}
    r = date.fromisoformat(rel)
    keep = []
    for x in items:
        p = pubdate(x["id"], cache)
        if not p:
            continue
        dd = (date.fromisoformat(p) - r).days
        if 0 <= dd <= 56:
            keep.append({**x, "pub": p, "days": dd})
    keep.sort(key=lambda x: -(x.get("views") or 0))
    io.open(out, "w", encoding="utf-8").write(json.dumps(keep, ensure_ascii=False, indent=1))
    print("  候補%d本 → 8週以内 %d本（累計再生 %s回）" % (
        len(items), len(keep), format(sum(x.get("views") or 0 for x in keep), ",")))
    for x in keep[:12]:
        print("     +%2d日 %9s回 %s" % (x["days"], format(x.get("views") or 0, ","), x["title"][:52]))


if __name__ == "__main__":
    main()
