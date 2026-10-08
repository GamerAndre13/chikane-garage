-- Adicionar confirmed_date a test_drives se não existir
ALTER TABLE public.test_drives ADD COLUMN IF NOT EXISTS confirmed_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.test_drives ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;

-- Permitir 'rejected' no CHECK (se estiver restritivo)
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'test_drives' AND con.contype = 'c';
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.test_drives DROP CONSTRAINT %I;', constraint_name);
  END IF;
  ALTER TABLE public.test_drives ADD CONSTRAINT test_drives_status_check CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'rejected'));
END $$;

ALTER TABLE public.test_drives ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "test_drives_insert_anon" ON public.test_drives;
  DROP POLICY IF EXISTS "test_drives_select_admin" ON public.test_drives;
  DROP POLICY IF EXISTS "test_drives_update_admin" ON public.test_drives;
END $$;

CREATE POLICY "test_drives_insert_anon" ON public.test_drives FOR INSERT WITH CHECK (true);
CREATE POLICY "test_drives_select_admin" ON public.test_drives FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "test_drives_update_admin" ON public.test_drives FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

GRANT INSERT ON public.test_drives TO anon;
GRANT SELECT, UPDATE ON public.test_drives TO authenticated;
GRANT UPDATE ON public.test_drives TO service_role;
