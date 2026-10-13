-- ============================================================
-- CHIKANE GARAGE — 018: Limite anti-spam dos pedidos de informação
-- - RPC submit_contact_request(): no máximo 2 pedidos de informação por
--   email em cada 30 minutos (contados pela data de criação).
-- - Devolve { ok: true, id } quando grava, ou { ok: false, reason }:
--     'rate_limited' quando o email já atingiu o limite.
-- Executa no SQL Editor do Supabase. Idempotente.
-- ============================================================

CREATE OR REPLACE FUNCTION public.submit_contact_request(
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_message TEXT DEFAULT '',
  p_vehicle_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
  new_id uuid;
BEGIN
  IF p_email IS NULL OR length(btrim(p_email)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_email');
  END IF;

  -- Pedidos do mesmo email na última meia hora
  SELECT count(*) INTO recent_count
  FROM public.contact_requests
  WHERE lower(email) = lower(btrim(p_email))
    AND created_at > NOW() - INTERVAL '30 minutes';

  IF recent_count >= 2 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'rate_limited');
  END IF;

  INSERT INTO public.contact_requests (user_id, name, email, phone, message, vehicle_id, status)
  VALUES (
    p_user_id,
    p_name,
    btrim(p_email),
    COALESCE(p_phone, ''),
    COALESCE(p_message, ''),
    p_vehicle_id,
    'new'
  )
  RETURNING id INTO new_id;

  RETURN jsonb_build_object('ok', true, 'id', new_id);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_contact_request(TEXT, TEXT, TEXT, TEXT, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_contact_request(TEXT, TEXT, TEXT, TEXT, UUID, UUID) TO anon, authenticated;

SELECT '✅ 018: Limite de pedidos de informação (2 por email a cada 30 min) pronto.' AS resultado;
