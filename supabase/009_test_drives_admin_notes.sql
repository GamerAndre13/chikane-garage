-- Adicionar notas do admin ao test_drives
ALTER TABLE public.test_drives ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.test_drives ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "test_drives_update_admin" ON public.test_drives;
END $$;

CREATE POLICY "test_drives_update_admin" ON public.test_drives FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

GRANT UPDATE ON public.test_drives TO authenticated;
