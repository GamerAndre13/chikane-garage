-- ============================================================
-- MIGRATION: Adicionar catálogo de extras para viaturas novas por encomenda
-- ============================================================
-- Executar no SQL Editor do Supabase
-- ============================================================

-- Criar tabela do catálogo de extras
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

-- Criar tabela dos extras aplicados às viaturas
CREATE TABLE IF NOT EXISTS public.vehicle_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  catalog_extra_id UUID REFERENCES public.vehicle_extra_catalog(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_vehicle_extra_catalog_active_pos ON public.vehicle_extra_catalog(is_active, position);
CREATE INDEX IF NOT EXISTS idx_vehicle_extras_vehicle ON public.vehicle_extras(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_extras_catalog ON public.vehicle_extras(catalog_extra_id);

-- Trigger updated_at
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

-- RLS
ALTER TABLE public.vehicle_extra_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_extras ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "vehicle_extra_catalog_select_public" ON public.vehicle_extra_catalog;
DROP POLICY IF EXISTS "vehicle_extra_catalog_manage_admin" ON public.vehicle_extra_catalog;
DROP POLICY IF EXISTS "vehicle_extras_select_public" ON public.vehicle_extras;
DROP POLICY IF EXISTS "vehicle_extras_manage_admin" ON public.vehicle_extras;

CREATE POLICY "vehicle_extra_catalog_select_public" ON public.vehicle_extra_catalog FOR SELECT USING (is_active = true OR public.is_admin(auth.uid()));
CREATE POLICY "vehicle_extra_catalog_manage_admin" ON public.vehicle_extra_catalog FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "vehicle_extras_select_public" ON public.vehicle_extras FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND (public.is_admin(auth.uid()) OR v.status IN ('available','reserved') OR (v.status = 'sold' AND v.sold_at IS NOT NULL AND v.sold_at >= NOW() - INTERVAL '7 days')))
);
CREATE POLICY "vehicle_extras_manage_admin" ON public.vehicle_extras FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Grants
GRANT SELECT ON public.vehicle_extra_catalog TO anon, authenticated;
GRANT SELECT ON public.vehicle_extras TO anon, authenticated;
GRANT ALL ON public.vehicle_extra_catalog, public.vehicle_extras TO authenticated, service_role;

-- Recarregar schema
NOTIFY pgrst, 'reload schema';

SELECT 'Migração concluída: tabelas vehicle_extra_catalog e vehicle_extras criadas' AS resultado;
