-- ゲーム性企画提案リクエストテーブル
create table if not exists proposal_requests (
  id uuid primary key default gen_random_uuid(),
  ip_name text not null,
  target text default '',
  concept_memo text default '',
  status text default 'pending',   -- pending / processing / done / error
  result text default '',
  requester_name text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS: 誰でも読み書き可能（内部ツール前提）
alter table proposal_requests enable row level security;
create policy "anyone can insert proposal" on proposal_requests for insert with check (true);
create policy "anyone can read proposal"  on proposal_requests for select using (true);
create policy "anyone can update proposal" on proposal_requests for update using (true);
