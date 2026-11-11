-- ============================================================
-- MIGRAÇÃO 027: CAMPANHAS
-- ============================================================
-- Página pública /campanhas e gestão em /admin/campanhas, com
-- destaque na home. Cada campanha pode apontar para uma viatura
-- do catálogo ou para um URL próprio (cta_url).
--
-- Idempotente: pode ser re-executado sem efeitos secundários.
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABELA
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT DEFAULT '',
  description TEXT DEFAULT '',
  badge TEXT DEFAULT '',
  image_url TEXT,
  price_from NUMERIC(12,2),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  cta_label TEXT DEFAULT 'Ver campanha',
  cta_url TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Slug único (a página pública pode ser /campanhas#slug).
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaigns_slug ON public.campaigns(slug);

-- Leitura pública ordenada por posição.
CREATE INDEX IF NOT EXISTS idx_campaigns_active_position
  ON public.campaigns(is_active, position);

-- ------------------------------------------------------------
-- 2. TRIGGER updated_at
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER set_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.handle_campaigns_updated_at();

-- ------------------------------------------------------------
-- 3. RLS E POLÍTICAS
-- ------------------------------------------------------------
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaigns_select_public" ON public.campaigns;
DROP POLICY IF EXISTS "campaigns_manage_admin" ON public.campaigns;

-- Público: campanhas ativas e dentro da janela de datas (quando definidas).
CREATE POLICY "campaigns_select_public" ON public.campaigns
  FOR SELECT USING (
    (
      is_active = true
      AND (starts_at IS NULL OR starts_at <= NOW())
      AND (ends_at IS NULL OR ends_at >= NOW())
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "campaigns_manage_admin" ON public.campaigns
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ------------------------------------------------------------
-- 4. PERMISSÕES
-- ------------------------------------------------------------
GRANT SELECT ON public.campaigns TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;

-- ------------------------------------------------------------
-- 5. RECARREGAR O ESQUEMA
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

SELECT '✅ MIGRAÇÃO 027 CONCLUÍDA - campanhas criadas' AS resultado;
