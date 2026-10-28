-- ============================================================
-- MIGRAÇÃO 021: VIATURAS NOVAS, PROPOSTAS E EMAILS PARA PROPOSTAS
-- ============================================================
-- Adicionar suporte a viaturas novas (sale_type) e sistema de propostas
-- para configuração com extras. Tudo idempotente.
-- ============================================================

-- ------------------------------------------------------------
-- 1. ADICIONAR sale_type A VEÍCULOS
-- ------------------------------------------------------------
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS sale_type TEXT DEFAULT 'used';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'vehicles' AND c.conname = 'vehicles_sale_type_check'
  ) THEN
    ALTER TABLE public.vehicles
      ADD CONSTRAINT vehicles_sale_type_check
      CHECK (sale_type IN ('used','new'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_vehicles_sale_type ON public.vehicles(sale_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_sale_type_status ON public.vehicles(sale_type, status);

-- ------------------------------------------------------------
-- 2. ADICIONAR CAMPOS A SITE_SETTINGS PARA PROPOSTAS
-- ------------------------------------------------------------
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS proposal_notify_emails TEXT DEFAULT '';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS proposal_auto_send_list BOOLEAN DEFAULT false;

-- ------------------------------------------------------------
-- 3. CRIAR TABELA DE PROPOSTAS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sale_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  nif TEXT NOT NULL,
  base_price NUMERIC(12,2),
  extras_total NUMERIC(12,2) DEFAULT 0,
  total_price NUMERIC(12,2),
  selected_extras JSONB DEFAULT '[]'::jsonb,
  message TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','contacted','in_progress','closed_won','closed_lost')),
  admin_notes TEXT DEFAULT '',
  source TEXT DEFAULT 'website',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sale_proposals_status_created_at ON public.sale_proposals(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sale_proposals_vehicle_id ON public.sale_proposals(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_sale_proposals_email ON public.sale_proposals(email);

-- ------------------------------------------------------------
-- 4. TRIGGER updated_at PARA sale_proposals
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_sale_proposals_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_sale_proposals_timestamp ON public.sale_proposals;
CREATE TRIGGER trigger_update_sale_proposals_timestamp
  BEFORE UPDATE ON public.sale_proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_sale_proposals_timestamp();

-- ------------------------------------------------------------
-- 5. RLS E POLÍTICAS
-- ------------------------------------------------------------
ALTER TABLE public.sale_proposals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "sale_proposals_insert_anon" ON public.sale_proposals;
  DROP POLICY IF EXISTS "sale_proposals_insert_all" ON public.sale_proposals;
  DROP POLICY IF EXISTS "sale_proposals_select_admin" ON public.sale_proposals;
  DROP POLICY IF EXISTS "sale_proposals_update_admin" ON public.sale_proposals;
  DROP POLICY IF EXISTS "sale_proposals_select_own" ON public.sale_proposals;
END $$;

CREATE POLICY "sale_proposals_insert_anon" ON public.sale_proposals FOR INSERT WITH CHECK (true);
CREATE POLICY "sale_proposals_select_admin" ON public.sale_proposals FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "sale_proposals_select_own" ON public.sale_proposals FOR SELECT USING (
  auth.uid() = user_id
  OR lower(email) = lower(auth.jwt() ->> 'email')
);
CREATE POLICY "sale_proposals_update_admin" ON public.sale_proposals FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ------------------------------------------------------------
-- 6. PERMISSÕES
-- ------------------------------------------------------------
GRANT INSERT ON public.sale_proposals TO anon, authenticated;
GRANT SELECT, UPDATE ON public.sale_proposals TO authenticated;

-- ------------------------------------------------------------
-- 7. LISTA DE EMAILS DA NEWSLETTER PARA CÓPIA DAS PROPOSTAS
-- ------------------------------------------------------------
-- Devolve apenas os emails ativos. Executável só pelo service_role (usado
-- exclusivamente pela rota /api/proposals/notify para a cópia opcional).
CREATE OR REPLACE FUNCTION public.proposal_newsletter_emails()
RETURNS TABLE (email TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT n.email
  FROM public.newsletter_subscribers n
  WHERE n.status = 'active'
    AND n.email <> '';
$$;

REVOKE ALL ON FUNCTION public.proposal_newsletter_emails() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.proposal_newsletter_emails() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.proposal_newsletter_emails() TO service_role;

NOTIFY pgrst, 'reload schema';

SELECT '✅ MIGRAÇÃO 021 CONCLUÍDA - sale_type, sale_proposals e definições adicionados' AS resultado;
