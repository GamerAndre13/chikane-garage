-- ============================================================
-- CHIKANE GARAGE — 004: Definições do site editáveis no backoffice
-- Acrescenta colunas novas ao site_settings (redes sociais + tagline
-- do rodapé), grants e política de INSERT para admins.
-- Executa no SQL Editor do Supabase. Idempotente (pode correr 2×).
-- ============================================================

-- 1. Colunas novas
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS social_youtube TEXT DEFAULT '';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS social_tiktok TEXT DEFAULT '';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS footer_tagline TEXT DEFAULT '';

-- 2. Permissões explícitas para a sessão do admin (defensivo)
GRANT SELECT, UPDATE, INSERT ON public.site_settings TO authenticated;

-- 3. Apenas admins podem inserir (idempotente)
DO $$ BEGIN
  DROP POLICY IF EXISTS "site_settings_insert_admin" ON public.site_settings;
END $$;
CREATE POLICY "site_settings_insert_admin" ON public.site_settings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 4. Garante que existe pelo menos uma linha para o formulário editar
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.site_settings) THEN
    INSERT INTO public.site_settings (phone, email, address, location)
    VALUES ('', '', '', '');
  END IF;
END $$;

SELECT '✅ site_settings pronto para o backoffice.' AS resultado;
