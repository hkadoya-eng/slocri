-- ============================================================
-- スロクリ RLS 案1 ロールバック  2026-05-28
-- もし enable 実行後にサイトor自動処理が壊れたら、これを全部貼って Run。
-- public 全テーブルの RLS を無効化して即・現状復帰する（＝RLS導入前の状態）。
-- ポリシー定義は残るが、RLS無効中は一切効かないので無害。
-- ============================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END $$;
