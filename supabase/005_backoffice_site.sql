-- ============================================================
-- CHIKANE GARAGE — 005: Backoffice (fotos, avatares, contas)
-- - Fotos das páginas (home + sobre) em site_settings
-- - Lista de avatares aleatórios (avatar_pool) em site_settings
-- - Flag para pedidos de eliminação de conta (deletion_requested_at) em profiles
-- - Funções RPC para aprovação/recusa/consulta de pedidos de eliminação
-- Executa no SQL Editor do Supabase. Idempotente.
-- ============================================================

-- 1. Fotos das páginas
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS photo_home_hero TEXT DEFAULT '';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS photo_home_history TEXT DEFAULT '';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS photo_about_hero TEXT DEFAULT '';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS photo_about_garage TEXT DEFAULT '';

-- 2. Pool de avatares aleatórios (URLs, um por linha)
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS avatar_pool TEXT DEFAULT '';

-- 3. Marcar pedido de eliminação na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;

-- 4. Garante que existe pelo menos uma linha em site_settings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.site_settings) THEN
    INSERT INTO public.site_settings (phone, email, address, location, avatar_pool)
    VALUES ('', '', '', '', '');
  END IF;
END $$;

-- 5. RPC: listar pedidos de eliminação pendentes (apenas admins)
CREATE OR REPLACE FUNCTION public.admin_pending_deletions()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  deletion_requested_at TIMESTAMPTZ
)
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

  RETURN QUERY
  SELECT p.id, p.email, p.full_name, p.deletion_requested_at
  FROM public.profiles p
  WHERE p.deletion_requested_at IS NOT NULL
  ORDER BY p.deletion_requested_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_pending_deletions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_pending_deletions() TO authenticated;

-- 6. RPC: apagar conta (apaga auth.users — cascata aos restantes)
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_id UUID)
RETURNS void
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

  DELETE FROM auth.users WHERE id = target_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;

-- 7. RPC: recusar pedido de eliminação (limpa flag)
CREATE OR REPLACE FUNCTION public.admin_clear_deletion_request(target_id UUID)
RETURNS void
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

  UPDATE public.profiles
  SET deletion_requested_at = NULL, updated_at = NOW()
  WHERE id = target_id AND deletion_requested_at IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_clear_deletion_request(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_clear_deletion_request(UUID) TO authenticated;

SELECT '✅ Backoffice (fotos, avatares, contas) pronto.' AS resultado;
