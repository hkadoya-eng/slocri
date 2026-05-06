-- Supabase SQL Editor に貼り付けて実行してください

CREATE TABLE IF NOT EXISTS sis_data (
  id            bigserial PRIMARY KEY,
  machine       text        NOT NULL,
  date          date        NOT NULL,
  out_coins     integer,
  coin_price    numeric(6,2),
  payout_rate   numeric(5,2),
  gross_profit  integer,
  operation_ratio numeric(5,2),
  machine_count integer,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(machine, date)
);

-- RLS 有効化
ALTER TABLE sis_data ENABLE ROW LEVEL SECURITY;

-- 読み取り: anon（フロントエンド）から SELECT のみ許可
CREATE POLICY "sis_select" ON sis_data
  FOR SELECT TO anon USING (true);

-- 書き込み: service_role のみ（import_sis.py 専用）
CREATE POLICY "sis_insert" ON sis_data
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "sis_update" ON sis_data
  FOR UPDATE TO service_role USING (true);
