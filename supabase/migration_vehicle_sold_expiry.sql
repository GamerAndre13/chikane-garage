-- Show sold vehicles publicly for seven days, then hide them from non-admins.
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS sold_at TIMESTAMPTZ;

UPDATE public.vehicles
SET sold_at = COALESCE(updated_at, created_at, NOW())
WHERE status = 'sold' AND sold_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_vehicle_sold_at()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'sold' THEN
      NEW.sold_at := COALESCE(NEW.sold_at, NOW());
    ELSE
      NEW.sold_at := NULL;
    END IF;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'sold' THEN
      NEW.sold_at := NOW();
    ELSE
      NEW.sold_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_vehicle_sold_at ON public.vehicles;
CREATE TRIGGER trigger_set_vehicle_sold_at
  BEFORE INSERT OR UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.set_vehicle_sold_at();

DROP POLICY IF EXISTS "vehicles_select" ON public.vehicles;
CREATE POLICY "vehicles_select" ON public.vehicles FOR SELECT USING (
  status IS DISTINCT FROM 'sold'
  OR sold_at >= NOW() - INTERVAL '7 days'
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
