# sql/ — Supabaseテーブル初期化SQL

このフォルダはSupabaseの**テーブル定義（DDL）アーカイブ**です。
日常のサイト運用では参照されません。

## 使い方

DBを再構築する場合、または新しいテーブルを追加した場合に
[Supabase SQL Editor](https://app.supabase.com/) に貼り付けて実行します。

## ファイル一覧

| ファイル | 用途 |
| --- | --- |
| `chat_messages_setup.sql` | チャット履歴テーブル |
| `collection_requests_setup.sql` | ネタ収集リクエストテーブル |
| `proposal_requests_setup.sql` | 企画提案リクエストテーブル |
| `proposal_requests_alter.sql` | 上記のALTER（マイグレーション履歴） |
| `sis_data.sql` | SIS日次データテーブル |
| `sis_machine_stats.sql` | SIS週次貢献テーブル |
| `supabase_push_setup.sql` | 投稿テーブル |

## データの流れ

実際の稼働データは別ルートで入ります：

```
Z:\01_SISデータ\PS\*.xlsm  (Googleドライブ・本物のデータ)
        ↓ 平日10/11/12時 タスクスケジューラ
scripts/import/import_sis.py
        ↓
Supabase sis_data テーブル
        ↓ scripts/build/build_sis_library.py
src/sisLibrary.json  (フロントが読む)
```
