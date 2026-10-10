-- ============================================================
-- CHIKANE GARAGE — 013: Eliminação de conta por RPC + garantias
-- - Garante a coluna profiles.deletion_requested_at
-- - Recria a policy profiles_update_own (por segurança)
-- - RPCs SECURITY DEFINER para o próprio utilizador pedir/cancelar
--   a eliminação (contorna RLS e funciona de forma fiável)
-- Executa no SQL Editor do Supabase. Idempotente.
-- ============================================================

-- 1. Coluna de pedido de eliminação (idempotente)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;

-- 2. Policy de update do próprio perfil (recriar por segurança)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
END $$;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. RPC: pedir eliminação da própria conta (apenas o próprio user)
CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET deletion_requested_at = NOW()
  WHERE id = auth.uid();

  RETURN FOUND;
END;
$$;

-- 4. RPC: cancelar o pedido de eliminação (apenas o próprio user)
CREATE OR REPLACE FUNCTION public.cancel_account_deletion()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET deletion_requested_at = NULL
  WHERE id = auth.uid() AND deletion_requested_at IS NOT NULL;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.request_account_deletion() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated;

REVOKE ALL ON FUNCTION public.cancel_account_deletion() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_account_deletion() TO authenticated;