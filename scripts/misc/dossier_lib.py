# -*- coding: utf-8 -*-
"""ドシエを組むための共通ヘルパー。機種ごとのスクリプトから使う。"""
import io
import json

P = r"C:\Users\h.kadoya\Desktop\slocri\src\machineDossiers.json"
V = "https://www.youtube.com/watch?v="


class Doc:
    def __init__(self):
        self.S = []

    def part(self, num, v, sub, pid):
        self.S.append({"t": "part", "num": num, "v": v, "sub": sub, "id": pid, "closed": True})

    def h(self, v, lv=2):
        self.S.append({"t": "h", "v": v, "lv": lv})

    def p(self, v):
        self.S.append({"t": "p", "v": v})

    def note(self, v):
        self.S.append({"t": "note", "v": v})

    def raw(self, o):
        self.S.append(o)

    def table(self, head, rows, hi=None, tnote=None):
        o = {"t": "table", "head": head, "rows": rows}
        if hi is not None:
            o["hi"] = hi
        if tnote:
            o["note"] = tnote
        self.S.append(o)

    def kpis(self, items):
        self.S.append({"t": "kpis", "v": [{"k": k, "v": v, "n": n} for k, v, n in items]})

    def bullets(self, title, items, tail=None):
        o = {"t": "bullets", "title": title, "items": items}
        if tail:
            o["tail"] = tail
        self.S.append(o)

    def radar(self, name, axes, values, table, score=None):
        v = {}
        if score:
            v["score"] = {"total": score[0], "parts": [
                {"k": "実績3軸（①②③・185機種で8週目に揃えた軸）", "v": score[1]},
                {"k": "参考2軸（④⑤・経過週を揃えられない軸）", "v": score[2]}]}
        self.S.append({"t": "radar", "v": {
            "axes": axes,
            "series": [{"label": name, "color": "brand", "values": values}],
            "caption": "外側ほど上位。**軸の順序を全機種で固定**しているので、この形はそのまま他機種と比べられる。"
                       "重みは①35%・②20%・③20%・④15%・⑤10%で、"
                       "**貢献週をどれだけ説明するかを実測して決めた**（根拠はⅡ章）。",
            "table": table, **v}})

    def videos(self, groups):
        self.S.append({"t": "videos", "v": groups})

    def links(self, items):
        self.S.append({"t": "links", "v": [{"label": a, "url": b} for a, b in items]})

    def glossary(self, items):
        self.S.append({"t": "glossary", "base": True,
                       "v": [{"group": "この台だけの用語", "items": items}]})


def vid(title, i, ch, ln, views, note=""):
    return {"title": title, "url": V + i, "ch": ch, "len": ln, "views": views, "note": note}


AX = ["① 需要", "② 持続", "③ 総稼働", "④ 関心度", "⑤ 納得感"]


def axes(d1, d2, d3, d4, d5):
    return [
        {"name": AX[0], "lines": ["8週目の稼働値", d1]},
        {"name": AX[1], "lines": ["8週目÷2週目の総稼働", d2]},
        {"name": AX[2], "lines": ["全国平均の台 換算", d3]},
        {"name": AX[3], "small": True, "lines": ["YouTube上位20本", d4]},
        {"name": AX[4], "small": True, "lines": ["DMM評価点", d5]},
    ]


DATA_NOTE = (
    "**データ注記。**稼働値・総稼働・台数はSISの週次データ（`sis_weekly_data`）と"
    "全国日次実値（`sis_national_daily`）から計算した。分母の全国平均アウトは週内の日次を平均したもので、"
    "**avg_inが3,000未満の欠測日23日は除いている**（除かないとその週の全機種の稼働値が過大になる）。"
    "貢献週は`sis_machine_stats`の公式値。\n"
    "④は2026-08-21に13機種を同一4クエリ（実践／設定6／天井／初打ち）で測定。⑤は同日のDMMぱちタウン実測。"
    "解析値は2サイト以上で一致した値のみを載せ、**食い違った箇所は差があること自体を本文に書いた。**"
    "本稿の数字はすべて2026-08-21時点。")


def save(dos, at_top=True):
    d = json.loads(io.open(P, encoding="utf-8").read())
    d["dossiers"] = [x for x in d["dossiers"] if x["id"] != dos["id"]]
    if at_top:
        d["dossiers"].insert(0, dos)
    else:
        d["dossiers"].append(dos)
    d["updatedAt"] = "2026-08-21"
    io.open(P, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
    json.load(io.open(P, encoding="utf-8"))
    import collections
    c = collections.Counter(x["t"] for x in dos["sections"])
    print("%s を保存: %dセクション / 章%d" % (dos["machine"], len(dos["sections"]), c["part"]))
    print("  型:", dict(c))
    print("  ドシエ一覧:", [x["id"] for x in d["dossiers"]])
