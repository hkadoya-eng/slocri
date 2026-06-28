---
name: sis-national-real-value
description: スロクリのSIS稼働データを扱うときの鉄則。「全国」と名のつく稼働値(アウト/IN/出玉率/粗利等)は必ず sis_national_daily の全国実値を使い、対象機種の部分集合の単純平均を"全国"として出さない。デイリーとウィークリーで同じ全国実値ソースを使い数値を整合させる(週次は該当週=月〜日の日次平均)。SIS稼働の表示・集計・新ビュー追加・「数値が乖離する/おかしい」調査のときに必ず参照する。
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - PowerShell
  - Glob
  - Grep
---

# SIS稼働データの「全国実値」鉄則

スロクリのSIS稼働データ（App.jsx の稼働タブ＝デイリー/ウィークリー）を扱うときの恒久ルール。
2026-06-28、ウィークリー「平均IN」が対象L機種119台の単純平均で全国実値とかけ離れて見える事故（約5,862 vs 全国実値約8,951）を直したのを機に確立。**今後ずっとこの方針で扱う。**

## 大原則（必ず守る）

1. **「全国」と名のつく稼働値は全国実値だけで出す。**
   アウト / IN / 出玉率 / 粗利 / 売上 / コイン単価 などを「全国」「全体」として表示・集計するときは、
   必ず `sis_national_daily`（全国実値・全機種ベース）から取る。
   **対象機種の部分集合（例: L機種だけ）の `out_coins` 単純平均を"全国"として見せてはいけない。**
   母集団が違うため低く出て、デイリーの全国アウトと乖離して誤解を生む。

2. **デイリーとウィークリーで同じ全国実値ソースを使い、数値を整合させる。**
   - デイリーの「全国アウト」 = `sis_national_daily[selDate].avg_in`（既存）。
   - ウィークリーの「全国IN」 = 選択週（**月曜起点の月〜日**）の `sis_national_daily[date].avg_in` の平均（`weekNationalIn`）。
   - 両者は同じソースなので、同じ週なら8000枚台後半で一致する。

3. **アウト = IN = 投入総数（同一指標・視点違い）。**
   アウトもINも「客が入れたメダル総数（＝台から出てきた回転数ベースの総アウト）」を指す。
   出玉率 = OUT(払出) ÷ IN(投入=アウト)。だから「全国アウト」と「全国IN」は同じ数値ソースでよい。

4. **データが無い期間は「—」表示。サイレント補完・代替値で埋めない。**
   その週/日の `sis_national_daily` が無ければ `—`。フォールバック値で「全国に見える別物」を出さない。
   （関連方針: データ取得失敗をサイレント補完しない）

5. **機種別の行は各機種の実値のまま。**
   機種ごとの行（weekRows の各機種IN等）は母集団が機種単位で整合しているので、従来どおり各機種の実値を出す。
   "全国/全体"のサマリー値だけを `sis_national_daily` に切り替える。

## 実装の型（App.jsx）

ウィークリーで全国実値を出すときの計算（既存 `weekNationalIn` がこの形）:

```js
// selWeek.key = その週の月曜 'YYYY-MM-DD' / nationalDaily = sis_national_daily を date キーにした連想配列
const weekNationalIn = (() => {
  if (!selWeek) return null;
  const mon = new Date(selWeek.key + "T00:00:00");
  const vals = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon); d.setDate(mon.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const v = nationalDaily[key]?.avg_in;
    if (v != null) vals.push(v);
  }
  return vals.length ? vals.reduce((s,v)=>s+v,0)/vals.length : null;
})();
```

他の全国実値フィールド（出玉率・粗利・売上・コイン単価）を週次サマリーに足すときも、
同じ「その週の日次 `sis_national_daily[date].<field>` を平均」する形にそろえる。

## 全国実値ソースの所在（探す前にここを見る）

- **生きている全国実値** = `Z:/01_SISデータ/PS/日毎稼働全体.xlsx` シート「他機種含む」の『全国アウト』行。**日次のみ**。
  `scripts/import/import_national_daily.py` が `sis_national_daily`（`avg_in, payout_rate, gross_profit, national_sales, coin_price, coin_profit`）へ取り込み済み。
- 同ファイルの『週間稼働』シートは **2016-06-05 で更新停止＝使えない**。
- 週次Excel `週毎SISデータ一覧_2026.xlsm` は **機種別行のみ**で全国/合計行は無い（`import_sis_weekly.py` は L機種行だけ取得）。
- → **週次の全国実値は `sis_national_daily` の週内日次平均で出すのが唯一の生きた手段。** 週次Excelの機種平均に戻さない。

## やってはいけないこと

- 部分集合の単純平均を「全国」「全体」ラベルで表示する。
- デイリーとウィークリーで別ソース・別母集団の値を並べて見せる。
- 全国値が取れない週/日をフォールバック値で埋めて「数字が出ている」ように見せる。
- 機種別行を全国実値で上書きする（機種行は各機種の実値のまま）。

関連メモ: [[project_weekly_national_in]] [[project_sis_national_daily]] [[project_sis_weekly]] [[feedback_no_silent_fallback]]
