-- ============================================================
-- MIGRAÇÃO 022: CATÁLOGO DE EXTRAS E VARIANTES (VIATURAS NOVAS)
-- ============================================================
-- Extras opcionais configuráveis nas viaturas novas, com variantes
-- (ex.: jantes 19" vs 20"). Idempotente: pode ser re-executado.
-- ============================================================

-- ------------------------------------------------------------
-- 1. CATÁLOGO DE EXTRAS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicle_extra_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  position INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2. VARIANTES DE CADA EXTRA
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicle_extra_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extra_id UUID NOT NULL REFERENCES public.vehicle_extra_catalog(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  position INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 3. EXTRAS ASSOCIADOS A CADA VIATURA
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicle_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  catalog_extra_id UUID REFERENCES public.vehicle_extra_catalog(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.vehicle_extra_variants(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  variant_name TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 4. ÍNDICES
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_vehicle_extra_catalog_active_pos
  ON public.vehicle_extra_catalog(is_active, position);
CREATE INDEX IF NOT EXISTS idx_vehicle_extra_variants_extra
  ON public.vehicle_extra_variants(extra_id, position);
CREATE INDEX IF NOT EXISTS idx_vehicle_extras_vehicle
  ON public.vehicle_extras(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_extras_catalog
  ON public.vehicle_extras(catalog_extra_id);

-- ------------------------------------------------------------
-- 5. TRIGGER updated_at DO CATÁLOGO
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_vehicle_extra_catalog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_vehicle_extra_catalog_updated_at ON public.vehicle_extra_catalog;
CREATE TRIGGER set_vehicle_extra_catalog_updated_at
  BEFORE UPDATE ON public.vehicle_extra_catalog
  FOR EACH ROW EXECUTE FUNCTION public.handle_vehicle_extra_catalog_updated_at();

-- ------------------------------------------------------------
-- 6. RLS E POLÍTICAS
-- ------------------------------------------------------------
ALTER TABLE public.vehicle_extra_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_extra_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_extras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicle_extra_catalog_select_public" ON public.vehicle_extra_catalog;
DROP POLICY IF EXISTS "vehicle_extra_catalog_manage_admin" ON public.vehicle_extra_catalog;
DROP POLICY IF EXISTS "vehicle_extra_variants_select_public" ON public.vehicle_extra_variants;
DROP POLICY IF EXISTS "vehicle_extra_variants_manage_admin" ON public.vehicle_extra_variants;
DROP POLICY IF EXISTS "vehicle_extras_select_public" ON public.vehicle_extras;
DROP POLICY IF EXISTS "vehicle_extras_manage_admin" ON public.vehicle_extras;

CREATE POLICY "vehicle_extra_catalog_select_public" ON public.vehicle_extra_catalog
  FOR SELECT USING (
    is_active = true
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "vehicle_extra_catalog_manage_admin" ON public.vehicle_extra_catalog
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "vehicle_extra_variants_select_public" ON public.vehicle_extra_variants
  FOR SELECT USING (
    is_active = true
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "vehicle_extra_variants_manage_admin" ON public.vehicle_extra_variants
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "vehicle_extras_select_public" ON public.vehicle_extras
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.id = vehicle_id
        AND (
          EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
          OR v.status IN ('available', 'reserved')
          OR (v.status = 'sold' AND v.sold_at IS NOT NULL AND v.sold_at >= NOW() - INTERVAL '7 days')
        )
    )
  );
CREATE POLICY "vehicle_extras_manage_admin" ON public.vehicle_extras
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ------------------------------------------------------------
-- 7. PERMISSÕES
-- ------------------------------------------------------------
GRANT SELECT ON public.vehicle_extra_catalog TO anon, authenticated;
GRANT SELECT ON public.vehicle_extra_variants TO anon, authenticated;
GRANT SELECT ON public.vehicle_extras TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.vehicle_extra_catalog TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.vehicle_extra_variants TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.vehicle_extras TO authenticated;

NOTIFY pgrst, 'reload schema';

SELECT '✅ MIGRAÇÃO 022 CONCLUÍDA - catálogo de extras, variantes e extras por viatura' AS resultado;
