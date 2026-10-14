-- ============================================================
-- CHIKANE GARAGE — INSTALAÇÃO DA BASE DE DADOS (FICHEIRO ÚNICO)
-- ============================================================
--
-- Este é o ÚNICO ficheiro de schema do projeto. Consolida e substitui
-- todas as migrations antigas, que foram removidas:
--   002_full_site.sql, 003..020_*.sql, favorites.sql,
--   migration_vehicle_sold_expiry.sql, migracao_perfil_e_fotos.sql,
--   newsletter.sql
--
-- COMO USAR (projeto Supabase novo OU já existente)
--   1. Supabase → SQL Editor → colar este ficheiro inteiro → Run.
--   2. (Opcional) correr o supabase/seed.sql para dados de demonstração.
--   3. Promover o primeiro admin — ver o fim deste ficheiro.
--
-- É IDEMPOTENTE: pode ser corrido as vezes que quiser. Numa base de
-- dados que já está em produção não altera nem apaga dados; apenas
-- garante que tabelas, colunas, políticas, funções e permissões estão
-- na versão final. Contém, no fim, as migrações de dados pontuais que
-- as migrations antigas faziam (só atuam sobre registos desatualizados).
--
-- NOTA: as fotografias das viaturas e dos avatares vivem no Cloudflare
-- R2 (binding VEHICLE_IMAGES) — a aplicação não usa o Supabase Storage.
-- ============================================================


-- ============================================================
-- 1. EXTENSÃO
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- 2. TABELAS
-- ============================================================

-- ------------------------------------------------------------
-- 2.1 profiles — perfil de cada utilizador (espelho de auth.users)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  role TEXT DEFAULT 'user',
  -- Pedido de eliminação de conta feito pelo próprio utilizador
  deletion_requested_at TIMESTAMPTZ,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2.2 vehicles — catálogo completo
-- ------------------------------------------------------------
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
  status TEXT DEFAULT 'available',
  sold_at TIMESTAMPTZ,
  -- Prazo máximo de 7 dias em estado "reserved" (ver expire_reservations)
  reserved_until TIMESTAMPTZ,

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
  -- Destaque da semana (apenas UMA viatura pode ter spotlight = true)
  spotlight BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2.3 vehicle_features — equipamento/extras
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicle_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  label TEXT NOT NULL
);

-- ------------------------------------------------------------
-- 2.4 vehicle_images — galeria de fotografias
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicle_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INT DEFAULT 0,
  alt_text TEXT DEFAULT ''
);

-- ------------------------------------------------------------
-- 2.5 favorites — viaturas guardadas pelo utilizador
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, vehicle_id)
);

-- ------------------------------------------------------------
-- 2.6 newsletter_subscribers — subscrições da newsletter
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT DEFAULT '',
  source TEXT DEFAULT 'home',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2.7 contact_requests — pedidos de informação
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  message TEXT DEFAULT '',
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2.8 test_drives — pedidos de test-drive
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.test_drives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Pode ficar NULL se a viatura for eliminada do back office (histórico)
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  preferred_date DATE NOT NULL,
  preferred_time TEXT,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  -- Data/hora confirmadas pelo back office
  confirmed_date TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  -- Notas internas do admin
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2.9 reservations — pedidos de reserva (aceitar/rejeitar)
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 2.10 site_content — textos editáveis (CMS)
--      O que o site mostra é a coluna `body`; o `title` é apenas
--      uma etiqueta de identificação no back office.
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 2.11 site_settings — contactos, redes sociais, rodapé, fotos
--      e configuração dos test-drives (uma única linha)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  location TEXT DEFAULT '',
  -- Link do Google Maps para a morada (opcional)
  location_url TEXT DEFAULT '',
  social_instagram TEXT DEFAULT '',
  social_facebook TEXT DEFAULT '',
  social_whatsapp TEXT DEFAULT '',
  social_youtube TEXT DEFAULT '',
  social_tiktok TEXT DEFAULT '',
  footer_tagline TEXT DEFAULT '',
  -- Fotografias das páginas (URLs no R2)
  photo_home_hero TEXT DEFAULT '',
  photo_home_history TEXT DEFAULT '',
  photo_about_hero TEXT DEFAULT '',
  photo_about_garage TEXT DEFAULT '',
  -- Avatares aleatórios (URLs, um por linha)
  avatar_pool TEXT DEFAULT '',
  -- Configuração dos test-drives
  td_duration_minutes INT DEFAULT 60,
  td_slots TEXT DEFAULT '',
  td_days TEXT DEFAULT '',
  updated_at TIMESTAMP DEFAULT NOW()
);


