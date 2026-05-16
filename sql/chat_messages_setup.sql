create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  role text not null,        -- 'user' or 'assistant'
  content text not null,
  created_at timestamptz default now()
);

alter table chat_messages enable row level security;
create policy "anyone can insert chat"  on chat_messages for insert with check (true);
create policy "anyone can read chat"    on chat_messages for select using (true);
