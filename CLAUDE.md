# スロクリ プロジェクト設定

## ⚠️ セッション開始時の必須動作（最優先・ユーザー返答より先に実行）

このCLAUDE.mdを読み込んだ**最初のユーザーメッセージ受信時**、ユーザーへの応答より先に必ず：

1. `CronList` を実行して現在のcron状態を確認
2. 以下の7本が登録されていなければ即 `CronCreate` で全部登録（後述の各タスクの仕様通り）
   - ネタ収集 9:00 (`0 9 * * *`)
   - ネタ収集 13:30 (`30 13 * * *`)
   - 機種分析更新 (`0 4 */2 * *`)
   - チャット返答 10分 (`*/10 * * * *` / one-shot自己再登録)
   - 管理者チャット 10分 (`*/10 * * * *` / one-shot自己再登録)
   - 企画・ゲーム性提案処理 10分 (`*/10 * * * *` / one-shot自己再登録)
   - 収集要望処理 30分 (`17,47 * * * *` / one-shot自己再登録)
3. **1行で**「✅ cron N本登録済み」と報告してから、ユーザー要件に応える

理由: Claude Code のcronは現状 session-only（`durable:true` が効かない仕様）。VS Code/PC再起動のたびに全消滅するため、毎セッション必ず再登録しないと自動収集・チャット返答が止まる。**ユーザーが「動いてない？」と聞くまで気づかれない事故**を防止する。

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

0. **ユーザーフィードバック取得（必須・スキップ禁止）**:
   curl -s "https://vpzbtuucopucablwyqeq.supabase.co/rest/v1/posts?select=machine,cat,title,internal&limit=2000" -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwemJ0dXVjb3B1Y2FibHd5cWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Mjk2MzEsImV4cCI6MjA5MTIwNTYzMX0.qry7pSzmm3lWK82Vnp7Wz-R9wHsDVwbj7ysy62xUhuA"
   - bad数1以上 → 機種・カテゴリ・タイトルを【除外パターン】として認識し、類似ネタは選ばない
   - like数2以上 → 機種・カテゴリ・タイトルを【重視パターン】として認識し、類似・周辺ネタを優先
   - comment1以上 → ユーザー反応ありの話題として優先候補
1. memory/dup_keys.md を読んで既存dup_keyを確認
2. memory/sources_and_rules.md のルール・ソース一覧を読む
3. WebSearchで最新パチスロ情報を3〜4クエリ検索（手順0の重視/除外パターンを意識する）
4. 未収録のネタを10件選定してCSVを作成（手順0の除外パターンに該当するものは絶対に入れない・重視パターンの周辺ネタを優先）
   - Bashで現在時刻取得: date "+%Y%m%d_%H%M"
   - 保存先: ai収集/slocri_import_[YYYYMMDD_HHMM].csv
   - ヘッダー: cat,source,machine,title,body,url,quality,dup_key,author
   - 数字のカンマ（3,000等）は除去して3000と書く・本文にカンマがある場合はダブルクォートで囲む
5. python scripts/import/import_csv.py "ai収集/slocri_import_[ファイル名].csv" を実行
6. python scripts/misc/fetch_ogp.py を実行
7. git add → git commit → git push
8. memory/dup_keys.md に新しいdup_keyを先頭セクションに追記
9. CronCreate で次回を再登録（9:00版は cron:"0 9 * * *"、13:30版は cron:"30 13 * * *"、durable:true、recurring:true）

収集ルール: 新台優先・パチスロメイン（パチンコは1〜2件まで）・dup_key重複禁止・URL捏造禁止・**フィードバック手順0必須**
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

### ③ チャット返答（適応型・one-shot）

**頻度**: 平常10分 → 作業発生時2分 → 空振りで10分に自動復帰

```
cron: "*/10 * * * *"
durable: true
recurring: false  ← one-shot。末尾でCronCreateにより自己再登録する
```

**prompt:**
【チャット返答】作業Dir: C:\Users\h.kadoya\Desktop\slocri / 自律実行・テキスト出力なし
⚠️ このプロンプトへの応答はテキストを一切出力しないこと。「0件」「再登録しました」等の確認メッセージも禁止。ツール呼び出しのみで処理を完結すること。
ANON=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwemJ0dXVjb3B1Y2FibHd5cWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Mjk2MzEsImV4cCI6MjA5MTIwNTYzMX0.qry7pSzmm3lWK82Vnp7Wz-R9wHsDVwbj7ysy62xUhuA
BASE=https://vpzbtuucopucablwyqeq.supabase.co/rest/v1

①chat_messages(admin_以外)で最新role=userのsessionを抽出
②0件→CronCreate(durable:true,recurring:false,cron:"*/10 * * * *")で同プロンプトを再登録して終了
③件数あり→全履歴取得→各session処理:
 ・assistant0件: 機種/トピックに触れた挨拶(2〜3文)をPOST
 ・assistant1件以上: machine名でDB検索(ilike)→2件以上ならDB根拠で300〜500字回答→1件以下ならWebSearch2〜3クエリ→回答をchat_messagesにPOST
④処理後→CronCreate(durable:true,recurring:false,cron:"*/2 * * * *")で同プロンプトを再登録

---

### ④ 管理者チャット処理（適応型・one-shot）

**頻度**: 平常10分 → 作業発生時2分 → 空振りで10分に自動復帰

```
cron: "*/10 * * * *"
durable: true
recurring: false  ← one-shot。末尾でCronCreateにより自己再登録する
```

