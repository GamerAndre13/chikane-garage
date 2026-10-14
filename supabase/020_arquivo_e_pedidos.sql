-- ============================================================
-- CHIKANE GARAGE — 020: Estado "arquivada" + pedidos do utilizador
--
-- Resolve, num só ficheiro, os pontos levantados nos testes:
--   1. Viaturas vendidas há mais de 7 dias continuavam a aparecer no
--      catálogo. Passa a existir o estado "archived": passados 7 dias de
--      uma venda, a viatura é arquivada automaticamente e sai do catálogo
--      público (o catálogo mostra só disponíveis, reservadas e vendidas).
--   2. O estado de um pedido de informação ganha o valor "replied"
--      (resposta enviada pelo back office).
--   3. Os pedidos (informação, test-drive e reserva) passam a poder ser
--      lidos pelo próprio utilizador também por email — mesmo que o pedido
--      tenha sido feito sem sessão iniciada (user_id nulo).
--
-- Executa no SQL Editor do Supabase. Idempotente (pode correr 2×).
-- ============================================================

-- ============================================================
-- 1. Estado "archived" nas viaturas
-- ============================================================
ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS vehicles_status_check;
ALTER TABLE public.vehicles
  ADD CONSTRAINT vehicles_status_check
  CHECK (status IN ('available', 'reserved', 'sold', 'archived'));

-- A base de dados assume o controlo do sold_at: ao marcar como vendida fica
-- com a data da venda; ao arquivar preserva-a; em qualquer outro estado é
-- limpa. Assim o "7 dias" nunca depende de o back office reenviar a data.
CREATE OR REPLACE FUNCTION public.set_vehicle_sold_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'sold' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.sold_at := COALESCE(NEW.sold_at, NOW());
    ELSIF OLD.status IS DISTINCT FROM 'sold' THEN
      NEW.sold_at := COALESCE(NEW.sold_at, NOW());
    ELSE
      NEW.sold_at := COALESCE(NEW.sold_at, OLD.sold_at, NOW());
    END IF;
  ELSIF NEW.status = 'archived' THEN
    -- Arquivar preserva a data da venda (histórico). Em INSERT não há OLD.
    IF TG_OP = 'INSERT' THEN
      NEW.sold_at := COALESCE(NEW.sold_at, NOW());
    ELSE
      NEW.sold_at := COALESCE(NEW.sold_at, OLD.sold_at, NOW());
    END IF;
  ELSE
    NEW.sold_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_vehicle_sold_at ON public.vehicles;
CREATE TRIGGER trigger_set_vehicle_sold_at
  BEFORE INSERT OR UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.set_vehicle_sold_at();

-- Preenche a data de venda de registos antigos que ainda não a tenham.
UPDATE public.vehicles
SET sold_at = COALESCE(sold_at, updated_at, created_at, NOW())
WHERE status = 'sold' AND sold_at IS NULL;

-- ============================================================
-- 2. Arquivar automaticamente as vendas com mais de 7 dias
-- ============================================================
CREATE OR REPLACE FUNCTION public.archive_sold_vehicles()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  UPDATE public.vehicles
  SET status = 'archived'
  WHERE status = 'sold'
    AND COALESCE(sold_at, updated_at, created_at) < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'archived', n);
END;
$$;

REVOKE ALL ON FUNCTION public.archive_sold_vehicles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.archive_sold_vehicles() TO anon, authenticated;

-- ============================================================
-- 3. Leitura pública: nunca mostrar arquivadas
-- ============================================================
DROP POLICY IF EXISTS "vehicles_select" ON public.vehicles;
CREATE POLICY "vehicles_select" ON public.vehicles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  OR status IN ('available', 'reserved')
  OR (status = 'sold' AND sold_at >= NOW() - INTERVAL '7 days')
);

-- ============================================================
-- 4. Pedidos de informação: novo estado "replied"
-- ============================================================
ALTER TABLE public.contact_requests DROP CONSTRAINT IF EXISTS contact_requests_status_check;
ALTER TABLE public.contact_requests
  ADD CONSTRAINT contact_requests_status_check
  CHECK (status IN ('new', 'read', 'confirmed', 'replied', 'archived'));

-- ============================================================
-- 5. O utilizador vê os seus pedidos (por user_id OU pelo email do JWT)
--    O email da sessão vive em auth.jwt() -> 'email', disponível nas
--    policies sem expor a tabela auth.users.
-- ============================================================
DROP POLICY IF EXISTS "contact_requests_select_own" ON public.contact_requests;
CREATE POLICY "contact_requests_select_own" ON public.contact_requests FOR SELECT
  USING (
    auth.uid() = user_id
    OR lower(email) = lower(auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS "test_drives_select_own" ON public.test_drives;
CREATE POLICY "test_drives_select_own" ON public.test_drives FOR SELECT
  USING (
    auth.uid() = user_id
    OR lower(email) = lower(auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS "reservations_select_own" ON public.reservations;
CREATE POLICY "reservations_select_own" ON public.reservations FOR SELECT
  USING (
    auth.uid() = user_id
    OR lower(email) = lower(auth.jwt() ->> 'email')
  );

NOTIFY pgrst, 'reload schema';

SELECT '✅ 020: estado "arquivada", arquivo automático e pedidos do utilizador prontos.' AS resultado;
