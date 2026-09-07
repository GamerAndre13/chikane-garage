-- ============================================================
-- CHIKANE GARAGE — Migração: pedidos ligados ao user + bucket de fotos
-- Executa no SQL Editor do Supabase (já inclui o que está no newsletter.sql)
-- ============================================================

-- ============================================================
-- A) NEWSLETTER (se ainda não a criaste)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT DEFAULT '',
  source TEXT DEFAULT 'home',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "newsletter_select_admin" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "newsletter_insert_anon" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "newsletter_update_admin" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "newsletter_delete_admin" ON public.newsletter_subscribers;
CREATE POLICY "newsletter_select_admin" ON public.newsletter_subscribers FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "newsletter_insert_anon" ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "newsletter_update_admin" ON public.newsletter_subscribers FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "newsletter_delete_admin" ON public.newsletter_subscribers FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
GRANT SELECT, UPDATE, DELETE ON public.newsletter_subscribers TO authenticated;
GRANT INSERT ON public.newsletter_subscribers TO anon;

-- ============================================================
-- B) contact_requests: ligar ao utilizador
-- ============================================================
ALTER TABLE public.contact_requests ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- index para consultas rápidas por utilizador
CREATE INDEX IF NOT EXISTS idx_contact_requests_user ON public.contact_requests(user_id);

-- Cada utilizador vê os SEUS pedidos; admin vê todos
DROP POLICY IF EXISTS "contact_requests_select_admin" ON public.contact_requests;
DROP POLICY IF EXISTS "contact_requests_select_own_or_admin" ON public.contact_requests;
CREATE POLICY "contact_requests_select_own_or_admin" ON public.contact_requests
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Inserção pública, mas só como "próprio" (ou sem user): evita atribuir a outrem
DROP POLICY IF EXISTS "contact_requests_insert_anon" ON public.contact_requests;
DROP POLICY IF EXISTS "contact_requests_insert" ON public.contact_requests;
CREATE POLICY "contact_requests_insert" ON public.contact_requests
  FOR INSERT WITH CHECK (
    user_id IS NULL OR auth.uid() = user_id
  );

-- ============================================================
-- C) test_drives: cada utilizador vê os SEUS (já tinha user_id)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_test_drives_user ON public.test_drives(user_id);
DROP POLICY IF EXISTS "test_drives_select_admin" ON public.test_drives;
DROP POLICY IF EXISTS "test_drives_select_own_or_admin" ON public.test_drives;
CREATE POLICY "test_drives_select_own_or_admin" ON public.test_drives
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
DROP POLICY IF EXISTS "test_drives_insert_anon" ON public.test_drives;
DROP POLICY IF EXISTS "test_drives_insert" ON public.test_drives;
CREATE POLICY "test_drives_insert" ON public.test_drives
  FOR INSERT WITH CHECK (
    user_id IS NULL OR auth.uid() = user_id
  );

-- ============================================================
-- D) BUCKET de fotos das viaturas (upload do PC pelo admin)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-images', 'vehicle-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "vehicle-images public read" ON storage.objects;
DROP POLICY IF EXISTS "vehicle-images admin write" ON storage.objects;
DROP POLICY IF EXISTS "vehicle-images admin update" ON storage.objects;
DROP POLICY IF EXISTS "vehicle-images admin delete" ON storage.objects;

-- Leitura pública (o site mostra as fotos)
CREATE POLICY "vehicle-images public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'vehicle-images');

-- Escrita/remoção apenas admin
CREATE POLICY "vehicle-images admin write" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'vehicle-images'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "vehicle-images admin update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'vehicle-images'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "vehicle-images admin delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'vehicle-images'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- PERMISSÕES (complementos)
-- ============================================================
GRANT SELECT, UPDATE ON public.contact_requests TO authenticated;
GRANT SELECT ON public.contact_requests TO anon;
GRANT SELECT, UPDATE ON public.test_drives TO authenticated;

SELECT '✅ MIGRAÇÃO APLICADA!' AS resultado;