-- Supabase SQL Editor で実行してください

CREATE TABLE IF NOT EXISTS sis_machine_stats (
  machine       text PRIMARY KEY,
  contrib_weeks integer,
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE sis_machine_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sis_machine_stats_select" ON sis_machine_stats
  FOR SELECT TO anon USING (true);

CREATE POLICY "sis_machine_stats_insert" ON sis_machine_stats
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "sis_machine_stats_update" ON sis_machine_stats
  FOR UPDATE TO anon USING (true);
