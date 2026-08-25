# -*- coding: utf-8 -*-
"""YouTubeのコメントを実取得する。

DMMの評価点は母数13機種・件数の偏りがあり、納得感の指標として弱かった。
コメントは打ち手が動画を見ながら書いたもので、1機種で数千件集まる。
公式APIのキーは持っていないので、視聴ページから内部APIのキーと継続トークンを取り出して
`youtubei/v1/next` を順に叩く（ページングは continuationItemRenderer のトークンを辿る）。

  python scripts/misc/fetch_youtube_comments.py <出力json> <videoId> [videoId ...] [--max 500]

取れるもの: 本文 / いいね数 / 返信数 / 投稿者
取れないもの: 低評価数（YouTubeが非公開）、コメントの並び順の指定（既定は「人気順」）
"""
import io
import json
import os
import re
import subprocess
import sys
import time

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/122 Safari/537.36")
TMP = os.path.join(os.environ.get("TEMP", "."), "_ytc.html")


def sh(args, body=None):
    r = subprocess.run(args, input=body, capture_output=True, text=True, encoding="utf-8")
    return r.stdout or ""


def watch_meta(vid):
    """視聴ページから内部APIのキー・クライアント版・コメント欄の継続トークンを取る"""
    sh(["curl", "-s", "-A", UA, "-L", "--max-time", "45",
        "https://www.youtube.com/watch?v=" + vid, "-o", TMP])
    if not os.path.exists(TMP):
        return None
    h = io.open(TMP, encoding="utf-8", errors="replace").read()
    k = re.search(r'"INNERTUBE_API_KEY":"([\w-]+)"', h)
    v = re.search(r'"INNERTUBE_CONTEXT_CLIENT_VERSION":"([\d.]+)"', h)
    toks = list(dict.fromkeys(re.findall(r'"token":"([\w%\-=]{60,})"', h)))
    title = re.search(r'"title":\{"runs":\[\{"text":"(.*?)"\}', h)
    if not (k and v and toks):
        return None
    return {"key": k.group(1), "ver": v.group(1), "toks": toks,
            "title": (title.group(1) if title else "")}


def call(meta, tok):
    body = json.dumps({"context": {"client": {"clientName": "WEB",
                       "clientVersion": meta["ver"], "hl": "ja", "gl": "JP"}},
                       "continuation": tok}, ensure_ascii=False)
    return sh(["curl", "-s", "-A", UA, "--max-time", "45",
               "https://www.youtube.com/youtubei/v1/next?key=" + meta["key"],
               "-H", "Content-Type: application/json", "--data-binary", "@-"], body)


def parse(raw):
    """commentEntityPayload と commentRenderer の両形式から本文・いいね数を取る"""
    out = []
    try:
        j = json.loads(raw)
    except Exception:
        return out, None
    nxt = None

    def walk(o):
        nonlocal nxt
        if isinstance(o, dict):
            if "commentEntityPayload" in o:
                p = o["commentEntityPayload"]
                pr = p.get("properties") or {}
                tl = p.get("toolbar") or {}
                body = ((pr.get("content") or {}).get("content")) or ""
                if body:
                    out.append({"text": body,
                                "likes": tl.get("likeCountNotliked") or tl.get("likeCountLiked") or "0",
                                "replies": tl.get("replyCount") or "0"})
            if "commentRenderer" in o:
                c = o["commentRenderer"]
                runs = ((c.get("contentText") or {}).get("runs")) or []
                body = "".join(r.get("text", "") for r in runs)
                if body:
                    out.append({"text": body,
                                "likes": str(c.get("voteCount", {}).get("simpleText", "0")),
                                "replies": "0"})
            if o.get("continuationItemRenderer"):
                ep = o["continuationItemRenderer"].get("continuationEndpoint") or {}
                t = ((ep.get("continuationCommand") or {}).get("token"))
                if t:
                    nxt = t
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
    walk(j)
    return out, nxt


def fetch(vid, cap=500):
    meta = watch_meta(vid)
    if not meta:
        print("   %s メタが取れない" % vid)
        return []
    got, tok = [], None
    # コメントが返るトークンを探す
    for t in meta["toks"]:
        raw = call(meta, t)
        cs, nx = parse(raw)
        if cs:
            got, tok = cs, nx
            break
        time.sleep(0.5)
    if not got:
        print("   %s コメントが返らない" % vid)
        return []
    # ページング
    while tok and len(got) < cap:
        raw = call(meta, tok)
        cs, tok = parse(raw)
        if not cs:
            break
        got += cs
        time.sleep(0.6)
    print("   %s %-46s %4d件" % (vid, meta["title"][:46], len(got)))
    return [dict(c, vid=vid) for c in got]


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    cap = 500
    if "--max" in sys.argv:
        cap = int(sys.argv[sys.argv.index("--max") + 1])
    out, vids = args[0], args[1:]
    all_c = []
    for v in vids:
        all_c += fetch(v, cap)
    io.open(out, "w", encoding="utf-8").write(json.dumps(all_c, ensure_ascii=False, indent=1))
    print("\n計 %d件 → %s" % (len(all_c), out))


if __name__ == "__main__":
    main()
