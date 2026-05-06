create table if not exists collection_requests (
  id uuid primary key default gen_random_uuid(),
  theme text default '',
  status text default 'pending',   -- pending / processing / done / error
  result_count int default 0,
  result_machines text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table collection_requests enable row level security;
create policy "anyone can insert collection" on collection_requests for insert with check (true);
create policy "anyone can read collection"  on collection_requests for select using (true);
create policy "anyone can update collection" on collection_requests for update using (true);