**prompt:**
【管理者チャット】作業Dir: C:\Users\h.kadoya\Desktop\slocri / 自律実行・テキスト出力なし
⚠️ このプロンプトへの応答はテキストを一切出力しないこと。「0件」「再登録しました」等の確認メッセージも禁止。ツール呼び出しのみで処理を完結すること。
ANON=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwemJ0dXVjb3B1Y2FibHd5cWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Mjk2MzEsImV4cCI6MjA5MTIwNTYzMX0.qry7pSzmm3lWK82Vnp7Wz-R9wHsDVwbj7ysy62xUhuA
BASE=https://vpzbtuucopucablwyqeq.supabase.co/rest/v1

①admin_プレフィックスの未返答sessionを確認
②0件→CronCreate(durable:true,recurring:false,cron:"*/10 * * * *")で同プロンプトを再登録して終了
③あれば全履歴取得→最新userメッセを判定:
 ・「おねがい」「はい」「実行して」「やって」「お願い」含む→前のassistant提案を実際に実行→git push→完了をPOST
 ・変更依頼(「直して」「変えて」「追加して」等)→変更計画をPOSTして「実行しますか？」
 ・質問→会話コンテキストで回答をPOST
④処理後→CronCreate(durable:true,recurring:false,cron:"*/2 * * * *")で同プロンプトを再登録

---

### ⑤ 企画・ゲーム性提案処理（10分・one-shot）

**頻度**: 10分(`*/10 * * * *`)・ユーザーがインタラクティブに送信するため応答性重視

```
cron: "*/10 * * * *"
durable: true
recurring: false  ← one-shot。末尾でCronCreateにより自己再登録する
```

**prompt:**
【企画・ゲーム性提案処理】作業Dir: C:\Users\h.kadoya\Desktop\slocri / 自律実行・テキスト出力なし

①proposal_requests pending を target/questions/answers/revision_request の状態分岐で処理→各依頼を更新
②collection_requests pending のうち theme「【ゲーム性分析追加リクエスト】」「修正提案：」のみ処理→src/gameDesignLibrary.json更新→status=done
③git push・curl順次・Invalid API key リトライ・処理後 CronCreate で自己再登録

詳細処理ルールは下記「企画提案処理ルール（パートB）」「ゲーム性分析追加リクエストの処理ルール」を参照。

---

### ⑥ 収集要望処理（30分・one-shot）

**頻度**: 毎時 :17 と :47 (`17,47 * * * *`)・ユーザーへの「30分以内に反映」UIトースト約束を守る周期

```
cron: "17,47 * * * *"
durable: true
recurring: false  ← one-shot。末尾でCronCreateにより自己再登録する
```

**prompt:**
【収集要望処理】作業Dir: C:\Users\h.kadoya\Desktop\slocri / 自律実行・テキスト出力なし

①collection_requests pending のうち theme が「【ゲーム性分析追加リクエスト】」「修正提案：」**以外**（空・新台情報・名機エピソード・実戦・機種情報・業界ニュース・カテゴリ+自由文 など）を処理対象
②各依頼ごと: 手順0(posts.internal.bads/likes/comments取得・bad除外・like重視) → WebSearch 2-3クエリ → 該当テーマで未収録ネタ5件選定 → CSV作成 → import_csv.py → fetch_ogp.py → PATCH status=done,result_count=実件数
③git push・dup_keys.md追記・処理後 CronCreate で自己再登録

---

## 企画提案処理ルール（パートB）

proposal_requestsの処理分岐：

- **target === "機能単体"** かつ result が空 → ヒアリングなしで直接生成
  - concept_memo の内容を機能リクエストとして解釈
  - src/gameDesignLibrary.json・src/machineAnalysis.json を読んで根拠を付けながら設計提案書を生成
  - result にマークダウン形式で保存、status を done に更新
  - 修正依頼（revision_request あり）の場合も同様に再生成

- **target !== "機能単体"** かつ questions が空 → ヒアリング質問生成（5問程度）→ questions フィールドに保存、status は pending のまま

- **target !== "機能単体"** かつ questionsあり・answersあり・revision_request が空 → 初回提案書を生成 → result に保存、status を done に更新

- **revision_request あり** → 修正版を生成 → result を上書き、status を done に更新

---

## ゲーム性分析追加リクエストの処理ルール

収集・企画統合処理タスク（パートA）で `theme` が「【ゲーム性分析追加リクエスト】」で始まるリクエストを検出した場合、以下の手順で処理する：

1. themeから機種名またはゲームタイプを抽出
2. WebSearchで2〜3クエリ調査（ゲームフロー・仕組み・代表機種など）
3. `src/gameDesignLibrary.json` を読んで更新:
   - 機種追加の場合: `machines[機種名]` に description/highlight/czRules/atRules を追加し、該当 `gameFlowPatterns` の examples にも追加
   - 新タイプ追加の場合: `gameFlowPatterns` に新エントリを追加（description/rules/presentation/examples）
4. 調査できない・情報が不十分な場合: status=done, result_count=0 で完了（追加不要）
5. 更新した場合: `git add src/gameDesignLibrary.json → commit → push`
6. status を done に更新

---

## 登録確認方法

CronListで登録済みジョブを確認できます。
セッション開始時に登録済みであれば再登録不要です。

## 適応型Cronの動作ルール

チャット返答・管理者チャットは one-shot + 自己再登録方式：
- 平常時: 10分ポーリング
- 作業発生: 処理後2分ポーリングに切り替え
- 空振り時: 自動で10分に戻る
- **セッション再起動後は消えるため手動で再登録が必要**

---

## ⚠️ 期限付き対応タスク

### Supabase GRANTポリシー変更（期限: 2026-10-30）

**2026-10-30以降、既存テーブルもGRANT必須になる。対応しないとサイト全体が壊れる。**

10月に入ったら以下をSupabase SQL Editorで実行すること：
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
```

セッション開始時に月が10月以降であれば、ユーザーに対応を提案すること。
