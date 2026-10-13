-- ============================================================
-- CHIKANE GARAGE — 019: Pedidos do visitante, conta e localização
--
-- Resolve, num só ficheiro, os pontos levantados nos testes:
--   1. Eliminar a conta (back office) deixava de funcionar porque a FK
--      contact_requests.user_id -> auth.users(id) não tinha ação de
--      eliminação. Passa a ON DELETE CASCADE (idem para test_drives).
--   2. Os pedidos de informação do próprio utilizador não apareciam na
--      área de conta (a policy de SELECT era só para admins).
--      Acrescentam-se policies "select_own" a contact_requests e a
--      test_drives.
--   3. Enviar test-drive/reserva sem login dava
--      "new row violates row-level security policy" (o .insert().select()
--      precisa de SELECT sobre a linha criada e o visitante não tinha
--      permissão). Passa a existir uma RPC SECURITY DEFINER para cada
--      um, à imagem de submit_contact_request() (migration 018). As três
--      RPCs deixam de confiar no user_id do cliente e usam auth.uid().
--   4. site_settings.location_url: link opcional do Google Maps para a
--      morada (clicável no rodapé e na página de contacto).
--
-- Executa no SQL Editor do Supabase. Idempotente (pode correr 2×).
-- ============================================================

-- ============================================================
-- 1. Chaves estrangeiras em cascata (eliminar conta deixa de falhar)
-- ============================================================
ALTER TABLE public.contact_requests DROP CONSTRAINT IF EXISTS contact_requests_user_id_fkey;
ALTER TABLE public.contact_requests
  ADD CONSTRAINT contact_requests_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.test_drives DROP CONSTRAINT IF EXISTS test_drives_user_id_fkey;
ALTER TABLE public.test_drives
  ADD CONSTRAINT test_drives_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- A viatura de um test-drive pode ser eliminada do back office: o registo
-- histórico mantém-se com vehicle_id = NULL (corrige um NOT NULL incoerente
-- com o ON DELETE SET NULL definido no setup.sql).
ALTER TABLE public.test_drives ALTER COLUMN vehicle_id DROP NOT NULL;

-- ============================================================
-- 2. Políticas de leitura dos próprios pedidos (área de conta)
-- ============================================================
DO $$ BEGIN
  DROP POLICY IF EXISTS "contact_requests_select_own" ON public.contact_requests;
  DROP POLICY IF EXISTS "test_drives_select_own" ON public.test_drives;
END $$;

CREATE POLICY "contact_requests_select_own" ON public.contact_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "test_drives_select_own" ON public.test_drives FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- 3. RPCs de envio de pedidos (funcionam para visitantes anónimos)
-- ============================================================

-- 3.1 Test-drive
CREATE OR REPLACE FUNCTION public.submit_test_drive(
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_vehicle_id UUID DEFAULT NULL,
  p_preferred_date DATE DEFAULT NULL,
  p_preferred_time TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT '',
  p_user_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  v_user_id uuid;
BEGIN
  -- Nunca confiar no user_id enviado pelo cliente: usa a sessão autenticada
  -- (NULL para visitantes anónimos). O parâmetro p_user_id fica apenas por
  -- compatibilidade com a assinatura usada no cliente.
  v_user_id := auth.uid();

  IF p_email IS NULL OR length(btrim(p_email)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_email');
  END IF;
  IF p_name IS NULL OR length(btrim(p_name)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_name');
  END IF;
  IF p_preferred_date IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_date');
  END IF;

  INSERT INTO public.test_drives (
    vehicle_id, user_id, name, email, phone,
    preferred_date, preferred_time, notes, status
  ) VALUES (
    p_vehicle_id, v_user_id, btrim(p_name), btrim(p_email), COALESCE(p_phone, ''),
    p_preferred_date, NULLIF(btrim(COALESCE(p_preferred_time, '')), ''),
    NULLIF(btrim(COALESCE(p_notes, '')), ''), 'pending'
  )
  RETURNING id INTO new_id;

  RETURN jsonb_build_object('ok', true, 'id', new_id);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_test_drive(TEXT, TEXT, TEXT, UUID, DATE, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_test_drive(TEXT, TEXT, TEXT, UUID, DATE, TEXT, TEXT, UUID) TO anon, authenticated;

-- 3.2 Reserva
CREATE OR REPLACE FUNCTION public.submit_reservation(
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_message TEXT DEFAULT '',
  p_vehicle_id UUID DEFAULT NULL,
  p_extension BOOLEAN DEFAULT false,
  p_user_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  v_user_id uuid;
BEGIN
  -- Idem: o autor vem da sessão, não do cliente.
  v_user_id := auth.uid();

  IF p_email IS NULL OR length(btrim(p_email)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_email');
  END IF;
  IF p_name IS NULL OR length(btrim(p_name)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_name');
  END IF;

  INSERT INTO public.reservations (
    vehicle_id, user_id, name, email, phone, message, extension_requested, status
  ) VALUES (
    p_vehicle_id, v_user_id, btrim(p_name), btrim(p_email), COALESCE(p_phone, ''),
    COALESCE(p_message, ''), COALESCE(p_extension, false), 'pending'
  )
  RETURNING id INTO new_id;

  RETURN jsonb_build_object('ok', true, 'id', new_id);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_reservation(TEXT, TEXT, TEXT, TEXT, UUID, BOOLEAN, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_reservation(TEXT, TEXT, TEXT, TEXT, UUID, BOOLEAN, UUID) TO anon, authenticated;

-- 3.3 Pedido de informação — redefinição endurecida (origem: 018).
-- O autor passa a vir da sessão (auth.uid()) em vez de p_user_id, para que um
-- visitante não possa atribuir um pedido à conta de outra pessoa.
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
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

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
    v_user_id,
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

-- ============================================================
-- 4. Link da localização (Google Maps) nas definições do site
-- ============================================================
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS location_url TEXT DEFAULT '';

SELECT '✅ 019: pedidos do visitante, conta e localização prontos.' AS resultado;
