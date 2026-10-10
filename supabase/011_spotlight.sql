-- ============================================================
-- CHIKANE GARAGE — 011: Destaque da semana (spotlight)
-- - Coluna vehicles.spotlight (apenas UMA viatura pode ter true)
-- - RPC admin_set_spotlight: marca uma viatura como destaque e
--   limpa as outras (ou limpa tudo se p_vehicle_id = NULL)
-- Executa no SQL Editor do Supabase. Idempotente.
-- ============================================================

ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS spotlight BOOLEAN NOT NULL DEFAULT false;

-- Garante que só pode existir UMA viatura com spotlight = true
DROP INDEX IF EXISTS vehicles_single_spotlight;
CREATE UNIQUE INDEX vehicles_single_spotlight ON public.vehicles ((spotlight)) WHERE spotlight = true;

-- RPC para marcar/limpar o destaque da semana (apenas admins)
-- UPDATE com WHERE (obrigatório no Supabase) e num único statement.
CREATE OR REPLACE FUNCTION public.admin_set_spotlight(p_vehicle_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  -- p_vehicle_id NULL limpa tudo; caso contrário marca só essa viatura
  UPDATE public.vehicles
  SET spotlight = (id = p_vehicle_id)
  WHERE id IS NOT NULL;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_spotlight(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_spotlight(UUID) TO authenticated;