-- ヒアリング機能のカラムを追加
alter table proposal_requests
  add column if not exists questions text default '',
  add column if not exists answers   text default '';
