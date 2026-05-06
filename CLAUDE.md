# スロクリ プロジェクト設定

## 自動タスクの実行ルール

Cronジョブによる自動タスク（【自動ネタ収集タスク】【自動機種分析更新タスク】と書かれたプロンプト）は、
**ユーザーに確認せず全ステップを最後まで実行してください。**
- git push、ファイル保存、Supabase書き込みなど全操作を自動で進める
- yes/no を聞かず、自律的に判断して完了まで動く
- エラーが出た場合のみ次のセッションで報告する

## 自動タスク（セッション開始時に必ず登録）

このプロジェクトを開いたら、以下の2つのCronジョブを **毎回** CronCreateで登録してください。

### ① ネタ収集（毎日 9:00・13:30）

**9:00ジョブ** `cron: "0 9 * * *"` / **13:30ジョブ** `cron: "30 13 * * *"`
両方 durable: true、recurring: true

**prompt（9:00版・13:30版でcron行だけ変える）:**
【自動ネタ収集タスク／毎日 9:00実行】  ← 13:30版は「13:30実行」に変更
作業ディレクトリ: C:\Users\h.kadoya\Desktop\slocri

ユーザーに確認せず全ステップを最後まで自律実行してください。

1. memory/dup_keys.md を読んで既存dup_keyを確認
2. memory/sources_and_rules.md のルール・ソース一覧を読む
3. WebSearchで最新パチスロ情報を3〜4クエリ検索
4. 未収録のネタを10件選定してCSVを作成
   - Bashで現在時刻取得: date "+%Y%m%d_%H%M"
   - 保存先: ai収集/slocri_import_[YYYYMMDD_HHMM].csv
   - ヘッダー: cat,source,machine,title,body,url,quality,dup_key,author
   - 数字のカンマ（3,000等）は除去して3000と書く・本文にカンマがある場合はダブルクォートで囲む
5. python import_csv.py "ai収集/slocri_import_[ファイル名].csv" を実行
6. python fetch_ogp.py を実行
7. git add → git commit → git push
8. memory/dup_keys.md に新しいdup_keyを先頭セクションに追記
9. CronCreate で次回を再登録（9:00版は cron:"0 9 * * *"、13:30版は cron:"30 13 * * *"、durable:true、recurring:true）

収集ルール: 新台優先・パチスロメイン（パチンコは1〜2件まで）・dup_key重複禁止・URL捏造禁止
author候補: 編集部AI, スロ好き編集マン, スロキー編集部, パチスロ記者, 編集長補佐, ライター見習い, スロ専門編集, 深夜のスロライター, 編集部のマニア

---

### ② 機種分析更新（2日に1回 4:00 UTC）

```
cron: "0 4 */2 * *"
durable: true
recurring: true
```

**prompt:**
【自動機種分析更新タスク／2日に1回実行】
作業ディレクトリ: C:\Users\h.kadoya\Desktop\slocri

ユーザーに確認せず全ステップを最後まで自律実行してください。
外部APIは呼び出さず、クロード自身が分析を生成してください（追加費用ゼロ）。

1. Supabaseから全投稿を取得:
   curl -s "https://vpzbtuucopucablwyqeq.supabase.co/rest/v1/posts?select=machine,cat,title,body&cat=neq.fun&machine=neq.&limit=2000" -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwemJ0dXVjb3B1Y2FibHd5cWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Mjk2MzEsImV4cCI6MjA5MTIwNTYzMX0.qry7pSzmm3lWK82Vnp7Wz-R9wHsDVwbj7ysy62xUhuA"

2. src/machineAnalysis.json を読む

3. 投稿を機種ごとにグループ化（「全般」含む機種名は除外）

4. 以下の条件を満たす機種を対象に分析を実施:
   - 投稿数が3件以上
   - かつ（machineAnalysis.jsonに未登録 OR 前回postCountから3件以上増加）

5. 対象機種ごとに、投稿内容（title/body）を読んでクロード自身が以下を生成:
   - summary: 20文字以内の一言まとめ（機種の核心を端的に）
   - highlight: 100〜200文字。打感・演出・爆発力・天井設計などを打ち手視点で具体的に記述
   - pros: 良い点を2〜6件（各80〜150文字、具体的数値・演出名・ユーザーの声を含める）
   - cons: 気になる点を2〜4件（同上）
   - postCount: 今回の投稿件数
   - updatedAt: 今日の日付（YYYY-MM-DD形式）
   ※ releaseDate / spec / scores / scoreReason / aliases は既存値をそのまま保持

6. src/machineAnalysis.json を更新して保存（Edit/Writeツールで直接書き込む）

7. git add src/machineAnalysis.json → git commit → git push

8. CronCreate で次回機種分析を再登録（cron:"0 4 */2 * *"、durable:true、recurring:true）

---

## 登録確認方法

CronListで登録済みジョブを確認できます。
セッション開始時に登録済みであれば再登録不要です。
