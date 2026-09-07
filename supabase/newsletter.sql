-- ============================================================
-- CHIKANE GARAGE — Newsletter
-- Executa no SQL Editor do Supabase (é a única forma: DDL via anon é bloqueado)
-- Cria a tabela de subscrições e a RLS.
-- ============================================================

-- TABELA
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT DEFAULT '',
  source TEXT DEFAULT 'home',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "newsletter_select_admin" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "newsletter_insert_anon" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "newsletter_update_admin" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "newsletter_delete_admin" ON public.newsletter_subscribers;

-- Lectura de emails: apenas admin (evita scraping anon)
CREATE POLICY "newsletter_select_admin" ON public.newsletter_subscribers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Inserção pública (formulário do site)
CREATE POLICY "newsletter_insert_anon" ON public.newsletter_subscribers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "newsletter_update_admin" ON public.newsletter_subscribers
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "newsletter_delete_admin" ON public.newsletter_subscribers
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- PERMISSÕES
GRANT SELECT, UPDATE, DELETE ON public.newsletter_subscribers TO authenticated;
GRANT INSERT ON public.newsletter_subscribers TO anon;

SELECT '✅ NEWSLETTER CONFIGURADO!' AS resultado;