-- PDF生成アーカイブ機能の追加
-- Supabase SQL Editor で実行してください
-- 加えて、Storage に proposal_pdfs バケットを手動作成する必要があります(下記参照)

-- pdf_url: 生成済みPDFのSupabase Storage上のpublic URL
ALTER TABLE proposal_requests
  ADD COLUMN IF NOT EXISTS pdf_url text;

-- 一覧クエリでpdf_urlあり/なしを高速判定する用
CREATE INDEX IF NOT EXISTS idx_proposal_requests_pdf_url ON proposal_requests((pdf_url IS NOT NULL));

-- ===========================================
-- Storage バケット作成手順 (SQL Editorではなく Storage 画面で)
-- 1. https://supabase.com/dashboard/project/vpzbtuucopucablwyqeq/storage/buckets を開く
-- 2. New bucket → 名前: proposal_pdfs / Public bucket: ✅ チェック / Create
-- 3. Storage Policies を以下で追加(SQL Editor で実行):
-- ===========================================

-- 公開バケットなら誰でも読める(必須)
-- 書き込みはanonからも可能(社内ツール前提)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('proposal_pdfs', 'proposal_pdfs', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

-- ファイルアップロードを anon に許可
DROP POLICY IF EXISTS "anyone can upload proposal_pdfs" ON storage.objects;
CREATE POLICY "anyone can upload proposal_pdfs"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'proposal_pdfs');

-- 読み取りを anon に許可 (publicバケットだけど明示的に)
DROP POLICY IF EXISTS "anyone can read proposal_pdfs" ON storage.objects;
CREATE POLICY "anyone can read proposal_pdfs"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'proposal_pdfs');
