-- ============================================================
-- CHIKANE GARAGE — SETUP COMPLETO
-- Schema completo com todos os campos do veículo
-- Executa no SQL Editor do Supabase
-- ============================================================

-- Extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
END $$;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (false);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_profile_timestamp ON public.profiles;
CREATE TRIGGER trigger_update_profile_timestamp
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_timestamp();

-- ============================================================
-- 2. vehicles — catálogo completo
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  reference_code TEXT,

  -- Identificação
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  trim TEXT DEFAULT '',
  registration_year INT,
  registration_month INT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold')),
  sold_at TIMESTAMPTZ,

  -- Especificações técnicas
  engine TEXT,
  power_hp INT,
  torque_nm INT,
  transmission TEXT CHECK (transmission IN ('manual', 'automatic')),
  drivetrain TEXT CHECK (drivetrain IN ('rwd', 'awd', 'fwd')),
  body_style TEXT,
  fuel_type TEXT DEFAULT 'diesel',
  combined_consumption NUMERIC,
  co2_emissions INT,
  exterior_color TEXT,
  interior_color TEXT,
  mileage_km INT,

  -- Histórico e estado
  previous_owners INT,
  service_book TEXT CHECK (service_book IN ('full_dealer', 'full', 'partial', 'none')),
  accident_history BOOLEAN DEFAULT false,
  accident_details TEXT,
  last_service_date DATE,
  tires_condition TEXT,

  -- Origem
  origin TEXT DEFAULT 'imported' CHECK (origin IN ('national', 'imported')),
  origin_country TEXT,
  coc_confirmed BOOLEAN DEFAULT false,
  isv_paid BOOLEAN DEFAULT false,
  legalization_date DATE,

  -- Preço e condições comerciais
  price NUMERIC,
  financing_available BOOLEAN DEFAULT false,
  warranty_months INT DEFAULT 6,
  trade_in_accepted BOOLEAN DEFAULT false,

  -- Media
  cover_image_url TEXT DEFAULT '',
  video_url TEXT,

  -- Descrição
  description TEXT DEFAULT '',

  -- Meta
  is_featured BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS "vehicles_select" ON public.vehicles;
  DROP POLICY IF EXISTS "vehicles_insert_admin" ON public.vehicles;
  DROP POLICY IF EXISTS "vehicles_update_admin" ON public.vehicles;
  DROP POLICY IF EXISTS "vehicles_delete_admin" ON public.vehicles;
END $$;
CREATE POLICY "vehicles_select" ON public.vehicles FOR SELECT USING (
  status <> 'sold'
  OR sold_at >= NOW() - INTERVAL '7 days'
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "vehicles_insert_admin" ON public.vehicles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "vehicles_update_admin" ON public.vehicles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "vehicles_delete_admin" ON public.vehicles FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE OR REPLACE FUNCTION public.update_vehicle_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_vehicle_timestamp ON public.vehicles;
CREATE TRIGGER trigger_update_vehicle_timestamp
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_vehicle_timestamp();

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

CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_brand_model ON public.vehicles(brand, model);

-- ============================================================
-- 3. vehicle_features — extras/equipamento
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vehicle_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  label TEXT NOT NULL
);

ALTER TABLE public.vehicle_features ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS "vehicle_features_select" ON public.vehicle_features;
  DROP POLICY IF EXISTS "vehicle_features_insert_admin" ON public.vehicle_features;
  DROP POLICY IF EXISTS "vehicle_features_delete_admin" ON public.vehicle_features;
END $$;
CREATE POLICY "vehicle_features_select" ON public.vehicle_features FOR SELECT USING (true);
CREATE POLICY "vehicle_features_insert_admin" ON public.vehicle_features FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "vehicle_features_delete_admin" ON public.vehicle_features FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- 4. vehicle_images — galeria
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vehicle_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INT DEFAULT 0,
  alt_text TEXT DEFAULT ''
);

ALTER TABLE public.vehicle_images ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS "vehicle_images_select" ON public.vehicle_images;
  DROP POLICY IF EXISTS "vehicle_images_insert_admin" ON public.vehicle_images;
  DROP POLICY IF EXISTS "vehicle_images_delete_admin" ON public.vehicle_images;
END $$;
CREATE POLICY "vehicle_images_select" ON public.vehicle_images FOR SELECT USING (true);
CREATE POLICY "vehicle_images_insert_admin" ON public.vehicle_images FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "vehicle_images_delete_admin" ON public.vehicle_images FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- 5. favorites
-- ============================================================
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, vehicle_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS "favorites_select_own" ON public.favorites;
  DROP POLICY IF EXISTS "favorites_insert_own" ON public.favorites;
  DROP POLICY IF EXISTS "favorites_delete_own" ON public.favorites;
END $$;
CREATE POLICY "favorites_select_own" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "favorites_insert_own" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "favorites_delete_own" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 7. contact_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  message TEXT DEFAULT '',
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'confirmed', 'archived')),
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS "contact_requests_insert_anon" ON public.contact_requests;
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

-- ============================================================
-- 8. test_drives
-- ============================================================
CREATE TABLE IF NOT EXISTS public.test_drives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  preferred_date DATE NOT NULL,
  preferred_time TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

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

-- ============================================================
-- 9. site_content
-- ============================================================
CREATE TABLE IF NOT EXISTS public.site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT UNIQUE NOT NULL,
  title TEXT DEFAULT '',
  subtitle TEXT DEFAULT '',
  body TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  link_url TEXT DEFAULT '',
  link_text TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS "site_content_select" ON public.site_content;
  DROP POLICY IF EXISTS "site_content_insert_admin" ON public.site_content;
  DROP POLICY IF EXISTS "site_content_update_admin" ON public.site_content;
  DROP POLICY IF EXISTS "site_content_delete_admin" ON public.site_content;
END $$;
CREATE POLICY "site_content_select" ON public.site_content FOR SELECT USING (true);
CREATE POLICY "site_content_insert_admin" ON public.site_content FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "site_content_update_admin" ON public.site_content FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "site_content_delete_admin" ON public.site_content FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- 10. site_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  location TEXT DEFAULT '',
  social_instagram TEXT DEFAULT '',
  social_facebook TEXT DEFAULT '',
  social_whatsapp TEXT DEFAULT '',
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS "site_settings_select" ON public.site_settings;
  DROP POLICY IF EXISTS "site_settings_update_admin" ON public.site_settings;
END $$;
CREATE POLICY "site_settings_select" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "site_settings_update_admin" ON public.site_settings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- PERMISSÕES
-- ============================================================
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;
GRANT DELETE ON public.profiles TO authenticated;

GRANT SELECT ON public.vehicles TO authenticated;
GRANT SELECT ON public.vehicle_features TO authenticated;
GRANT SELECT ON public.vehicle_images TO authenticated;
GRANT SELECT ON public.favorites TO authenticated;
GRANT SELECT ON public.site_content TO authenticated;
GRANT SELECT ON public.site_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;
GRANT SELECT ON public.contact_requests TO authenticated;
GRANT SELECT ON public.test_drives TO authenticated;

GRANT INSERT ON public.contact_requests TO anon;
GRANT INSERT ON public.test_drives TO anon;

-- ============================================================
-- STORAGE
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Avatar public read" ON storage.objects;
  DROP POLICY IF EXISTS "Avatar upload own" ON storage.objects;
END $$;
CREATE POLICY "Avatar public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Avatar upload own" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
SELECT '✅ SETUP COMPLETO — schema completo criado!' AS resultado;
