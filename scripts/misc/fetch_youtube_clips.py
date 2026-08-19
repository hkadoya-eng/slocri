# -*- coding: utf-8 -*-
"""機種の参考動画を検索結果から実取得する（機種深堀り分析＝ドシエ用）。
   videoId / タイトル / 尺 / チャンネル / 再生回数 を取り、短尺順に並べて JSON へ出す。

使い方:
    python scripts/misc/fetch_youtube_clips.py <出力JSON> "クエリ1" "クエリ2" ...

取れないもの（推測で埋めないこと）:
  ・チャプター、概要欄のタイムスタンプ、ヒートマップ → 見どころの「◯分◯秒」は示せない
  ・検索の総ヒット数（estimatedResults）→ クエリ次第で桁が動くので数値として使えない
  ・コメント数 → 検索結果には含まれない
そのため「短尺の切り出し＝見どころそのもの」を先頭に置き、長尺は再生数の多い順に並べる。
"""
import re, io, json, os, sys, subprocess, urllib.parse, time

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/122 Safari/537.36")


def dec(x):
    try:
        return json.loads('"%s"' % x)
    except Exception:
        return x


def search(query, tmp):
    subprocess.run(["curl", "-s", "-A", UA, "-L", "--max-time", "30",
                    "https://www.youtube.com/results?search_query=" + urllib.parse.quote(query),
                    "-o", tmp], check=False)
    s = io.open(tmp, encoding="utf-8", errors="replace").read() if os.path.exists(tmp) else ""
    out = []
    # videoRenderer 単位に切って拾う。ブロックを切らないと別動画の値が混ざる
    for blk in [b[:1600] for b in re.split(r'"videoRenderer":', s)[1:]]:
        vid = re.search(r'"videoId":"([\w-]{11})"', blk)
        ti = re.search(r'"title":\{"runs":\[\{"text":"(.{4,120}?)"\}', blk)
        # lengthText は内側に accessibility の入れ子があるので [^}]* では届かない
        ln = re.search(r'"lengthText":.{0,220}?"simpleText":"(\d{1,2}:\d{2}(?::\d{2})?)"', blk, re.S)
        ch = (re.search(r'"longBylineText":\{"runs":\[\{"text":"(.{2,40}?)"', blk)
              or re.search(r'"ownerText":\{"runs":\[\{"text":"(.{2,40}?)"', blk))
        vc = re.search(r'"viewCountText":\{"simpleText":"([\d,]+)回視聴"', blk)
        if not (vid and ti and ln):
            continue
        p = [int(x) for x in ln.group(1).split(":")]
        sec = p[0] * 60 + p[1] if len(p) == 2 else p[0] * 3600 + p[1] * 60 + p[2]
        out.append({"id": vid.group(1), "title": dec(ti.group(1)), "len": ln.group(1), "sec": sec,
                    "ch": dec(ch.group(1)) if ch else "?",
                    "views": int(vc.group(1).replace(",", "")) if vc else None, "q": query})
    return out


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return 1
    dst, queries = sys.argv[1], sys.argv[2:]
    tmp = os.path.join(os.environ.get("TEMP", "."), "_yt_search.html")
    seen = {}
    for q in queries:
        got = search(q, tmp)
        new = [r for r in got if r["id"] not in seen]
        for r in new:
            seen[r["id"]] = r
        print("  %-28s 取得%2d本（新規%2d）" % (q, len(got), len(new)))
        time.sleep(1.2)
    try:
        os.remove(tmp)
    except OSError:
        pass
    rows = sorted(seen.values(), key=lambda r: r["sec"])
    json.dump(rows, io.open(dst, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("計 %d本 → %s" % (len(rows), dst))
    print("=== 10分以内（＝見どころの切り出し候補）===")
    for r in rows:
        if r["sec"] < 600:
            print("  %-7s %-11s %-16s %s" % (r["len"], (format(r["views"], ",") + "回") if r["views"] else "-",
                                             r["ch"][:15], r["title"][:56]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