-- ============================================================
-- 3. COMPATIBILIDADE — colunas que as migrations antigas criavam
--    (garante a versão final em bases de dados já existentes)
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;

ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS body_style TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS sold_at TIMESTAMPTZ;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS reserved_until TIMESTAMPTZ;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS spotlight BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.contact_requests ADD COLUMN IF NOT EXISTS user_id UUID;

ALTER TABLE public.test_drives ADD COLUMN IF NOT EXISTS confirmed_date TIMESTAMPTZ;
ALTER TABLE public.test_drives ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE public.test_drives ADD COLUMN IF NOT EXISTS admin_notes TEXT;

ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS location_url TEXT DEFAULT '';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS social_youtube TEXT DEFAULT '';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS social_tiktok TEXT DEFAULT '';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS footer_tagline TEXT DEFAULT '';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS photo_home_hero TEXT DEFAULT '';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS photo_home_history TEXT DEFAULT '';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS photo_about_hero TEXT DEFAULT '';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS photo_about_garage TEXT DEFAULT '';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS avatar_pool TEXT DEFAULT '';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS td_duration_minutes INT DEFAULT 60;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS td_slots TEXT DEFAULT '';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS td_days TEXT DEFAULT '';


-- ============================================================
-- 4. CHAVES ESTRANGEIRAS E RESTRIÇÕES QUE EVOLUÍRAM
-- ============================================================

-- Eliminar a conta apaga os pedidos feitos por esse utilizador
ALTER TABLE public.contact_requests DROP CONSTRAINT IF EXISTS contact_requests_user_id_fkey;
ALTER TABLE public.contact_requests
  ADD CONSTRAINT contact_requests_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.test_drives DROP CONSTRAINT IF EXISTS test_drives_user_id_fkey;
ALTER TABLE public.test_drives
  ADD CONSTRAINT test_drives_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- A viatura de um test-drive pode ser eliminada: o registo histórico
-- mantém-se com vehicle_id = NULL.
ALTER TABLE public.test_drives ALTER COLUMN vehicle_id DROP NOT NULL;

-- Favoritos antigos (criados antes de existir a FK) — garante a FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'favorites' AND c.conname = 'favorites_vehicle_id_fkey'
  ) THEN
    -- Remove favoritos órfãos (de bases antigas) para poder criar a FK
    DELETE FROM public.favorites f
    WHERE NOT EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = f.vehicle_id);

    ALTER TABLE public.favorites
      ADD CONSTRAINT favorites_vehicle_id_fkey
      FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Estados possíveis (versão final)
ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS vehicles_status_check;
ALTER TABLE public.vehicles
  ADD CONSTRAINT vehicles_status_check
  CHECK (status IN ('available', 'reserved', 'sold', 'archived'));

ALTER TABLE public.contact_requests DROP CONSTRAINT IF EXISTS contact_requests_status_check;
ALTER TABLE public.contact_requests
  ADD CONSTRAINT contact_requests_status_check
  CHECK (status IN ('new', 'read', 'confirmed', 'replied', 'archived'));

ALTER TABLE public.test_drives DROP CONSTRAINT IF EXISTS test_drives_status_check;
ALTER TABLE public.test_drives
  ADD CONSTRAINT test_drives_status_check
  CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'rejected'));


