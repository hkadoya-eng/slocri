-- 1. プッシュ購読テーブル
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_name text,
  created_at timestamptz default now()
);

-- 2. 通知設定テーブル（管理者が制御）
create table if not exists notification_settings (
  id int primary key default 1,
  enabled boolean default true,
  maintenance_message text default '',
  updated_at timestamptz default now()
);

-- 初期レコード挿入
insert into notification_settings (id, enabled, maintenance_message)
values (1, true, '')
on conflict (id) do nothing;

-- RLS: 誰でも購読を登録・削除できる
alter table push_subscriptions enable row level security;
create policy "anyone can insert subscription" on push_subscriptions for insert with check (true);
create policy "anyone can delete own subscription" on push_subscriptions for delete using (true);

-- notification_settings は読み取り可能
alter table notification_settings enable row level security;
create policy "anyone can read settings" on notification_settings for select using (true);
create policy "anyone can update settings" on notification_settings for update using (true);
