-- Garantir tabela campaigns existe
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  button_label TEXT DEFAULT '',
  button_href TEXT DEFAULT '',
  starts_at DATE,
  ends_at DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS campaigns_active_position_idx ON public.campaigns (is_active, position);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaigns_select_public" ON public.campaigns;
CREATE POLICY "campaigns_select_public" ON public.campaigns FOR SELECT USING (is_active);

DROP POLICY IF EXISTS "campaigns_admin_all" ON public.campaigns;
CREATE POLICY "campaigns_admin_all" ON public.campaigns FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

GRANT SELECT ON public.campaigns TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;

CREATE OR REPLACE FUNCTION public.shop_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER trg_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.shop_touch_updated_at();

NOTIFY pgrst, 'reload schema';