-- ============================================================
-- 5. RLS E POLÍTICAS
--    (os nomes antigos são limpos antes de criar os definitivos)
-- ============================================================

-- ------------------------------------------------------------
-- 5.1 profiles
-- ------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
END $$;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (false);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- ------------------------------------------------------------
-- 5.2 vehicles — leitura pública (nunca mostra arquivadas)
-- ------------------------------------------------------------
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS "vehicles_select" ON public.vehicles;
  DROP POLICY IF EXISTS "vehicles_insert_admin" ON public.vehicles;
  DROP POLICY IF EXISTS "vehicles_update_admin" ON public.vehicles;
  DROP POLICY IF EXISTS "vehicles_delete_admin" ON public.vehicles;
END $$;
CREATE POLICY "vehicles_select" ON public.vehicles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  OR status IN ('available', 'reserved')
  OR (status = 'sold' AND sold_at >= NOW() - INTERVAL '7 days')
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

-- ------------------------------------------------------------
-- 5.3 vehicle_features
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 5.4 vehicle_images
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 5.5 favorites
-- ------------------------------------------------------------
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS "favorites_select_own" ON public.favorites;
  DROP POLICY IF EXISTS "favorites_insert_own" ON public.favorites;
  DROP POLICY IF EXISTS "favorites_delete_own" ON public.favorites;
END $$;
CREATE POLICY "favorites_select_own" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "favorites_insert_own" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "favorites_delete_own" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 5.6 newsletter_subscribers
-- ------------------------------------------------------------
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS "newsletter_select_admin" ON public.newsletter_subscribers;
  DROP POLICY IF EXISTS "newsletter_insert_anon" ON public.newsletter_subscribers;
  DROP POLICY IF EXISTS "newsletter_update_admin" ON public.newsletter_subscribers;
  DROP POLICY IF EXISTS "newsletter_delete_admin" ON public.newsletter_subscribers;
END $$;
-- Leitura dos emails: apenas admin (evita scraping anónimo)
CREATE POLICY "newsletter_select_admin" ON public.newsletter_subscribers FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
-- Inscrição pública (formulário do site)
CREATE POLICY "newsletter_insert_anon" ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "newsletter_update_admin" ON public.newsletter_subscribers FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "newsletter_delete_admin" ON public.newsletter_subscribers FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ------------------------------------------------------------
-- 5.7 contact_requests
-- ------------------------------------------------------------
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS "contact_requests_insert_anon" ON public.contact_requests;
  DROP POLICY IF EXISTS "contact_requests_insert_auth" ON public.contact_requests;
  DROP POLICY IF EXISTS "contact_requests_insert_all" ON public.contact_requests;
  DROP POLICY IF EXISTS "contact_requests_insert" ON public.contact_requests;
  DROP POLICY IF EXISTS "contact_requests_select_admin" ON public.contact_requests;
  DROP POLICY IF EXISTS "contact_requests_select_own" ON public.contact_requests;
  DROP POLICY IF EXISTS "contact_requests_select_own_or_admin" ON public.contact_requests;
  DROP POLICY IF EXISTS "contact_requests_update_admin" ON public.contact_requests;
END $$;
CREATE POLICY "contact_requests_insert_anon" ON public.contact_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "contact_requests_select_admin" ON public.contact_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
-- O utilizador vê os seus pedidos (por user_id OU pelo email da sessão)
CREATE POLICY "contact_requests_select_own" ON public.contact_requests FOR SELECT USING (
  auth.uid() = user_id
  OR lower(email) = lower(auth.jwt() ->> 'email')
);
CREATE POLICY "contact_requests_update_admin" ON public.contact_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ------------------------------------------------------------
-- 5.8 test_drives
-- ------------------------------------------------------------
ALTER TABLE public.test_drives ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS "test_drives_insert_anon" ON public.test_drives;
  DROP POLICY IF EXISTS "test_drives_insert_all" ON public.test_drives;
  DROP POLICY IF EXISTS "test_drives_insert" ON public.test_drives;
  DROP POLICY IF EXISTS "test_drives_select_admin" ON public.test_drives;
  DROP POLICY IF EXISTS "test_drives_select_own" ON public.test_drives;
  DROP POLICY IF EXISTS "test_drives_select_own_or_admin" ON public.test_drives;
  DROP POLICY IF EXISTS "test_drives_update_admin" ON public.test_drives;
