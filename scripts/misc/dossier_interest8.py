# -*- coding: utf-8 -*-
"""④関心度を「導入8週以内の動画」で測り、結果をファイルに残す。

前は測るたびに手元で数えていたので、あとから分布を確かめられなかった。
このスクリプトが唯一の測り方で、出力（data/interest8.json）が唯一の記録になる。

測り方（全機種で同じ）:
  1. 検索語は「機種名＋実践／設定6／天井／初打ち」の4クエリに固定
  2. 再生数の多い上位20本を候補にし、**導入日から56日以内に公開されたもの**だけ残す
  3. 残った動画の「累計再生数」と「コメント総数」を④の材料にする
     好評・悪評は区別しない（コメントが多いこと自体が関心の量）

対象は**導入2年以内**の機種に限る。それより古い台は導入8週の動画が検索上位に残らず、
本数が落ちて累計が実際より小さく出る。

  python scripts/misc/dossier_interest8.py            # 全機種
  python scripts/misc/dossier_interest8.py --only god  # キーで絞る
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
OUT = "data/interest8.json"
CACHE = os.path.join(os.environ.get("TEMP", "."), "yt_interest8_cache.json")
TMPD = os.path.join(os.environ.get("TEMP", "."), "_i8")
WINDOW = 56          # 導入からの日数
TOPN = 20            # 候補にする本数（再生数の多い順）

# キー, 表示名, 検索語, 導入日（SISの初出週）
MACHINES = [
    ("sao2",      "スマスロ ソードアート・オンラインⅡ", "ソードアートオンライン2 スマスロ", "2026-06-08"),
    ("otome5",    "L戦国乙女5",                    "戦国乙女5 スマスロ",           "2026-06-08"),
    ("god",       "Lミリオンゴッド-神々の軌跡-",       "ミリオンゴッド 神々の軌跡",      "2026-04-20"),
    ("yoshimune", "L真打吉宗",                     "真打吉宗 スマスロ",            "2026-04-06"),
    ("kyoko",     "L虚構推理",                     "虚構推理 スマスロ",            "2026-04-06"),
    ("kabaneri",  "L甲鉄城のカバネリ海門決戦",         "カバネリ 海門決戦",            "2026-03-02"),
    ("thunderv",  "スマスロ サンダーV",              "サンダーV スマスロ",           "2026-03-02"),
    ("kokaku",    "スマスロ攻殻機動隊",              "攻殻機動隊 スマスロ",          "2026-02-01"),
    ("enen2",     "スマスロ 炎炎ノ消防隊2",           "炎炎ノ消防隊2 スマスロ",        "2026-02-01"),
    ("hokuto2",   "スマスロ 北斗の拳 転生の章2",       "北斗の拳 転生の章2",           "2026-01-05"),
    ("bakemono",  "スマスロ化物語",                  "化物語 スマスロ",             "2025-12-08"),
    ("onimusha3", "スマスロ新鬼武者3",               "新鬼武者3 スマスロ",           "2025-10-06"),
    ("ghoul",     "L東京喰種",                     "東京喰種 スマスロ",            "2025-02-03"),
    ("kaguya",    "スマスロ かぐや様は告らせたい",      "かぐや様は告らせたい スマスロ",   "2024-09-02"),
]
SUFFIX = ["実践", "設定6", "天井", "初打ち"]


def sh(args, body=None):
    r = subprocess.run(args, input=body, capture_output=True, text=True, encoding="utf-8")
    return r.stdout or ""


def load(p, dflt):
    return json.load(io.open(p, encoding="utf-8")) if os.path.exists(p) else dflt


def save(p, o):
    d = os.path.dirname(p)
    if d and not os.path.isdir(d):
        os.makedirs(d)
    io.open(p, "w", encoding="utf-8").write(json.dumps(o, ensure_ascii=False, indent=1) + "\n")


def clips(name, out):
    """検索して候補を集める（既存スクリプトをそのまま使う）"""
    if not os.path.isdir(TMPD):
        os.makedirs(TMPD)
    qs = ["%s %s" % (name, s) for s in SUFFIX]
    sh([sys.executable, "scripts/misc/fetch_youtube_clips.py", out] + qs)
    j = load(out, [])
    return j if isinstance(j, list) else (j.get("clips") or j.get("items") or [])


def watch(vid, cache):
    """視聴ページから公開日・内部APIのキー・コメント欄の継続トークンを取る"""
    if vid in cache and cache[vid].get("pub") is not None and "comments" in cache[vid]:
        return cache[vid]
    f = os.path.join(TMPD, vid + ".html")
    if not os.path.isdir(TMPD):
        os.makedirs(TMPD)
    sh(["curl", "-s", "-A", UA, "-L", "--max-time", "45",
        "https://www.youtube.com/watch?v=" + vid, "-o", f])
    rec = {"pub": None, "comments": None}
    if os.path.exists(f):
        h = io.open(f, encoding="utf-8", errors="replace").read()
        m = re.search(r'"uploadDate":"(\d{4}-\d{2}-\d{2})', h)
        rec["pub"] = m.group(1) if m else None
        k = re.search(r'"INNERTUBE_API_KEY":"([\w-]+)"', h)
        v = re.search(r'"INNERTUBE_CONTEXT_CLIENT_VERSION":"([\d.]+)"', h)
        toks = list(dict.fromkeys(re.findall(r'"token":"([\w%\-=]{60,})"', h)))
        if k and v and toks:
            rec["comments"] = comment_count(k.group(1), v.group(1), toks)
        try:
            os.remove(f)
        except OSError:
            pass
    cache[vid] = rec
    save(CACHE, cache)
    return rec


def comment_count(key, ver, toks):
    """コメント欄の1回目の応答に入っている総件数を取る（本文は取らない）"""
    for tok in toks[:6]:
        body = json.dumps({"context": {"client": {"clientName": "WEB", "clientVersion": ver,
                          "hl": "ja", "gl": "JP"}}, "continuation": tok}, ensure_ascii=False)
        raw = sh(["curl", "-s", "-A", UA, "--max-time", "45",
                  "https://www.youtube.com/youtubei/v1/next?key=" + key,
                  "-H", "Content-Type: application/json", "--data-binary", "@-"], body)
        n = pick_count(raw)
        if n is not None:
            return n
    return None


def pick_count(raw):
    try:
        j = json.loads(raw)
    except Exception:
        return None
    found = []

    def num(s):
        s = re.sub(r"[^\d]", "", str(s))
        return int(s) if s else None

    def txt(c):
        if not isinstance(c, dict):
            return ""
        return c.get("simpleText") or "".join(r.get("text", "") for r in (c.get("runs") or []))

    def walk(o):
        if isinstance(o, dict):
            for k in ("commentsEntryPointHeaderRenderer", "commentsHeaderRenderer"):
                if k in o:
                    hd = o[k]
                    # commentsCount（数だけ）→ countText（「565 件のコメント」）→ commentCount の順に見る
                    for f in ("commentsCount", "countText", "commentCount"):
                        n = num(txt(hd.get(f)))
                        if n is not None:
                            found.append(n)
                            break
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
    walk(j)
    return max(found) if found else None


def one(key, label, name, rel):
    cache = load(CACHE, {})
    cand = sorted(clips(name, os.path.join(TMPD, key + "_clips.json")),
                  key=lambda x: -(x.get("views") or 0))[:TOPN]
    r = date.fromisoformat(rel)
    keep = []
    for x in cand:
        rec = watch(x["id"], cache)
        if not rec.get("pub"):
            continue
        dd = (date.fromisoformat(rec["pub"]) - r).days
        if 0 <= dd <= WINDOW:
            keep.append({"id": x["id"], "title": x.get("title"), "views": x.get("views") or 0,
                         "comments": rec.get("comments"), "pub": rec["pub"], "days": dd})
    keep.sort(key=lambda x: -x["views"])
    nc = [x for x in keep if x["comments"] is not None]
    return {"key": key, "machine": label, "query": name, "release": rel,
            "candidates": len(cand), "videos": len(keep),
            "views": sum(x["views"] for x in keep),
            "comments": sum(x["comments"] for x in nc),
            "commentsFrom": len(nc), "items": keep}


def main():
    only = sys.argv[sys.argv.index("--only") + 1].split(",") if "--only" in sys.argv else None
    res = load(OUT, {}).get("machines", {}) if os.path.exists(OUT) else {}
    for key, label, name, rel in MACHINES:
        if only and key not in only:
            continue
        r = one(key, label, name, rel)
        res[key] = r
        print("%-10s %-26s 候補%2d → 窓内%2d本  再生 %11s  コメント %6s（%d本ぶん）" % (
            key, label[:26], r["candidates"], r["videos"], format(r["views"], ","),
            format(r["comments"], ","), r["commentsFrom"]))
        save(OUT, {"note": "④関心度の実測。導入8週以内の動画のみ。dossier_interest8.py が生成する",
                   "window": WINDOW, "topN": TOPN, "queries": SUFFIX, "machines": res})
    print("\n→ %s（%d機種）" % (OUT, len(res)))


if __name__ == "__main__":
    main()
