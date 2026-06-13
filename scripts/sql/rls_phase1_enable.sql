-- ============================================================
-- スロクリ RLS 案1（現状維持 ＋ 匿名DELETE封じ）  2026-05-28
-- Supabase SQL Editor に「全部」貼って Run。再実行しても安全（冪等）。
-- 効果: Security Advisorの赤い「RLS無効」警告が消える／「RLSを有効化」地雷ボタンが消える
--       匿名(anon)の一括削除を封じる（posts と push_subscriptions は本人操作のため除外）
-- 壊れない理由: 既存の SELECT/INSERT/UPDATE は anon に全許可のまま維持。自動処理(cron)も無傷。
-- 元に戻したい時: rls_phase1_rollback.sql を実行（RLSを全無効化＝即現状復帰）
-- ============================================================

-- 手順1: public スキーマの全テーブルで RLS を有効化
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END $$;

-- 手順2: 全テーブルに「現状維持」ポリシーを付与
--   SELECT / INSERT / UPDATE は anon・authenticated に許可（今の動作そのまま）
--   DELETE は authenticated（ログイン管理者）のみ ＝ 匿名の一括削除を封じる
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS slocri_select ON public.%I;', r.tablename);
    EXECUTE format('CREATE POLICY slocri_select ON public.%I FOR SELECT TO anon, authenticated USING (true);', r.tablename);

    EXECUTE format('DROP POLICY IF EXISTS slocri_insert ON public.%I;', r.tablename);
    EXECUTE format('CREATE POLICY slocri_insert ON public.%I FOR INSERT TO anon, authenticated WITH CHECK (true);', r.tablename);

    EXECUTE format('DROP POLICY IF EXISTS slocri_update ON public.%I;', r.tablename);
    EXECUTE format('CREATE POLICY slocri_update ON public.%I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);', r.tablename);

    EXECUTE format('DROP POLICY IF EXISTS slocri_delete ON public.%I;', r.tablename);
    EXECUTE format('CREATE POLICY slocri_delete ON public.%I FOR DELETE TO authenticated USING (true);', r.tablename);
  END LOOP;
END $$;

-- 手順3: 例外 ― 匿名でも DELETE が必要なテーブルだけ anon DELETE を戻す
--   posts            : ユーザーが自分の投稿を削除する
--   push_subscriptions: 通知購読の解除（アンサブスクライブ）
DROP POLICY IF EXISTS slocri_delete_anon ON public.posts;
CREATE POLICY slocri_delete_anon ON public.posts FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS slocri_delete_anon ON public.push_subscriptions;
CREATE POLICY slocri_delete_anon ON public.push_subscriptions FOR DELETE TO anon USING (true);

-- 確認用（任意）: RLS有効状態とポリシー数を見る
-- SELECT relname, relrowsecurity FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r' ORDER BY relname;
