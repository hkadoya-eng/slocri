-- 投稿者識別と公開/非公開機能の追加
-- Supabase SQL Editor で実行してください

-- owner_id: フロントの localStorage に保存された UUID。投稿者識別に使う
ALTER TABLE proposal_requests
  ADD COLUMN IF NOT EXISTS owner_id text;

-- visibility: 'private'(本人のみ) または 'public'(全員)
ALTER TABLE proposal_requests
  ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private';

-- 既存データは「全員に見えていた状態」を維持したいので public に揃える
UPDATE proposal_requests
  SET visibility = 'public'
  WHERE visibility IS NULL;

-- 一覧クエリの高速化用 index（任意）
CREATE INDEX IF NOT EXISTS idx_proposal_requests_visibility ON proposal_requests(visibility);
CREATE INDEX IF NOT EXISTS idx_proposal_requests_owner_id ON proposal_requests(owner_id);