END $$;
CREATE POLICY "test_drives_insert_anon" ON public.test_drives FOR INSERT WITH CHECK (true);
CREATE POLICY "test_drives_select_admin" ON public.test_drives FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "test_drives_select_own" ON public.test_drives FOR SELECT USING (
  auth.uid() = user_id
  OR lower(email) = lower(auth.jwt() ->> 'email')
);
CREATE POLICY "test_drives_update_admin" ON public.test_drives FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ------------------------------------------------------------
-- 5.9 reservations
-- ------------------------------------------------------------
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS "reservations_insert_all" ON public.reservations;
  DROP POLICY IF EXISTS "reservations_select_admin" ON public.reservations;
  DROP POLICY IF EXISTS "reservations_select_own" ON public.reservations;
  DROP POLICY IF EXISTS "reservations_update_admin" ON public.reservations;
END $$;
CREATE POLICY "reservations_insert_all" ON public.reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "reservations_select_admin" ON public.reservations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "reservations_select_own" ON public.reservations FOR SELECT USING (
  auth.uid() = user_id
  OR lower(email) = lower(auth.jwt() ->> 'email')
);
CREATE POLICY "reservations_update_admin" ON public.reservations FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ------------------------------------------------------------
-- 5.10 site_content (CMS) — leitura pública, escrita só admin
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 5.11 site_settings — leitura pública, escrita só admin
-- ------------------------------------------------------------
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS "site_settings_select" ON public.site_settings;
  DROP POLICY IF EXISTS "site_settings_insert_admin" ON public.site_settings;
  DROP POLICY IF EXISTS "site_settings_update_admin" ON public.site_settings;
END $$;
CREATE POLICY "site_settings_select" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "site_settings_insert_admin" ON public.site_settings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "site_settings_update_admin" ON public.site_settings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);


-- ============================================================
-- 6. ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_brand_model ON public.vehicles(brand, model);
CREATE INDEX IF NOT EXISTS idx_contact_requests_user ON public.contact_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_test_drives_user ON public.test_drives(user_id);

-- Garante que só pode existir UMA viatura em destaque (spotlight = true)
DROP INDEX IF EXISTS public.vehicles_single_spotlight;
CREATE UNIQUE INDEX vehicles_single_spotlight ON public.vehicles ((spotlight)) WHERE spotlight = true;


-- ============================================================
-- 7. FUNÇÕES E TRIGGERS
-- ============================================================

