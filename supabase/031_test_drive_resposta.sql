-- ------------------------------------------------------------
-- 031 — Resposta do cliente à remarcação do test drive
-- ------------------------------------------------------------
-- Quando o back office altera a data/hora de um test drive, o pedido passa a
-- "rescheduled" com a data proposta em proposed_date. O cliente recebe um
-- email com um link (respond_token) e escolhe aceitar (fica confirmado) ou
-- recusar (volta a pendente e escolhe outro horário no site).
--
-- Idempotente: pode ser executado mais do que uma vez.

ALTER TABLE public.test_drives
  ADD COLUMN IF NOT EXISTS proposed_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS respond_token UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

-- Pedidos antigos passam a ter token (o default só se aplica a linhas novas).
UPDATE public.test_drives
SET respond_token = gen_random_uuid()
WHERE respond_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_test_drives_respond_token
  ON public.test_drives(respond_token);

-- Leitura pública (só o essencial) de um pedido pelo token do email.
CREATE OR REPLACE FUNCTION public.get_test_drive_by_token(p_token UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', t.id,
    'name', t.name,
    'email', t.email,
    'status', t.status,
    'proposed_date', t.proposed_date,
    'confirmed_date', t.confirmed_date,
    'responded_at', t.responded_at,
    'vehicle', CASE
      WHEN v.id IS NULL THEN NULL
      ELSE NULLIF(trim(concat_ws(' ', v.brand, v.model, v.trim)), '')
    END,
    'vehicle_slug', v.slug
  )
  FROM public.test_drives t
  LEFT JOIN public.vehicles v ON v.id = t.vehicle_id
  WHERE t.respond_token = p_token;
$$;

-- Aceitar/recusar uma data proposta. Devolve { ok, action, name, vehicle }.
-- Só funciona uma vez por proposta (proposed_date tem de estar preenchida).
CREATE OR REPLACE FUNCTION public.respond_test_drive(p_token UUID, p_action TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_drive public.test_drives;
  v_vehicle TEXT;
BEGIN
  IF p_action NOT IN ('accept', 'reject') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_action');
  END IF;

  SELECT * INTO v_drive
  FROM public.test_drives
  WHERE respond_token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF v_drive.proposed_date IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_proposal');
  END IF;

  IF p_action = 'accept' THEN
    UPDATE public.test_drives
    SET status = 'confirmed',
        confirmed_date = v_drive.proposed_date,
        confirmed_at = NOW(),
        proposed_date = NULL,
        responded_at = NOW()
    WHERE id = v_drive.id;
  ELSE
    UPDATE public.test_drives
    SET status = 'pending',
        confirmed_date = NULL,
        proposed_date = NULL,
        responded_at = NOW()
    WHERE id = v_drive.id;
  END IF;

  SELECT NULLIF(trim(concat_ws(' ', brand, model, trim)), '')
  INTO v_vehicle
  FROM public.vehicles
  WHERE id = v_drive.vehicle_id;

  RETURN jsonb_build_object(
    'ok', true,
    'action', p_action,
    'name', v_drive.name,
    'vehicle', v_vehicle,
    'vehicle_slug', (SELECT slug FROM public.vehicles WHERE id = v_drive.vehicle_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_test_drive_by_token(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_test_drive(UUID, TEXT) TO anon, authenticated;

-- Confirmar expiração de reservas (item 10) — função já existente em
-- supabase/setup.sql; chamada pelas páginas públicas via lib/expire-reservations.ts.
SELECT '031 — resposta à remarcação de test drive adicionada' AS resultado;
