-- ============================================================
-- CHIKANE GARAGE - SETUP COMPLETO DO SITE
-- Executa no SQL Editor do Supabase (DEPOIS do setup.sql)
-- ============================================================

-- =====================
-- 1. TABELA: vehicles (viaturas)
-- =====================
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  brand TEXT NOT NULL DEFAULT 'BMW',
  model TEXT NOT NULL,
  trim TEXT DEFAULT '',
  version TEXT DEFAULT '',
  description TEXT DEFAULT '',
  year INTEGER NOT NULL,
  mileage_km INTEGER NOT NULL DEFAULT 0,
  power_hp INTEGER NOT NULL DEFAULT 0,
  fuel_type TEXT DEFAULT 'Diesel',
  transmission TEXT DEFAULT 'Automática',
  color TEXT DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold')),
  sold_at TIMESTAMPTZ,
  cover_image_url TEXT DEFAULT '',
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- 2. TABELA: vehicle_images
-- =====================
CREATE TABLE IF NOT EXISTS public.vehicle_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- 3. TABELA: site_content (CMS - textos editáveis)
-- =====================
CREATE TABLE IF NOT EXISTS public.site_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section_key TEXT UNIQUE NOT NULL,
  title TEXT DEFAULT '',
  subtitle TEXT DEFAULT '',
  body TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  link_url TEXT DEFAULT '',
  link_text TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- 5. TABELA: site_settings (configurações gerais)
-- =====================
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT DEFAULT '',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- 6. TABELA: contact_requests (pedidos de info)
-- =====================
CREATE TABLE IF NOT EXISTS public.contact_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  message TEXT DEFAULT '',
  vehicle_slug TEXT DEFAULT '',
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- 7. TABELA: test_drives
-- =====================
CREATE TABLE IF NOT EXISTS public.test_drives (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  vehicle_slug TEXT NOT NULL,
  preferred_date TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- RLS PARA TODAS AS TABELAS
-- =====================
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_drives ENABLE ROW LEVEL SECURITY;

-- vehicles: público para leitura, admin para escrita
CREATE POLICY "vehicles_select" ON public.vehicles FOR SELECT USING (
  status IS DISTINCT FROM 'sold'
  OR sold_at >= NOW() - INTERVAL '7 days'
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "vehicles_insert_admin" ON public.vehicles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "vehicles_update_admin" ON public.vehicles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "vehicles_delete_admin" ON public.vehicles FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

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

-- vehicle_images: público leitura, admin escrita
CREATE POLICY "vehicle_images_select" ON public.vehicle_images FOR SELECT USING (true);
CREATE POLICY "vehicle_images_insert_admin" ON public.vehicle_images FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "vehicle_images_delete_admin" ON public.vehicle_images FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- site_content: público leitura, admin escrita
CREATE POLICY "site_content_select" ON public.site_content FOR SELECT USING (true);
CREATE POLICY "site_content_insert_admin" ON public.site_content FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "site_content_update_admin" ON public.site_content FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "site_content_delete_admin" ON public.site_content FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- site_settings: público leitura, admin escrita
CREATE POLICY "site_settings_select" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "site_settings_insert_admin" ON public.site_settings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "site_settings_update_admin" ON public.site_settings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- contact_requests: admin apenas
CREATE POLICY "contact_requests_select_admin" ON public.contact_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "contact_requests_insert_all" ON public.contact_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "contact_requests_update_admin" ON public.contact_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- test_drives: admin apenas
CREATE POLICY "test_drives_select_admin" ON public.test_drives FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "test_drives_insert_all" ON public.test_drives FOR INSERT WITH CHECK (true);
CREATE POLICY "test_drives_update_admin" ON public.test_drives FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- =====================
-- PERMISSÕES
-- =====================
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.vehicle_images TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_content TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT INSERT ON public.contact_requests TO anon, authenticated;
GRANT INSERT ON public.test_drives TO anon, authenticated;
GRANT UPDATE ON public.contact_requests TO authenticated;
GRANT UPDATE ON public.test_drives TO authenticated;

-- =====================
-- DADOS INICIAIS (CMS)
-- =====================
INSERT INTO public.site_content (section_key, title, subtitle, body, link_url, link_text, sort_order) VALUES
('hero_tagline', 'Seleção Rigorosa · Garantia Chikane', '', '', '', '', 1),
('hero_slogan', 'Precision. Imported. Passion Delivered.', '', 'Uma garagem privada especializada em BMWs diesel de performance. Cada viatura é selecionada a dedo, inspecionada detalhadamente e vendida com garantia Chikane.', '', '', 2),
('garage_heading', 'A garagem', 'Compramos como se fosse para nós. Porque já foi.', 'Cada viatura é comprada como se fosse para a nossa própria coleção. Revisamos o histórico, o estado mecânico e estético, aplicamos uma inspecção de 140 pontos e atribuímos um número de série Chikane.', '/sobre', 'LER A HISTÓRIA COMPLETA →', 3),
('newsletter_heading', 'As viaturas saem antes de chegarem ao site', '', 'Recebe primeiro cada unidade que entra na garagem. Com fotografias e preço, 48 horas antes de ser publicada.', '', 'SUBSCREVER', 4);

INSERT INTO public.site_settings (key, value) VALUES
('site_name', 'Chikane Garage'),
('site_tagline', 'Viaturas de performance, escolhidas a dedo, entregues com garantia.'),
('contact_phone', '+351 912 000 000'),
('contact_email', 'garage@chikane.pt'),
('contact_location', 'Porto · Portugal'),
('social_instagram', 'https://instagram.com'),
('social_youtube', 'https://youtube.com'),
('footer_text', '© 2026 Chikane Garage. Todos os direitos reservados.');

SELECT '✅ SETUP COMPLETO DO SITE!' AS resultado;