-- ------------------------------------------------------------
-- 7.1 Criar perfil automaticamente quando nasce um utilizador
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 7.2 updated_at automático
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 7.3 sold_at: a base de dados assume o controlo da data de venda.
--     Ao marcar "Vendida" fica com a data; ao arquivar preserva-a;
--     em qualquer outro estado é limpa.
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 7.4 Contas: pedidos de eliminação (back office)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_pending_deletions()
RETURNS TABLE(id UUID, email TEXT, full_name TEXT, deletion_requested_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  RETURN QUERY
  SELECT p.id, p.email, p.full_name, p.deletion_requested_at
  FROM public.profiles p
  WHERE p.deletion_requested_at IS NOT NULL
  ORDER BY p.deletion_requested_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_pending_deletions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_pending_deletions() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_user(target_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  DELETE FROM auth.users WHERE auth.users.id = target_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_clear_deletion_request(target_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  UPDATE public.profiles p
  SET deletion_requested_at = NULL, updated_at = NOW()
  WHERE p.id = target_id AND p.deletion_requested_at IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_clear_deletion_request(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_clear_deletion_request(UUID) TO authenticated;

-- ------------------------------------------------------------
-- 7.5 Contas: pedido/cancelamento pelo próprio utilizador
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET deletion_requested_at = NOW()
  WHERE id = auth.uid();

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_account_deletion()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET deletion_requested_at = NULL
  WHERE id = auth.uid() AND deletion_requested_at IS NOT NULL;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.request_account_deletion() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated;

REVOKE ALL ON FUNCTION public.cancel_account_deletion() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_account_deletion() TO authenticated;

-- ------------------------------------------------------------
-- 7.6 Destaque da semana (spotlight)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_spotlight(p_vehicle_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  -- p_vehicle_id NULL limpa tudo; caso contrário marca só essa viatura.
  -- COALESCE garante que limpar grava false (nunca NULL).
  UPDATE public.vehicles
  SET spotlight = COALESCE(id = p_vehicle_id, false)
  WHERE id IS NOT NULL;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_spotlight(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_spotlight(UUID) TO authenticated;

-- ------------------------------------------------------------
-- 7.7 Newsletter
-- ------------------------------------------------------------
-- Devolve TRUE se foi uma subscrição nova (enviar email) e FALSE se já
-- existia ativa. Reativa subscrições canceladas.
CREATE OR REPLACE FUNCTION public.subscribe_newsletter(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT := lower(trim(p_email));
  v_status TEXT;
BEGIN
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Email inválido';
  END IF;

  SELECT status INTO v_status
  FROM public.newsletter_subscribers
  WHERE lower(email) = v_email
  LIMIT 1;

  IF FOUND THEN
    -- Já subscrito e ativo: não volta a enviar
    IF v_status = 'active' THEN
      RETURN false;
    END IF;
    -- Estava cancelado: reativa e permite novo email
    UPDATE public.newsletter_subscribers
    SET status = 'active'
    WHERE lower(email) = v_email;
    RETURN true;
  END IF;

  INSERT INTO public.newsletter_subscribers (email) VALUES (v_email);
  RETURN true;
EXCEPTION WHEN unique_violation THEN
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.subscribe_newsletter(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.subscribe_newsletter(TEXT) TO anon, authenticated;

-- ------------------------------------------------------------
-- 7.8 Reservas: devolve a "available" depois do prazo
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 7.9 Test-drives: horários já ocupados numa data (HH:MM, Lisboa)
--     Só devolve slots a partir de agora (não do passado).
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 7.10 Arquivo automático de vendas com mais de 7 dias
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 7.11 Envio de pedidos (funciona para visitantes anónimos)
--      O autor vem sempre da sessão (auth.uid()), nunca do cliente.
-- ------------------------------------------------------------

-- Pedido de informação: no máximo 2 por email em cada 30 minutos
CREATE OR REPLACE FUNCTION public.submit_contact_request(
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_message TEXT DEFAULT '',
  p_vehicle_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
  new_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF p_email IS NULL OR length(btrim(p_email)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_email');
  END IF;

  -- Pedidos do mesmo email na última meia hora
  SELECT count(*) INTO recent_count
  FROM public.contact_requests
  WHERE lower(email) = lower(btrim(p_email))
    AND created_at > NOW() - INTERVAL '30 minutes';

  IF recent_count >= 2 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'rate_limited');
  END IF;

  INSERT INTO public.contact_requests (user_id, name, email, phone, message, vehicle_id, status)
  VALUES (
    v_user_id,
    p_name,
    btrim(p_email),
    COALESCE(p_phone, ''),
    COALESCE(p_message, ''),
    p_vehicle_id,
    'new'
  )
  RETURNING id INTO new_id;

  RETURN jsonb_build_object('ok', true, 'id', new_id);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_contact_request(TEXT, TEXT, TEXT, TEXT, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_contact_request(TEXT, TEXT, TEXT, TEXT, UUID, UUID) TO anon, authenticated;

-- Test-drive
CREATE OR REPLACE FUNCTION public.submit_test_drive(
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_vehicle_id UUID DEFAULT NULL,
  p_preferred_date DATE DEFAULT NULL,
  p_preferred_time TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT '',
  p_user_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  v_user_id uuid;
BEGIN
  -- Nunca confiar no user_id enviado pelo cliente: usa a sessão autenticada
  -- (NULL para visitantes anónimos). O parâmetro p_user_id fica apenas por
  -- compatibilidade com a assinatura usada no cliente.
  v_user_id := auth.uid();

  IF p_email IS NULL OR length(btrim(p_email)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_email');
  END IF;
  IF p_name IS NULL OR length(btrim(p_name)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_name');
  END IF;
  IF p_preferred_date IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_date');
  END IF;

  INSERT INTO public.test_drives (
    vehicle_id, user_id, name, email, phone,
    preferred_date, preferred_time, notes, status
  ) VALUES (
    p_vehicle_id, v_user_id, btrim(p_name), btrim(p_email), COALESCE(p_phone, ''),
    p_preferred_date, NULLIF(btrim(COALESCE(p_preferred_time, '')), ''),
    NULLIF(btrim(COALESCE(p_notes, '')), ''), 'pending'
  )
  RETURNING id INTO new_id;

  RETURN jsonb_build_object('ok', true, 'id', new_id);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_test_drive(TEXT, TEXT, TEXT, UUID, DATE, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_test_drive(TEXT, TEXT, TEXT, UUID, DATE, TEXT, TEXT, UUID) TO anon, authenticated;

-- Reserva
CREATE OR REPLACE FUNCTION public.submit_reservation(
  p_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_message TEXT DEFAULT '',
  p_vehicle_id UUID DEFAULT NULL,
  p_extension BOOLEAN DEFAULT false,
  p_user_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  v_user_id uuid;
BEGIN
  -- Idem: o autor vem da sessão, não do cliente.
  v_user_id := auth.uid();

  IF p_email IS NULL OR length(btrim(p_email)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_email');
  END IF;
  IF p_name IS NULL OR length(btrim(p_name)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_name');
  END IF;

  INSERT INTO public.reservations (
    vehicle_id, user_id, name, email, phone, message, extension_requested, status
  ) VALUES (
    p_vehicle_id, v_user_id, btrim(p_name), btrim(p_email), COALESCE(p_phone, ''),
    COALESCE(p_message, ''), COALESCE(p_extension, false), 'pending'
  )
  RETURNING id INTO new_id;

  RETURN jsonb_build_object('ok', true, 'id', new_id);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_reservation(TEXT, TEXT, TEXT, TEXT, UUID, BOOLEAN, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_reservation(TEXT, TEXT, TEXT, TEXT, UUID, BOOLEAN, UUID) TO anon, authenticated;


-- ============================================================
-- 8. PERMISSÕES
--    (as políticas RLS continuam a ser a barreira real de acesso)
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- --- Visitantes anónimos: leitura pública ---
GRANT SELECT ON public.vehicles TO anon;
GRANT SELECT ON public.vehicle_features TO anon;
GRANT SELECT ON public.vehicle_images TO anon;
GRANT SELECT ON public.site_content TO anon;
GRANT SELECT ON public.site_settings TO anon;

-- --- Visitantes anónimos: envio de formulários ---
GRANT INSERT ON public.contact_requests TO anon;
GRANT INSERT ON public.test_drives TO anon;
GRANT INSERT ON public.reservations TO anon;
GRANT INSERT ON public.newsletter_subscribers TO anon;

-- --- Utilizadores autenticados: leitura ---
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- --- Utilizadores autenticados: escrita (o RLS limita a admins/dono) ---
GRANT UPDATE, DELETE ON public.profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.vehicle_features TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.vehicle_images TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.favorites TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_content TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.contact_requests TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.test_drives TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reservations TO authenticated;
GRANT UPDATE, DELETE ON public.newsletter_subscribers TO authenticated;

-- --- Papel de serviço (integrações/back office do Supabase) ---
GRANT UPDATE ON public.test_drives TO service_role;
GRANT UPDATE ON public.reservations TO service_role;


-- ============================================================
-- 9. MIGRAÇÕES DE DADOS PONTUAIS
--    (só atuam sobre registos desatualizados; no-op se já estiver feito)
-- ============================================================

-- Classifica o formato das viaturas que ainda não tenham body_style
UPDATE public.vehicles
SET body_style = CASE
  WHEN model ILIKE 'X%' THEN 'suv'
  WHEN trim ILIKE '%tourer%' THEN 'monovolume'
  WHEN trim ILIKE '%gran coupé%' OR trim ILIKE '%gran coupe%' THEN 'hatchback'
  WHEN trim ILIKE '%touring%' OR trim ILIKE '%wagon%' THEN 'touring'
  WHEN trim ILIKE '%coupé%' OR trim ILIKE '%coupe%' THEN 'coupe'
  ELSE 'sedan'
END
WHERE body_style IS NULL;

-- Preenche a data de venda de registos antigos que ainda não a tenham
UPDATE public.vehicles
SET sold_at = COALESCE(sold_at, updated_at, created_at, NOW())
WHERE status = 'sold' AND sold_at IS NULL;


-- ============================================================
-- 10. CONTEÚDO E DEFINIÇÕES INICIAIS
--     (não sobrepõe o que já existir — o dono pode editar no back office)
-- ============================================================

-- Textos do site lidos pelo home. O que aparece é a coluna `body`.
INSERT INTO public.site_content (section_key, title, subtitle, body, link_url, link_text) VALUES
  ('hero.tagline', 'Frase de destaque (hero)', '', 'Seleção rigorosa · Garantia garantida', '', ''),
  ('hero.slogan', 'Slogan (hero)', '', 'Precision. Perfected. Passion.', '', ''),
  ('hero.intro', 'Introdução do hero', '', 'Uma garagem privada de performance. Cada unidade escolhida à mão, inspecionada ao detalhe e entregue com garantia Chikane — para quem vive a estrada com paixão.', '', ''),
  ('garage.text', 'A História (texto da home)', '', 'Compramos cada viatura como se fosse para a nossa própria coleção: histórico verificado, mecânica e estética inspecionadas ao detalhe, sempre com a garantia Chikane. Fala connosco para confirmar a disponibilidade e as condições.', '', ''),
  ('newsletter.title', 'Título da newsletter', '', 'Regista-te para novidades.', '', '')
ON CONFLICT (section_key) DO NOTHING;

-- Garante que existe a linha única de definições para o back office editar
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.site_settings) THEN
    INSERT INTO public.site_settings (phone, email, address, location)
    VALUES ('', '', '', '');
  END IF;
END $$;


-- ============================================================
-- 11. PRIMEIRO ADMINISTRADOR
-- ============================================================
-- 1) Criar a conta em /login (ou no painel Authentication do Supabase).
-- 2) Descomentar a linha seguinte, trocar o email e correr só essa linha:
--
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'o-teu-email@exemplo.pt';
--
-- O primeiro admin é o único passo manual: a partir daí, o back office
-- (/admin) fica acessível com esse login.


-- ============================================================
-- 12. RECARREGAR O SCHEMA DO POSTGREST
-- ============================================================
NOTIFY pgrst, 'reload schema';

SELECT '✅ INSTALAÇÃO COMPLETA — schema, políticas, funções e permissões prontos!' AS resultado;
