-- ============================================================
-- MIGRAÇÃO 026: PERMISSÕES DE LEITURA PARA VISITANTES (anon)
-- ============================================================
-- Depois de a base de dados ser recriada com o supabase/setup.sql, o
-- site ficou a devolver o catálogo VAZIO (nenhuma viatura) e o
-- configurador de /comprar/<slug> sem extras.
--
-- Causa: as políticas de leitura pública usam sempre
--   EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
-- mas o setup.sql nunca deu SELECT da tabela public.profiles ao papel
-- anon. Sem essa permissão o Postgres recusa a consulta inteira com
-- "permission denied for table profiles" — por isso vehicles,
-- vehicle_extra_catalog, vehicle_extras, etc. devolvem erro e o site
-- mostra listas vazias.
--
-- Aqui só se concedem as colunas que as políticas precisam (id e role).
-- Email, nome, telefone e restantes dados pessoais continuam fechados
-- ao papel anon.
--
-- Idempotente: pode ser re-executado sem efeitos secundários.
-- ============================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- ------------------------------------------------------------
-- 1. O que faltava: leitura mínima de profiles para as políticas
-- ------------------------------------------------------------
GRANT SELECT (id, role) ON public.profiles TO anon;

-- ------------------------------------------------------------
-- 2. Leituras públicas do site (viaturas, extras, CMS)
-- ------------------------------------------------------------
GRANT SELECT ON public.vehicles TO anon;
GRANT SELECT ON public.vehicle_features TO anon;
GRANT SELECT ON public.vehicle_images TO anon;
GRANT SELECT ON public.site_content TO anon;
GRANT SELECT ON public.site_settings TO anon;

DO $$ BEGIN
  IF to_regclass('public.vehicle_extra_catalog') IS NOT NULL THEN
    GRANT SELECT ON public.vehicle_extra_catalog TO anon;
  END IF;
  IF to_regclass('public.vehicle_extra_variants') IS NOT NULL THEN
    GRANT SELECT ON public.vehicle_extra_variants TO anon;
  END IF;
  IF to_regclass('public.vehicle_extras') IS NOT NULL THEN
    GRANT SELECT ON public.vehicle_extras TO anon;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 3. Formulários públicos (só INSERT, nada de leitura)
-- ------------------------------------------------------------
GRANT INSERT ON public.contact_requests TO anon;
GRANT INSERT ON public.test_drives TO anon;
GRANT INSERT ON public.reservations TO anon;
GRANT INSERT ON public.newsletter_subscribers TO anon;

DO $$ BEGIN
  IF to_regclass('public.sale_proposals') IS NOT NULL THEN
    GRANT INSERT ON public.sale_proposals TO anon, authenticated;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 4. Utilizadores com sessão (backoffice e conta)
-- ------------------------------------------------------------
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- ------------------------------------------------------------
-- 5. Recarregar o esquema
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

SELECT '✅ MIGRAÇÃO 026 CONCLUÍDA - leituras públicas restabelecidas' AS resultado;
