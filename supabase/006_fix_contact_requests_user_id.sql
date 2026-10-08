-- Adicionar user_id à tabela contact_requests se não existir
ALTER TABLE public.contact_requests ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "contact_requests_insert_anon" ON public.contact_requests;
  DROP POLICY IF EXISTS "contact_requests_insert_auth" ON public.contact_requests;
  DROP POLICY IF EXISTS "contact_requests_select_admin" ON public.contact_requests;
  DROP POLICY IF EXISTS "contact_requests_update_admin" ON public.contact_requests;
END $$;

CREATE POLICY "contact_requests_insert_anon" ON public.contact_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "contact_requests_select_admin" ON public.contact_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "contact_requests_update_admin" ON public.contact_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

GRANT INSERT ON public.contact_requests TO anon;
GRANT SELECT ON public.contact_requests TO authenticated;
