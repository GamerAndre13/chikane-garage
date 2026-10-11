-- ============================================================
-- CHIKANE GARAGE — 016: Reservas + calendário de test-drives
-- - Tabela reservations (pedidos de reserva: aceitar/rejeitar)
-- - vehicles.reserved_until (nunca mais de 7 dias em "reserved")
-- - RPC expire_reservations(): devolve a "available" após o prazo
-- - site_settings: td_duration_minutes, td_slots, td_days
-- - RPC get_occupied_test_drive_slots(data): horários confirmados
-- - GRANTs em falta para visitantes anónimos (galeria da ficha)
-- Executa no SQL Editor do Supabase. Idempotente.
-- ============================================================

-- 1. Pedidos de reserva
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  message TEXT DEFAULT '',
  extension_requested BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'completed')),
  reserved_until TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS "reservations_insert_all" ON public.reservations;
  DROP POLICY IF EXISTS "reservations_select_admin" ON public.reservations;
  DROP POLICY IF EXISTS "reservations_update_admin" ON public.reservations;
END $$;
CREATE POLICY "reservations_insert_all" ON public.reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "reservations_select_admin" ON public.reservations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "reservations_update_admin" ON public.reservations FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

GRANT INSERT ON public.reservations TO anon, authenticated;
GRANT SELECT, UPDATE ON public.reservations TO authenticated, service_role;

-- 2. Prazo máximo de 7 dias em estado "reserved"
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS reserved_until TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.expire_reservations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  UPDATE public.vehicles
  SET status = 'available', reserved_until = NULL
  WHERE status = 'reserved'
    AND reserved_until IS NOT NULL
    AND reserved_until < NOW();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_reservations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_reservations() TO anon, authenticated;

-- 3. Test-drives: configuração de disponibilidade (horários/dias/duração)
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS td_duration_minutes INT DEFAULT 60;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS td_slots TEXT DEFAULT '';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS td_days TEXT DEFAULT '';

-- RPC: horários já confirmados numa data, em "HH:MM" (Europe/Lisbon).
-- Só devolve slots a partir de agora (não do passado).
CREATE OR REPLACE FUNCTION public.get_occupied_test_drive_slots(p_date DATE)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  slots text[];
BEGIN
  SELECT COALESCE(
    array_agg(to_char((confirmed_date AT TIME ZONE 'Europe/Lisbon'), 'HH24:MI') ORDER BY confirmed_date),
    '{}'
  )
  INTO slots
  FROM public.test_drives
  WHERE status = 'confirmed'
    AND (confirmed_date AT TIME ZONE 'Europe/Lisbon')::date = p_date
    AND confirmed_date >= NOW();
  RETURN slots;
END;
$$;

REVOKE ALL ON FUNCTION public.get_occupied_test_drive_slots(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_occupied_test_drive_slots(DATE) TO anon, authenticated;

-- 4. GRANTs em falta para visitantes anónimos (ficha de viatura/galeria)
GRANT SELECT ON public.vehicles TO anon;
GRANT SELECT ON public.vehicle_images TO anon;
GRANT SELECT ON public.vehicle_features TO anon;

SELECT '✅ 016: Reservas + calendário de test-drives pronto.' AS resultado;