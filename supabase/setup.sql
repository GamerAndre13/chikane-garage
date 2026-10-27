-- ============================================================
-- CHIKANE GARAGE - SETUP LIMPO E OTIMIZADO
-- ============================================================
-- Objetivo: Schema minimalista, otimizado para catálogo de viaturas
-- Suporta 2 - 5.000 registos com boa performance
-- Executar TODO num único run no SQL Editor do Supabase
-- ============================================================

-- 1) LIMPEZA COMPLETA
-- ============================================================
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Garantir permissões base
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2) FUNÇÕES AUXILIARES
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.is_admin(uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  IF uid IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = uid AND p.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3) TABELAS
-- ============================================================

-- Perfis ligados ao auth.users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  nif TEXT DEFAULT '',
  country TEXT DEFAULT 'PT',
  deletion_requested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Viaturas (núcleo do catálogo)
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  reference_code TEXT,

  -- Identificação
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  trim TEXT DEFAULT '',
  registration_year INT,
  registration_month INT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold', 'archived')),
  sold_at TIMESTAMPTZ,
  reserved_until TIMESTAMPTZ,

  -- Especificações
  engine TEXT,
  power_hp INT,
  torque_nm INT,
  transmission TEXT CHECK (transmission IN ('manual', 'automatic')),
  drivetrain TEXT CHECK (drivetrain IN ('rwd', 'awd', 'fwd')),
  body_style TEXT,
  fuel_type TEXT DEFAULT 'diesel',
  combined_consumption NUMERIC(5,2),
  co2_emissions INT,
  exterior_color TEXT,
  interior_color TEXT,
  mileage_km INT,

  -- Histórico / Origem
  previous_owners INT,
  service_book TEXT CHECK (service_book IN ('full_dealer', 'full', 'partial', 'none')),
  accident_history BOOLEAN NOT NULL DEFAULT false,
  accident_details TEXT,
  last_service_date DATE,
  tires_condition TEXT,
  origin TEXT DEFAULT 'imported' CHECK (origin IN ('national', 'imported')),
  origin_country TEXT,
  coc_confirmed BOOLEAN NOT NULL DEFAULT false,
  isv_paid BOOLEAN NOT NULL DEFAULT false,
  legalization_date DATE,

  -- Comercial
  price NUMERIC(12,2),
  financing_available BOOLEAN NOT NULL DEFAULT false,
  warranty_months INT DEFAULT 6,
  brand_warranty_months INT,
  trade_in_accepted BOOLEAN NOT NULL DEFAULT false,
  condition TEXT DEFAULT 'used' CHECK (condition IN ('new', 'used')),
  sale_type TEXT DEFAULT 'stock' CHECK (sale_type IN ('stock', 'on_order')),
  delivery_estimate_days INT,
  config_summary TEXT DEFAULT '',

  -- Conteúdo
  cover_image_url TEXT DEFAULT '',
  video_url TEXT,
  description TEXT DEFAULT '',

  -- Destaque / Publicação
  is_featured BOOLEAN NOT NULL DEFAULT false,
  spotlight BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices otimizados
CREATE UNIQUE INDEX idx_vehicles_slug ON public.vehicles(slug);
CREATE INDEX idx_vehicles_status_pub ON public.vehicles(status, published_at DESC);
CREATE INDEX idx_vehicles_brand_model ON public.vehicles(lower(brand), lower(model));
CREATE INDEX idx_vehicles_year ON public.vehicles(registration_year);
CREATE INDEX idx_vehicles_price ON public.vehicles(price);
CREATE INDEX idx_vehicles_mileage ON public.vehicles(mileage_km);
CREATE INDEX idx_vehicles_featured ON public.vehicles(is_featured) WHERE is_featured = true;
CREATE INDEX idx_vehicles_spotlight ON public.vehicles(spotlight) WHERE spotlight = true;
CREATE INDEX idx_vehicles_ref ON public.vehicles(reference_code) WHERE reference_code IS NOT NULL;

CREATE TRIGGER set_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Equipamento / extras
CREATE TABLE public.vehicle_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  label TEXT NOT NULL
);

CREATE INDEX idx_vehicle_features_vehicle_id ON public.vehicle_features(vehicle_id);

-- Imagens das viaturas
CREATE TABLE public.vehicle_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  alt_text TEXT DEFAULT ''
);

CREATE INDEX idx_vehicle_images_vehicle_pos ON public.vehicle_images(vehicle_id, position);

-- Favoritos
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT favorites_unique UNIQUE (user_id, vehicle_id)
);

CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX idx_favorites_vehicle_id ON public.favorites(vehicle_id);

-- Pedidos de contacto / test-drive / reserva
CREATE TABLE public.contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  message TEXT DEFAULT '',
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'confirmed', 'replied', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contact_requests_status_created ON public.contact_requests(status, created_at DESC);
CREATE INDEX idx_contact_requests_vehicle_id ON public.contact_requests(vehicle_id);

CREATE TABLE public.test_drives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  preferred_date DATE NOT NULL,
  preferred_time TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'rejected')),
  notes TEXT,
  admin_notes TEXT,
  confirmed_date TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_test_drives_status_date ON public.test_drives(status, preferred_date);
CREATE INDEX idx_test_drives_vehicle_id ON public.test_drives(vehicle_id);

CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  message TEXT DEFAULT '',
  extension_requested BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'completed')),
  reserved_until TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reservations_status_created ON public.reservations(status, created_at DESC);
CREATE INDEX idx_reservations_vehicle_id ON public.reservations(vehicle_id);

-- Newsletter
CREATE TABLE public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT DEFAULT '',
  source TEXT DEFAULT 'home',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_newsletter_status ON public.newsletter_subscribers(status);

-- Campanhas
CREATE TABLE public.campaigns (
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

CREATE INDEX idx_campaigns_active_pos ON public.campaigns(is_active, position);
CREATE TRIGGER set_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- CMS
CREATE TABLE public.site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL UNIQUE,
  title TEXT DEFAULT '',
  subtitle TEXT DEFAULT '',
  body TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  link_url TEXT DEFAULT '',
  link_text TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_site_content_updated_at
  BEFORE UPDATE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  location TEXT DEFAULT '',
  location_url TEXT DEFAULT '',
  social_instagram TEXT DEFAULT '',
  social_facebook TEXT DEFAULT '',
  social_whatsapp TEXT DEFAULT '',
  social_youtube TEXT DEFAULT '',
  social_tiktok TEXT DEFAULT '',
  footer_tagline TEXT DEFAULT '',
  photo_home_hero TEXT DEFAULT '',
  photo_home_history TEXT DEFAULT '',
  photo_about_hero TEXT DEFAULT '',
  photo_about_garage TEXT DEFAULT '',
  avatar_pool TEXT DEFAULT '',
  td_duration_minutes INT DEFAULT 60,
  td_slots TEXT DEFAULT '',
  td_days TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4) RLS
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_drives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin(auth.uid()));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.is_admin(auth.uid()));
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Vehicles / media
CREATE POLICY "vehicles_select_public" ON public.vehicles FOR SELECT USING (
  status IN ('available', 'reserved') OR public.is_admin(auth.uid())
);
CREATE POLICY "vehicles_insert_admin" ON public.vehicles FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "vehicles_update_admin" ON public.vehicles FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "vehicles_delete_admin" ON public.vehicles FOR DELETE USING (public.is_admin(auth.uid()));

CREATE POLICY "vehicle_features_select_public" ON public.vehicle_features FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND (v.status IN ('available','reserved') OR public.is_admin(auth.uid())))
);
CREATE POLICY "vehicle_features_manage_admin" ON public.vehicle_features FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "vehicle_images_select_public" ON public.vehicle_images FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND (v.status IN ('available','reserved') OR public.is_admin(auth.uid())))
);
CREATE POLICY "vehicle_images_manage_admin" ON public.vehicle_images FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Favoritos
CREATE POLICY "favorites_select_own" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "favorites_insert_own" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "favorites_delete_own" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- Contactos/Test-drives/Reservas
CREATE POLICY "contact_requests_insert_any" ON public.contact_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "contact_requests_select_admin" ON public.contact_requests FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "contact_requests_update_admin" ON public.contact_requests FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "contact_requests_delete_admin" ON public.contact_requests FOR DELETE USING (public.is_admin(auth.uid()));

CREATE POLICY "test_drives_insert_any" ON public.test_drives FOR INSERT WITH CHECK (true);
CREATE POLICY "test_drives_select_admin" ON public.test_drives FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "test_drives_update_admin" ON public.test_drives FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "test_drives_delete_admin" ON public.test_drives FOR DELETE USING (public.is_admin(auth.uid()));

CREATE POLICY "reservations_insert_any" ON public.reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "reservations_select_admin" ON public.reservations FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "reservations_update_admin" ON public.reservations FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "reservations_delete_admin" ON public.reservations FOR DELETE USING (public.is_admin(auth.uid()));

-- Newsletter
CREATE POLICY "newsletter_insert_any" ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "newsletter_select_admin" ON public.newsletter_subscribers FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "newsletter_update_admin" ON public.newsletter_subscribers FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "newsletter_delete_admin" ON public.newsletter_subscribers FOR DELETE USING (public.is_admin(auth.uid()));

-- CMS / Campanhas
CREATE POLICY "campaigns_select_public" ON public.campaigns FOR SELECT USING (is_active = true OR public.is_admin(auth.uid()));
CREATE POLICY "campaigns_manage_admin" ON public.campaigns FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "site_content_select_public" ON public.site_content FOR SELECT USING (true);
CREATE POLICY "site_content_manage_admin" ON public.site_content FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "site_settings_select_public" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "site_settings_manage_admin" ON public.site_settings FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 5) GRANTS
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- Recarregar schema cache
NOTIFY pgrst, 'reload schema';
