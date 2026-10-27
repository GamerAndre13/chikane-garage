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

-- ============================================================================
--  LOJA (ETAPA 1)
-- ============================================================================
--  Tabelas, políticas e funções da loja. Aplicar este ficheiro completo no
--  editor SQL do Supabase antes de ativar a loja em produção.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Marcas (filtro da loja)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT DEFAULT '',
  position INT DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. Categorias de produto (com subcategorias)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  parent_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  image_url TEXT DEFAULT '',
  position INT DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. Produtos (preco COM IVA incluido)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  short_description TEXT DEFAULT '',
  description TEXT DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  compare_at_price NUMERIC,
  vat_rate NUMERIC NOT NULL DEFAULT 23,
  weight_grams INT NOT NULL DEFAULT 0,
  length_mm INT,
  width_mm INT,
  height_mm INT,
  sku TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  stock_mode TEXT DEFAULT 'managed',
  low_stock_threshold INT NOT NULL DEFAULT 3,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_new BOOLEAN NOT NULL DEFAULT false,
  meta_title TEXT DEFAULT '',
  meta_description TEXT DEFAULT '',
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT products_status_check CHECK (status IN ('draft','active','archived')),
  CONSTRAINT products_stock_mode_check CHECK (stock_mode IN ('managed','unlimited','on_request'))
);

-- ----------------------------------------------------------------------------
-- 4. Variantes (cor e/ou tamanho; todos os produtos tem pelo menos uma)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  option1_name TEXT DEFAULT '',
  option1_value TEXT DEFAULT '',
  option2_name TEXT DEFAULT '',
  option2_value TEXT DEFAULT '',
  sku TEXT DEFAULT '',
  price_delta NUMERIC NOT NULL DEFAULT 0,
  stock_quantity INT NOT NULL DEFAULT 0,
  weight_grams INT,
  position INT DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. Fotografias dos produtos (ficheiros no Cloudflare R2)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INT DEFAULT 0,
  alt_text TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 6. Compatibilidade com viaturas ("serve nesta viatura")
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_compatibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year_from INT,
  year_to INT,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 7. Carrinho (apenas clientes com conta; convidados usam carrinho no browser)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT carts_status_check CHECK (status IN ('open','converted','abandoned'))
);

CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT cart_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT cart_items_unique UNIQUE (cart_id, variant_id)
);

-- ----------------------------------------------------------------------------
-- 8. Encomendas
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  access_token TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT DEFAULT '',
  nif TEXT DEFAULT '',
  shipping_name TEXT DEFAULT '',
  shipping_line1 TEXT DEFAULT '',
  shipping_line2 TEXT DEFAULT '',
  shipping_city TEXT DEFAULT '',
  shipping_postal_code TEXT DEFAULT '',
  shipping_country TEXT DEFAULT 'PT',
  shipping_phone TEXT DEFAULT '',
  billing_same_as_shipping BOOLEAN NOT NULL DEFAULT true,
  billing_name TEXT DEFAULT '',
  billing_line1 TEXT DEFAULT '',
  billing_line2 TEXT DEFAULT '',
  billing_city TEXT DEFAULT '',
  billing_postal_code TEXT DEFAULT '',
  billing_country TEXT DEFAULT 'PT',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount_total NUMERIC NOT NULL DEFAULT 0,
  shipping_total NUMERIC NOT NULL DEFAULT 0,
  vat_total NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  coupon_id UUID,
  coupon_code TEXT DEFAULT '',
  shipping_zone_id UUID,
  shipping_rate_name TEXT DEFAULT '',
  shipping_weight_grams INT DEFAULT 0,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
  payment_provider TEXT DEFAULT '',
  payment_reference TEXT DEFAULT '',
  paid_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending_payment',
  tracking_number TEXT DEFAULT '',
  tracking_url TEXT DEFAULT '',
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  customer_note TEXT DEFAULT '',
  admin_note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT orders_payment_method_check CHECK (payment_method IS NULL OR payment_method IN ('card','mb_way','multibanco')),
  CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('pending','paid','failed','refunded','partially_refunded')),
  CONSTRAINT orders_status_check CHECK (status IN ('pending_payment','paid','preparing','shipped','delivered','cancelled','refunded','returned'))
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  variant_name TEXT DEFAULT '',
  sku TEXT DEFAULT '',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  quantity INT NOT NULL DEFAULT 1,
  vat_rate NUMERIC NOT NULL DEFAULT 23,
  line_total NUMERIC NOT NULL DEFAULT 0,
  weight_grams INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT order_items_quantity_check CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 9. Moradas do cliente
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT DEFAULT '',
  name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  line1 TEXT DEFAULT '',
  line2 TEXT DEFAULT '',
  city TEXT DEFAULT '',
  postal_code TEXT DEFAULT '',
  country TEXT DEFAULT 'PT',
  is_default_shipping BOOLEAN NOT NULL DEFAULT false,
  is_default_billing BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 10. Portes - zonas e tabelas por peso
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shipping_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country_codes TEXT NOT NULL,
  postal_code_from TEXT DEFAULT '',
  postal_code_to TEXT DEFAULT '',
  position INT DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shipping_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES public.shipping_zones(id) ON DELETE CASCADE,
  name TEXT DEFAULT '',
  weight_from_grams INT NOT NULL DEFAULT 0,
  weight_to_grams INT,
  price NUMERIC NOT NULL DEFAULT 0,
  delivery_days_min INT,
  delivery_days_max INT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 11. Cupoes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  discount_type TEXT NOT NULL DEFAULT 'percent',
  discount_value NUMERIC NOT NULL DEFAULT 0,
  min_order_total NUMERIC DEFAULT 0,
  max_uses INT,
  max_uses_per_customer INT DEFAULT 1,
  uses_count INT NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  applies_to TEXT DEFAULT 'all',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT coupons_discount_type_check CHECK (discount_type IN ('percent','fixed','free_shipping')),
  CONSTRAINT coupons_applies_to_check CHECK (applies_to IN ('all','categories','products'))
);

CREATE TABLE IF NOT EXISTS public.coupon_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT DEFAULT '',
  discount_total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- As encomendas são declaradas antes dos cupões e das zonas de envio.
-- Adiar estas chaves evita referências a tabelas que ainda não existem e
-- mantém a aplicação repetida do esquema segura.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass AND conname = 'orders_coupon_id_fkey'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_coupon_id_fkey
      FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass AND conname = 'orders_shipping_zone_id_fkey'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_shipping_zone_id_fkey
      FOREIGN KEY (shipping_zone_id) REFERENCES public.shipping_zones(id) ON DELETE SET NULL;
  END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- 12. Stock - movimentos e reservas durante o pagamento
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  delta INT NOT NULL,
  reason TEXT NOT NULL DEFAULT 'adjustment',
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  note TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT stock_movements_reason_check CHECK (reason IN ('sale','return','adjustment','restock','cancel'))
);

CREATE TABLE IF NOT EXISTS public.stock_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  reference TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT stock_holds_quantity_check CHECK (quantity > 0)
);

-- ----------------------------------------------------------------------------
-- 13. "Avisar-me quando chegar" e registo de emails
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.back_in_stock_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT back_in_stock_unique UNIQUE (email, variant_id)
);

CREATE TABLE IF NOT EXISTS public.email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email TEXT NOT NULL,
  subject TEXT DEFAULT '',
  template TEXT DEFAULT '',
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'sent',
  error TEXT DEFAULT '',
  provider_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT email_log_status_check CHECK (status IN ('sent','failed'))
);

-- ----------------------------------------------------------------------------
-- 14. Devolucoes (Etapa 3 - ja especificado)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.return_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  reason TEXT DEFAULT '',
  fault TEXT DEFAULT 'customer',
  status TEXT DEFAULT 'requested',
  refund_total NUMERIC NOT NULL DEFAULT 0,
  return_tracking TEXT DEFAULT '',
  admin_note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT return_requests_fault_check CHECK (fault IN ('customer','shop')),
  CONSTRAINT return_requests_status_check CHECK (status IN ('requested','approved','received','refunded','rejected'))
);

CREATE TABLE IF NOT EXISTS public.return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES public.return_requests(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  condition TEXT DEFAULT '',
  restock BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT return_items_quantity_check CHECK (quantity > 0)
);

-- ----------------------------------------------------------------------------
-- 15. Definicoes da loja (uma unica linha, editavel no backoffice)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shop_settings (
  id INT PRIMARY KEY DEFAULT 1,
  free_shipping_above NUMERIC NOT NULL DEFAULT 0,
  stock_hold_minutes INT NOT NULL DEFAULT 15,
  low_stock_default INT NOT NULL DEFAULT 3,
  returns_days INT NOT NULL DEFAULT 14,
  support_email TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT shop_settings_single_row CHECK (id = 1)
);

-- ============================================================================
-- 16. Alteracoes a tabelas existentes
-- ============================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nif TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'PT';

ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'used';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS sale_type TEXT DEFAULT 'stock';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS brand_warranty_months INT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS delivery_estimate_days INT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS config_summary TEXT DEFAULT '';

ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS vehicles_condition_check;
ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_condition_check CHECK (condition IN ('new','used'));
ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS vehicles_sale_type_check;
ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_sale_type_check CHECK (sale_type IN ('stock','on_order'));

-- Tipo de artigo da loja: 'part' = peça/acessório que serve viaturas (aparece
-- como "Peça" no backoffice e no configurador); 'product' = produto avulso.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'product';
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_kind_check;
ALTER TABLE public.products ADD CONSTRAINT products_kind_check CHECK (kind IN ('product','part'));

-- Classificação inicial OPCIONAL (descomentar e correr UMA única vez): marca
-- como peça tudo o que já tem compatibilidade declarada ou pertence às
-- categorias de peças. Não deixa comentado: correr de novo voltaria a
-- classificar como peça qualquer artigo que tenhas mudado para "produto" no
-- backoffice.
-- UPDATE public.products SET kind = 'part'
--   WHERE kind = 'product'
--     AND (EXISTS (SELECT 1 FROM public.product_compatibility pc WHERE pc.product_id = public.products.id)
--          OR category_id IN (SELECT id FROM public.product_categories WHERE slug IN ('pecas-e-manutencao','jantes-e-pneus','extras-e-acessorios')));


-- ============================================================================
-- 17. Indices
-- ============================================================================
-- Regra: um indice por "consulta quente" (as que correm em cada visita),
-- composto quando a consulta filtra e ordena pelo mesmo caminho.

-- Montra da loja (leitura publica, corre sempre)
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_status_published ON public.products(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants(product_id, is_active);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id, position);
CREATE INDEX IF NOT EXISTS idx_product_compatibility_model ON public.product_compatibility(brand, model);
CREATE INDEX IF NOT EXISTS idx_product_compatibility_product ON public.product_compatibility(product_id);

-- Carrinho e conta
CREATE INDEX IF NOT EXISTS idx_carts_user ON public.carts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON public.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON public.addresses(user_id);

-- Encomendas (area de cliente e backoffice)
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_reference ON public.orders(payment_reference);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_history_order ON public.order_status_history(order_id);

-- Portes, cupoes e stock
CREATE INDEX IF NOT EXISTS idx_shipping_rates_zone ON public.shipping_rates(zone_id, weight_from_grams);
CREATE INDEX IF NOT EXISTS idx_coupon_uses_coupon ON public.coupon_uses(coupon_id, email);
CREATE INDEX IF NOT EXISTS idx_stock_movements_variant ON public.stock_movements(variant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_holds_variant ON public.stock_holds(variant_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_stock_holds_expires ON public.stock_holds(expires_at);
CREATE INDEX IF NOT EXISTS idx_back_in_stock_email ON public.back_in_stock_requests(email);
CREATE INDEX IF NOT EXISTS idx_return_requests_order ON public.return_requests(order_id);


-- ============================================================================
-- 18. RLS - ativar em todas as tabelas novas
-- ============================================================================
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_compatibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.back_in_stock_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 19. Politicas
-- ============================================================================
-- Nota: o servidor escreve com a chave publica (anon) e as acoes de servidor
-- revalidam sempre a sessao/papel - e o padrao do resto do projeto.
-- O comprovativo de convidado e lido pela funcao `get_order_by_token`,
-- para nunca se expor a tabela `orders` ao publico.

-- 19.1 Leitura publica (catalogo e definicoes)
DROP POLICY IF EXISTS "brands_select_public" ON public.brands;
CREATE POLICY "brands_select_public" ON public.brands FOR SELECT USING (is_active);

DROP POLICY IF EXISTS "product_categories_select_public" ON public.product_categories;
CREATE POLICY "product_categories_select_public" ON public.product_categories FOR SELECT USING (is_active);

DROP POLICY IF EXISTS "products_select_public" ON public.products;
CREATE POLICY "products_select_public" ON public.products FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "product_variants_select_public" ON public.product_variants;
CREATE POLICY "product_variants_select_public" ON public.product_variants FOR SELECT USING (is_active);

DROP POLICY IF EXISTS "product_images_select_public" ON public.product_images;
CREATE POLICY "product_images_select_public" ON public.product_images FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.status = 'active'));

DROP POLICY IF EXISTS "product_compatibility_select_public" ON public.product_compatibility;
CREATE POLICY "product_compatibility_select_public" ON public.product_compatibility FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.status = 'active'));

DROP POLICY IF EXISTS "shipping_zones_select_public" ON public.shipping_zones;
CREATE POLICY "shipping_zones_select_public" ON public.shipping_zones FOR SELECT USING (is_active);

DROP POLICY IF EXISTS "shipping_rates_select_public" ON public.shipping_rates;
CREATE POLICY "shipping_rates_select_public" ON public.shipping_rates FOR SELECT USING (is_active);

DROP POLICY IF EXISTS "shop_settings_select_public" ON public.shop_settings;
CREATE POLICY "shop_settings_select_public" ON public.shop_settings FOR SELECT USING (true);

-- 19.2 Administracao
DROP POLICY IF EXISTS "brands_admin_all" ON public.brands;
CREATE POLICY "brands_admin_all" ON public.brands FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "product_categories_admin_all" ON public.product_categories;
CREATE POLICY "product_categories_admin_all" ON public.product_categories FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "products_admin_all" ON public.products;
CREATE POLICY "products_admin_all" ON public.products FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "product_variants_admin_all" ON public.product_variants;
CREATE POLICY "product_variants_admin_all" ON public.product_variants FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "product_images_admin_all" ON public.product_images;
CREATE POLICY "product_images_admin_all" ON public.product_images FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "product_compatibility_admin_all" ON public.product_compatibility;
CREATE POLICY "product_compatibility_admin_all" ON public.product_compatibility FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "shipping_zones_admin_all" ON public.shipping_zones;
CREATE POLICY "shipping_zones_admin_all" ON public.shipping_zones FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "shipping_rates_admin_all" ON public.shipping_rates;
CREATE POLICY "shipping_rates_admin_all" ON public.shipping_rates FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "coupons_admin_all" ON public.coupons;
CREATE POLICY "coupons_admin_all" ON public.coupons FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "coupon_uses_admin_all" ON public.coupon_uses;
CREATE POLICY "coupon_uses_admin_all" ON public.coupon_uses FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "stock_movements_admin_all" ON public.stock_movements;
CREATE POLICY "stock_movements_admin_all" ON public.stock_movements FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "stock_holds_admin_all" ON public.stock_holds;
CREATE POLICY "stock_holds_admin_all" ON public.stock_holds FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "back_in_stock_admin_all" ON public.back_in_stock_requests;
CREATE POLICY "back_in_stock_admin_all" ON public.back_in_stock_requests FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "email_log_admin_all" ON public.email_log;
CREATE POLICY "email_log_admin_all" ON public.email_log FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "orders_admin_all" ON public.orders;
CREATE POLICY "orders_admin_all" ON public.orders FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "order_items_admin_all" ON public.order_items;
CREATE POLICY "order_items_admin_all" ON public.order_items FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "order_history_admin_all" ON public.order_status_history;
CREATE POLICY "order_history_admin_all" ON public.order_status_history FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "addresses_admin_all" ON public.addresses;
CREATE POLICY "addresses_admin_all" ON public.addresses FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "return_requests_admin_all" ON public.return_requests;
CREATE POLICY "return_requests_admin_all" ON public.return_requests FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "return_items_admin_all" ON public.return_items;
CREATE POLICY "return_items_admin_all" ON public.return_items FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "shop_settings_admin_all" ON public.shop_settings;
CREATE POLICY "shop_settings_admin_all" ON public.shop_settings FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 19.3 Carrinho e moradas (apenas o proprio)
DROP POLICY IF EXISTS "carts_select_own" ON public.carts;
CREATE POLICY "carts_select_own" ON public.carts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "carts_insert_own" ON public.carts;
CREATE POLICY "carts_insert_own" ON public.carts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "carts_update_own" ON public.carts;
CREATE POLICY "carts_update_own" ON public.carts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "carts_delete_own" ON public.carts;
CREATE POLICY "carts_delete_own" ON public.carts FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "cart_items_select_own" ON public.cart_items;
CREATE POLICY "cart_items_select_own" ON public.cart_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_id AND c.user_id = auth.uid()));
DROP POLICY IF EXISTS "cart_items_insert_own" ON public.cart_items;
CREATE POLICY "cart_items_insert_own" ON public.cart_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_id AND c.user_id = auth.uid()));
DROP POLICY IF EXISTS "cart_items_update_own" ON public.cart_items;
CREATE POLICY "cart_items_update_own" ON public.cart_items FOR UPDATE USING (EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_id AND c.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_id AND c.user_id = auth.uid()));
DROP POLICY IF EXISTS "cart_items_delete_own" ON public.cart_items;
CREATE POLICY "cart_items_delete_own" ON public.cart_items FOR DELETE USING (EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_id AND c.user_id = auth.uid()));

DROP POLICY IF EXISTS "addresses_select_own" ON public.addresses;
CREATE POLICY "addresses_select_own" ON public.addresses FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "addresses_insert_own" ON public.addresses;
CREATE POLICY "addresses_insert_own" ON public.addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "addresses_update_own" ON public.addresses;
CREATE POLICY "addresses_update_own" ON public.addresses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "addresses_delete_own" ON public.addresses;
CREATE POLICY "addresses_delete_own" ON public.addresses FOR DELETE USING (auth.uid() = user_id);

-- 19.4 Encomendas
-- Criadas pelo servidor (que usa a chave publica), por isso o INSERT e aberto.
-- O risco e o mesmo que ja existe com `contact_requests`/`test_drives`, e
-- mitiga-se porque a encomenda so fica "paga" com confirmacao de pagamento.
DROP POLICY IF EXISTS "orders_insert_public" ON public.orders;
CREATE POLICY "orders_insert_public" ON public.orders FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
CREATE POLICY "orders_select_own" ON public.orders FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "order_items_insert_public" ON public.order_items;
CREATE POLICY "order_items_insert_public" ON public.order_items FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "order_items_select_own" ON public.order_items;
CREATE POLICY "order_items_select_own" ON public.order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

DROP POLICY IF EXISTS "order_history_insert_public" ON public.order_status_history;
CREATE POLICY "order_history_insert_public" ON public.order_status_history FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "order_history_select_own" ON public.order_status_history;
CREATE POLICY "order_history_select_own" ON public.order_status_history FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

DROP POLICY IF EXISTS "coupon_uses_insert_public" ON public.coupon_uses;
CREATE POLICY "coupon_uses_insert_public" ON public.coupon_uses FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "coupon_uses_select_own" ON public.coupon_uses;
CREATE POLICY "coupon_uses_select_own" ON public.coupon_uses FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "stock_movements_insert_public" ON public.stock_movements;
CREATE POLICY "stock_movements_insert_public" ON public.stock_movements FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "stock_holds_insert_public" ON public.stock_holds;
CREATE POLICY "stock_holds_insert_public" ON public.stock_holds FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "back_in_stock_insert_public" ON public.back_in_stock_requests;
CREATE POLICY "back_in_stock_insert_public" ON public.back_in_stock_requests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "email_log_insert_public" ON public.email_log;
CREATE POLICY "email_log_insert_public" ON public.email_log FOR INSERT WITH CHECK (true);

-- 19.5 Devolucoes (cliente ve as suas; escrita pelo servidor)
DROP POLICY IF EXISTS "return_requests_insert_public" ON public.return_requests;
CREATE POLICY "return_requests_insert_public" ON public.return_requests FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "return_requests_select_own" ON public.return_requests;
CREATE POLICY "return_requests_select_own" ON public.return_requests FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "return_items_insert_public" ON public.return_items;
CREATE POLICY "return_items_insert_public" ON public.return_items FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "return_items_select_own" ON public.return_items;
CREATE POLICY "return_items_select_own" ON public.return_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.return_requests r WHERE r.id = return_id AND r.user_id = auth.uid()));

-- ============================================================================
-- 20. Permissoes (RLS continua a mandar; isto so abre a porta)
-- ============================================================================
GRANT SELECT ON public.brands, public.product_categories, public.products, public.product_variants, public.product_images, public.product_compatibility, public.shipping_zones, public.shipping_rates, public.shop_settings TO anon, authenticated;

GRANT INSERT ON public.orders, public.order_items, public.order_status_history, public.stock_movements, public.stock_holds, public.coupon_uses, public.back_in_stock_requests, public.email_log, public.return_requests, public.return_items TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.carts, public.cart_items, public.addresses TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brands, public.product_categories, public.products, public.product_variants, public.product_images, public.product_compatibility, public.shipping_zones, public.shipping_rates, public.coupons, public.coupon_uses, public.stock_movements, public.stock_holds, public.back_in_stock_requests, public.email_log, public.return_requests, public.return_items, public.shop_settings, public.orders, public.order_items, public.order_status_history TO authenticated;


-- ============================================================================
-- 21. Trigger de `updated_at`
-- ============================================================================
-- Se o `setup.sql` ja tiver uma funcao equivalente, usa-se essa e este bloco sai.
CREATE OR REPLACE FUNCTION public.shop_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['brands','product_categories','products','product_variants','carts','cart_items','orders','addresses','shipping_zones','shipping_rates','coupons','return_requests','shop_settings']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'trg_' || t || '_updated_at', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.shop_touch_updated_at()', 'trg_' || t || '_updated_at', t);
  END LOOP;
END $$;


-- ============================================================================
-- 22. Funcoes e RPC
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1;

-- Numero da encomenda: CG-AAAA-0001 (a sequencia continua entre anos,
-- para nao repetir numeros).
CREATE OR REPLACE FUNCTION public.next_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq BIGINT;
  v_ano TEXT;
BEGIN
  v_seq := nextval('public.order_number_seq');
  v_ano := to_char(NOW(), 'YYYY');
  RETURN 'CG-' || v_ano || '-' || lpad(v_seq::text, 4, '0');
END;
$$;

-- Definições da loja numa só chamada.
CREATE OR REPLACE FUNCTION public.get_shop_settings()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(s) FROM public.shop_settings s WHERE s.id = 1;
$$;

-- Comprovativo de encomenda por link seguro (convidados incluídos).
CREATE OR REPLACE FUNCTION public.get_order_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE access_token = p_token;
  IF v_order.id IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'order', jsonb_build_object(
      'order_number', v_order.order_number,
      'status', v_order.status,
      'payment_status', v_order.payment_status,
      'payment_method', v_order.payment_method,
      'subtotal', v_order.subtotal,
      'discount_total', v_order.discount_total,
      'shipping_total', v_order.shipping_total,
      'vat_total', v_order.vat_total,
      'total', v_order.total,
      'customer_email', v_order.customer_email,
      'created_at', v_order.created_at
    ),
    'items', COALESCE((
      SELECT jsonb_agg(to_jsonb(i) ORDER BY i.created_at)
      FROM public.order_items i
      WHERE i.order_id = v_order.id
    ), '[]'::jsonb)
  );
END;
$$;

-- Stock disponivel = stock - reservas ativas.
CREATE OR REPLACE FUNCTION public.available_stock(p_variant_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(0,
    COALESCE((SELECT stock_quantity FROM public.product_variants WHERE id = p_variant_id), 0)
    - COALESCE((SELECT SUM(quantity) FROM public.stock_holds WHERE variant_id = p_variant_id AND expires_at > NOW()), 0)
  )::int;
$$;

-- Reserva temporaria durante o pagamento (minutos vem das definicoes da loja).
CREATE OR REPLACE FUNCTION public.create_stock_hold(p_variant_id UUID, p_quantity INT, p_reference TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_minutes INT := 15;
  v_qty INT;
  v_avail INT;
  v_id UUID;
BEGIN
  v_qty := GREATEST(1, COALESCE(p_quantity, 1));
  SELECT COALESCE(stock_hold_minutes, 15) INTO v_minutes FROM public.shop_settings WHERE id = 1;
  v_avail := public.available_stock(p_variant_id);
  IF v_avail < v_qty THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Sem stock suficiente', 'available', v_avail);
  END IF;
  INSERT INTO public.stock_holds (variant_id, quantity, reference, expires_at)
  VALUES (p_variant_id, v_qty, p_reference, NOW() + (v_minutes || ' minutes')::interval)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok', true, 'hold_id', v_id, 'expires_in_minutes', v_minutes);
END;
$$;

-- Limpeza de reservas expiradas (chamar ao abrir o checkout ou por cron).
CREATE OR REPLACE FUNCTION public.release_expired_stock_holds()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n INT;
BEGIN
  DELETE FROM public.stock_holds WHERE expires_at < NOW() - INTERVAL '1 day';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

-- Validacao de cupao (devolve sempre um objeto, nunca rebenta).
CREATE OR REPLACE FUNCTION public.validate_coupon(p_code TEXT, p_subtotal NUMERIC, p_email TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.coupons;
  v_uses INT;
  v_my_uses INT;
  v_discount NUMERIC := 0;
  v_free BOOLEAN := false;
BEGIN
  SELECT * INTO c FROM public.coupons WHERE upper(code) = upper(trim(p_code)) AND is_active;
  IF c.id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Cupao nao encontrado ou inativo');
  END IF;
  IF c.starts_at IS NOT NULL AND NOW() < c.starts_at THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Cupao ainda nao esta valido');
  END IF;
  IF c.ends_at IS NOT NULL AND NOW() > c.ends_at THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Cupao expirado');
  END IF;
  IF COALESCE(p_subtotal, 0) < COALESCE(c.min_order_total, 0) THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Valor minimo nao atingido');
  END IF;
  IF c.max_uses IS NOT NULL THEN
    SELECT COUNT(*) INTO v_uses FROM public.coupon_uses WHERE coupon_id = c.id;
    IF v_uses >= c.max_uses THEN
      RETURN jsonb_build_object('valid', false, 'reason', 'Cupao esgotado');
    END IF;
  END IF;
  IF p_email IS NOT NULL AND c.max_uses_per_customer IS NOT NULL THEN
    SELECT COUNT(*) INTO v_my_uses FROM public.coupon_uses WHERE coupon_id = c.id AND lower(email) = lower(p_email);
    IF v_my_uses >= c.max_uses_per_customer THEN
      RETURN jsonb_build_object('valid', false, 'reason', 'Ja usaste este cupao');
    END IF;
  END IF;
  IF c.discount_type = 'percent' THEN
    v_discount := round(COALESCE(p_subtotal, 0) * c.discount_value / 100, 2);
  ELSIF c.discount_type = 'fixed' THEN
    v_discount := LEAST(c.discount_value, COALESCE(p_subtotal, 0));
  ELSE
    v_free := true;
  END IF;
  RETURN jsonb_build_object('valid', true, 'coupon_id', c.id, 'code', c.code, 'discount', v_discount, 'free_shipping', v_free);
END;
$$;

-- Portes por zona e peso. Devolve sempre um objeto:
--   { found, on_request, zone_id, zone, rate, price, delivery_days_min, delivery_days_max }
-- `on_request = true` quando o peso passa a ultima faixa: a app pede orcamento.
CREATE OR REPLACE FUNCTION public.shipping_quote(p_country TEXT, p_postal TEXT, p_weight_grams INT, p_subtotal NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  z public.shipping_zones;
  r public.shipping_rates;
  v_price NUMERIC;
  v_free NUMERIC := 0;
  v_peso INT;
BEGIN
  v_peso := GREATEST(0, COALESCE(p_weight_grams, 0));

  SELECT * INTO z
  FROM public.shipping_zones sz
  WHERE sz.is_active
    AND (',' || replace(upper(sz.country_codes), ' ', '') || ',') LIKE '%,' || upper(COALESCE(p_country, 'PT')) || ',%'
    AND (
      COALESCE(sz.postal_code_from, '') = ''
      OR (COALESCE(p_postal, '') <> '' AND p_postal >= sz.postal_code_from AND p_postal <= sz.postal_code_to)
    )
  ORDER BY (COALESCE(sz.postal_code_from, '') <> '') DESC, sz.position
  LIMIT 1;

  IF z.id IS NULL THEN
    RETURN jsonb_build_object('found', false, 'on_request', true, 'price', 0);
  END IF;

  SELECT * INTO r
  FROM public.shipping_rates sr
  WHERE sr.zone_id = z.id
    AND sr.is_active
    AND v_peso >= sr.weight_from_grams
    AND (sr.weight_to_grams IS NULL OR v_peso <= sr.weight_to_grams)
  ORDER BY sr.weight_from_grams
  LIMIT 1;

  IF r.id IS NULL THEN
    RETURN jsonb_build_object('found', true, 'on_request', true, 'zone_id', z.id, 'zone', z.name, 'price', 0);
  END IF;

  v_price := r.price;

  SELECT COALESCE(free_shipping_above, 0) INTO v_free FROM public.shop_settings WHERE id = 1;
  IF COALESCE(v_free, 0) > 0 AND COALESCE(p_subtotal, 0) >= v_free THEN
    v_price := 0;
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'on_request', false,
    'zone_id', z.id,
    'zone', z.name,
    'rate', r.name,
    'price', v_price,
    'delivery_days_min', r.delivery_days_min,
    'delivery_days_max', r.delivery_days_max
  );
END;
$$;

-- Confirmacao de pagamento (webhook). A rota que a chama TEM DE SER protegida
-- por segredo do fornecedor antes de ir a producao - ver docs/PLANO_ETAPA_1.md.
CREATE OR REPLACE FUNCTION public.mark_order_paid(p_reference TEXT, p_provider TEXT DEFAULT '')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  UPDATE public.orders
  SET payment_status = 'paid',
      status = 'paid',
      paid_at = NOW(),
      payment_provider = COALESCE(NULLIF(p_provider, ''), payment_provider),
      updated_at = NOW()
  WHERE payment_reference = p_reference
    AND payment_status = 'pending'
    AND status = 'pending_payment'
    AND (NULLIF(p_provider, '') IS NULL OR payment_provider = p_provider)
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.order_status_history (order_id, status, note)
  VALUES (v_id, 'paid', 'Pagamento confirmado');

  RETURN true;
END;
$$;

-- ============================================================================
-- CRIACAO DA ENCOMENDA (a peca central)
-- ============================================================================
-- Entradas:
--   p_items          JSONB  -> [{"variant_id":"...","quantity":2}, ...]
--   p_customer       JSONB  -> dados do cliente + morada + hold_reference
--   p_payment_method TEXT   -> 'card' | 'mb_way' | 'multibanco'
--   p_coupon_code    TEXT   -> opcional
--
-- O preco NUNCA vem do browser: e lido da base de dados linha a linha.
-- Devolve: { order_id, order_number, access_token, subtotal, discount_total,
--            shipping_total, vat_total, total, on_request_shipping }
--
-- TODO antes de producao: testar com carrinho misto, stock a 0, cupao expirado
-- e peso acima da ultima faixa (portes a orcamento).
CREATE OR REPLACE FUNCTION public.place_order(
  p_items JSONB,
  p_customer JSONB,
  p_payment_method TEXT,
  p_coupon_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line JSONB;
  v_v RECORD;
  v_qty INT;
  v_unit NUMERIC;
  v_line_total NUMERIC;
  v_subtotal NUMERIC := 0;
  v_vat NUMERIC := 0;
  v_weight INT := 0;
  v_items JSONB := '[]'::jsonb;
  v_quote JSONB;
  v_shipping NUMERIC := 0;
  v_on_request BOOLEAN := false;
  v_coupon JSONB;
  v_discount NUMERIC := 0;
  v_coupon_id UUID := NULL;
  v_total NUMERIC;
  v_order_id UUID := gen_random_uuid();
  v_number TEXT;
  v_token TEXT;
  v_avail INT;
  v_country TEXT;
  v_postal TEXT;
  v_email TEXT;
  v_ref TEXT;
  v_user_id UUID;
  v_hist_item JSONB;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Carrinho vazio';
  END IF;
  IF jsonb_array_length(p_items) > 50 OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_items) AS item(value)
    WHERE COALESCE((value->>'quantity')::int, 0) < 1 OR COALESCE((value->>'quantity')::int, 0) > 99
  ) OR EXISTS (
    SELECT 1 FROM (
      SELECT value->>'variant_id' AS variant_id
      FROM jsonb_array_elements(p_items) AS item(value)
      GROUP BY value->>'variant_id' HAVING count(*) > 1
    ) duplicated
  ) THEN
    RAISE EXCEPTION 'Linhas ou quantidades inválidas';
  END IF;
  IF COALESCE(p_payment_method, '') NOT IN ('card', 'mb_way', 'multibanco')
    OR length(trim(COALESCE(p_customer->>'customer_name', ''))) < 2
    OR length(trim(COALESCE(p_customer->>'customer_name', ''))) > 120
    OR lower(COALESCE(p_customer->>'customer_email', '')) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    OR length(COALESCE(p_customer->>'customer_phone', '')) < 6
    OR length(COALESCE(p_customer->>'shipping_line1', '')) < 3
    OR length(COALESCE(p_customer->>'shipping_city', '')) < 2
    OR length(COALESCE(p_customer->>'shipping_postal_code', '')) < 3 THEN
    RAISE EXCEPTION 'Dados de cliente ou pagamento inválidos';
  END IF;

  v_country := COALESCE(NULLIF(p_customer->>'shipping_country', ''), 'PT');
  v_postal := COALESCE(p_customer->>'shipping_postal_code', '');
  v_email := lower(COALESCE(p_customer->>'customer_email', ''));
  v_user_id := NULLIF(p_customer->>'user_id', '')::uuid;
  v_ref := COALESCE(p_customer->>'hold_reference', '');

  -- 1) Recolher linhas com precos vindos da base de dados
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := GREATEST(1, COALESCE((v_line->>'quantity')::int, 1));

    SELECT pv.id AS variant_id,
           pv.name AS variant_name,
           pv.price_delta,
           pv.weight_grams AS variant_weight,
           p.id AS prod_id,
           p.name AS product_name,
           p.price,
           p.vat_rate,
           p.weight_grams AS product_weight,
           p.sku,
           p.stock_mode
    INTO v_v
    FROM public.product_variants pv
    JOIN public.products p ON p.id = pv.product_id
    WHERE pv.id = (v_line->>'variant_id')::uuid
      AND pv.is_active
      AND p.status = 'active'
    FOR UPDATE OF pv;

    IF v_v.variant_id IS NULL THEN
      RAISE EXCEPTION 'Artigo indisponivel';
    END IF;

    IF v_v.stock_mode = 'managed' THEN
      v_avail := public.available_stock(v_v.variant_id);
      IF v_avail < v_qty THEN
        RAISE EXCEPTION 'Stock insuficiente para %', v_v.product_name;
      END IF;
    END IF;

    v_unit := v_v.price + COALESCE(v_v.price_delta, 0);
    v_line_total := v_unit * v_qty;
    v_subtotal := v_subtotal + v_line_total;
    v_vat := v_vat + (v_line_total - (v_line_total / (1 + v_v.vat_rate / 100)));
    v_weight := v_weight + COALESCE(NULLIF(v_v.variant_weight, 0), v_v.product_weight, 0) * v_qty;

    v_items := v_items || jsonb_build_object(
      'variant_id', v_v.variant_id,
      'product_id', v_v.prod_id,
      'product_name', v_v.product_name,
      'variant_name', v_v.variant_name,
      'sku', v_v.sku,
      'unit_price', v_unit,
      'quantity', v_qty,
      'vat_rate', v_v.vat_rate,
      'line_total', v_line_total,
      'weight_grams', COALESCE(NULLIF(v_v.variant_weight, 0), v_v.product_weight, 0),
      'stock_mode', v_v.stock_mode
    );
  END LOOP;

  -- 2) Portes
  v_quote := public.shipping_quote(v_country, v_postal, v_weight, v_subtotal);
  v_shipping := COALESCE((v_quote->>'price')::numeric, 0);
  v_on_request := COALESCE((v_quote->>'on_request')::boolean, false) OR NOT COALESCE((v_quote->>'found')::boolean, false);
  IF v_on_request THEN
    v_shipping := 0;
  END IF;

  -- 3) Cupao
  IF p_coupon_code IS NOT NULL AND length(trim(p_coupon_code)) > 0 THEN
    v_coupon := public.validate_coupon(p_coupon_code, v_subtotal, v_email);
    IF COALESCE((v_coupon->>'valid')::boolean, false) THEN
      v_discount := COALESCE((v_coupon->>'discount')::numeric, 0);
      v_coupon_id := NULLIF(v_coupon->>'coupon_id', '')::uuid;
      IF COALESCE((v_coupon->>'free_shipping')::boolean, false) THEN
        v_shipping := 0;
      END IF;
    ELSE
      RAISE EXCEPTION 'Cupão inválido ou expirado';
    END IF;
  END IF;

  v_total := GREATEST(0, v_subtotal - v_discount) + v_shipping;
  v_number := public.next_order_number();
  v_token := md5(gen_random_uuid()::text || clock_timestamp()::text || v_number);

  -- 4) Encomenda
  INSERT INTO public.orders (
    id, order_number, access_token, user_id,
    customer_name, customer_email, customer_phone, nif,
    shipping_name, shipping_line1, shipping_line2, shipping_city, shipping_postal_code, shipping_country, shipping_phone,
    billing_same_as_shipping, billing_name, billing_line1, billing_line2, billing_city, billing_postal_code, billing_country,
    subtotal, discount_total, shipping_total, vat_total, total,
    coupon_id, coupon_code, shipping_zone_id, shipping_rate_name, shipping_weight_grams,
    payment_method, payment_status, status, customer_note
  ) VALUES (
    v_order_id, v_number, v_token, v_user_id,
    COALESCE(p_customer->>'customer_name', ''), COALESCE(p_customer->>'customer_email', ''), COALESCE(p_customer->>'customer_phone', ''), COALESCE(p_customer->>'nif', ''),
    COALESCE(p_customer->>'shipping_name', ''), COALESCE(p_customer->>'shipping_line1', ''), COALESCE(p_customer->>'shipping_line2', ''), COALESCE(p_customer->>'shipping_city', ''), COALESCE(p_customer->>'shipping_postal_code', ''), v_country, COALESCE(p_customer->>'shipping_phone', ''),
    COALESCE((p_customer->>'billing_same_as_shipping')::boolean, true),
    COALESCE(p_customer->>'billing_name', ''), COALESCE(p_customer->>'billing_line1', ''), COALESCE(p_customer->>'billing_line2', ''), COALESCE(p_customer->>'billing_city', ''), COALESCE(p_customer->>'billing_postal_code', ''), COALESCE(NULLIF(p_customer->>'billing_country', ''), 'PT'),
    round(v_subtotal, 2), round(v_discount, 2), round(v_shipping, 2), round(v_vat, 2), round(v_total, 2),
    v_coupon_id, COALESCE(p_coupon_code, ''), NULLIF(v_quote->>'zone_id', '')::uuid, COALESCE(v_quote->>'rate', ''), v_weight,
    p_payment_method, 'pending', 'pending_payment', COALESCE(p_customer->>'customer_note', '')
  );

  -- 5) Linhas + stock
  FOR v_hist_item IN SELECT * FROM jsonb_array_elements(v_items) LOOP
    INSERT INTO public.order_items (
      order_id, product_id, variant_id, product_name, variant_name, sku,
      unit_price, quantity, vat_rate, line_total, weight_grams
    ) VALUES (
      v_order_id,
      (v_hist_item->>'product_id')::uuid,
      (v_hist_item->>'variant_id')::uuid,
      v_hist_item->>'product_name',
      v_hist_item->>'variant_name',
      v_hist_item->>'sku',
      (v_hist_item->>'unit_price')::numeric,
      (v_hist_item->>'quantity')::int,
      (v_hist_item->>'vat_rate')::numeric,
      (v_hist_item->>'line_total')::numeric,
      (v_hist_item->>'weight_grams')::int
    );

    IF v_hist_item->>'stock_mode' = 'managed' THEN
      UPDATE public.product_variants
      SET stock_quantity = GREATEST(0, stock_quantity - (v_hist_item->>'quantity')::int),
          updated_at = NOW()
      WHERE id = (v_hist_item->>'variant_id')::uuid;

      INSERT INTO public.stock_movements (variant_id, delta, reason, order_id, note)
      VALUES ((v_hist_item->>'variant_id')::uuid, -((v_hist_item->>'quantity')::int), 'sale', v_order_id, v_number);
    END IF;
  END LOOP;

  -- 6) Reservas consumidas por esta compra
  IF v_ref <> '' THEN
    DELETE FROM public.stock_holds WHERE reference = v_ref;
  END IF;

  -- 7) Historico
  INSERT INTO public.order_status_history (order_id, status, note)
  VALUES (v_order_id, 'pending_payment', 'Encomenda criada');

  IF v_coupon_id IS NOT NULL THEN
    INSERT INTO public.coupon_uses (coupon_id, order_id, user_id, email, discount_total)
    VALUES (v_coupon_id, v_order_id, v_user_id, v_email, round(v_discount, 2));

    UPDATE public.coupons SET uses_count = uses_count + 1, updated_at = NOW() WHERE id = v_coupon_id;
  END IF;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_number,
    'access_token', v_token,
    'subtotal', round(v_subtotal, 2),
    'discount_total', round(v_discount, 2),
    'shipping_total', round(v_shipping, 2),
    'vat_total', round(v_vat, 2),
    'total', round(v_total, 2),
    'on_request_shipping', v_on_request
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.next_order_number() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_shop_settings() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.available_stock(UUID) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_stock_hold(UUID, INT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_expired_stock_holds() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_coupon(TEXT, NUMERIC, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shipping_quote(TEXT, TEXT, INT, NUMERIC) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_order_paid(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_order(JSONB, JSONB, TEXT, TEXT) TO anon, authenticated;

-- ============================================================================
-- 23. Conteudo inicial (idempotente)
-- ============================================================================
-- Estas linhas sao so ponto de partida: o dono edita tudo no backoffice.
-- Os valores dos portes sao a base combinada; podem ser afinados a qualquer altura.

-- 23.1 Definicoes da loja (linha unica)
INSERT INTO public.shop_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 23.2 Categorias principais (as 6 decididas)
INSERT INTO public.product_categories (slug, name, position) VALUES
  ('extras-e-acessorios', 'Extras e acessórios', 1),
  ('detailing-e-limpeza', 'Detailing e limpeza', 2),
  ('pecas-e-manutencao', 'Peças e manutenção', 3),
  ('jantes-e-pneus', 'Jantes e pneus', 4),
  ('merch-e-presentes', 'Merch e presentes', 5),
  ('eletronica-e-som', 'Eletrónica e som', 6)
ON CONFLICT (slug) DO NOTHING;

-- 23.3 Subcategorias (exemplos; acrescentar/remover no backoffice)
INSERT INTO public.product_categories (slug, name, parent_id, position)
SELECT v.slug, v.name, (SELECT id FROM public.product_categories WHERE slug = v.parent), v.position
FROM (VALUES
  ('tapetes', 'Tapetes', 'extras-e-acessorios', 1),
  ('capas-e-protecoes', 'Capas e proteções', 'extras-e-acessorios', 2),
  ('organizacao', 'Organização', 'extras-e-acessorios', 3),
  ('iluminacao', 'Iluminação', 'extras-e-acessorios', 4),
  ('lavagem', 'Lavagem', 'detailing-e-limpeza', 1),
  ('ceras-e-polidores', 'Ceras e polidores', 'detailing-e-limpeza', 2),
  ('interior', 'Interior', 'detailing-e-limpeza', 3),
  ('panos-e-acessorios', 'Panos e acessórios', 'detailing-e-limpeza', 4),
  ('filtros', 'Filtros', 'pecas-e-manutencao', 1),
  ('oleos-e-fluidos', 'Óleos e fluidos', 'pecas-e-manutencao', 2),
  ('travoes', 'Travões', 'pecas-e-manutencao', 3),
  ('escovas-limpa-para-brisas', 'Escovas limpa-para-brisas', 'pecas-e-manutencao', 4),
  ('jantes', 'Jantes', 'jantes-e-pneus', 1),
  ('pneus', 'Pneus', 'jantes-e-pneus', 2),
  ('tampoes-e-valvulas', 'Tampões e válvulas', 'jantes-e-pneus', 3),
  ('t-shirts', 'T-shirts', 'merch-e-presentes', 1),
  ('bones', 'Bonés', 'merch-e-presentes', 2),
  ('canecas', 'Canecas', 'merch-e-presentes', 3),
  ('cartoes-presente', 'Cartões-presente', 'merch-e-presentes', 4),
  ('autoradios', 'Autorrádios', 'eletronica-e-som', 1),
  ('colunas', 'Colunas', 'eletronica-e-som', 2),
  ('dashcams', 'Dashcams', 'eletronica-e-som', 3),
  ('suportes-e-carregadores', 'Suportes e carregadores', 'eletronica-e-som', 4)
) AS v(slug, name, parent, position)
ON CONFLICT (slug) DO NOTHING;

-- 23.4 Marcas (exemplos - apagar as que nao interessarem)
INSERT INTO public.brands (slug, name, position) VALUES
  ('chikane', 'Chikane Garage', 1),
  ('bosch', 'Bosch', 2),
  ('castrol', 'Castrol', 3),
  ('sparco', 'Sparco', 4),
  ('momo', 'Momo', 5)
ON CONFLICT (slug) DO NOTHING;

-- 23.5 Zonas de envio
--    Portugal continental: 1000-8999 · Madeira: 9000-9499 · Açores: 9500-9999
INSERT INTO public.shipping_zones (name, country_codes, postal_code_from, postal_code_to, position)
SELECT v.name, v.cc, v.pf, v.pt, v.pos
FROM (VALUES
  ('Portugal continental', 'PT', '1000', '8999', 1),
  ('Madeira', 'PT', '9000', '9499', 2),
  ('Açores', 'PT', '9500', '9999', 3),
  ('Espanha', 'ES', '', '', 4),
  ('Europa', 'AT,BE,BG,CH,CY,CZ,DE,DK,EE,FI,FR,GB,GR,HR,HU,IE,IS,IT,LI,LU,LV,LT,MT,NL,NO,PL,RO,SE,SI,SK', '', '', 5)
) AS v(name, cc, pf, pt, pos)
WHERE NOT EXISTS (SELECT 1 FROM public.shipping_zones z WHERE z.name = v.name);

-- 23.6 Portes por peso (valores base; afinam-se no backoffice)
INSERT INTO public.shipping_rates (zone_id, name, weight_from_grams, weight_to_grams, price, delivery_days_min, delivery_days_max, position)
SELECT z.id, v.name, v.wf, v.wt, v.price, v.dmin, v.dmax, v.pos
FROM (VALUES
  -- Portugal continental
  ('Portugal continental', 'até 1 kg', 0, 1000, 5.50, 2, 4, 1),
  ('Portugal continental', '1 a 5 kg', 1001, 5000, 7.50, 2, 4, 2),
  ('Portugal continental', '5 a 10 kg', 5001, 10000, 10.50, 2, 5, 3),
  ('Portugal continental', '10 a 20 kg', 10001, 20000, 14.50, 3, 6, 4),
  ('Portugal continental', '20 a 30 kg', 20001, 30000, 19.50, 3, 6, 5),
  -- Madeira
  ('Madeira', 'até 1 kg', 0, 1000, 9.50, 4, 8, 1),
  ('Madeira', '1 a 5 kg', 1001, 5000, 14.50, 4, 8, 2),
  ('Madeira', '5 a 10 kg', 5001, 10000, 19.50, 5, 10, 3),
  ('Madeira', '10 a 20 kg', 10001, 20000, 27.50, 5, 10, 4),
  ('Madeira', '20 a 30 kg', 20001, 30000, 35.00, 6, 12, 5),
  -- Acores
  ('Açores', 'até 1 kg', 0, 1000, 9.50, 4, 8, 1),
  ('Açores', '1 a 5 kg', 1001, 5000, 14.50, 4, 8, 2),
  ('Açores', '5 a 10 kg', 5001, 10000, 19.50, 5, 10, 3),
  ('Açores', '10 a 20 kg', 10001, 20000, 27.50, 5, 10, 4),
  ('Açores', '20 a 30 kg', 20001, 30000, 35.00, 6, 12, 5),
  -- Espanha
  ('Espanha', 'até 1 kg', 0, 1000, 9.90, 4, 7, 1),
  ('Espanha', '1 a 5 kg', 1001, 5000, 13.90, 4, 7, 2),
  ('Espanha', '5 a 10 kg', 5001, 10000, 18.90, 5, 9, 3),
  ('Espanha', '10 a 20 kg', 10001, 20000, 26.90, 5, 9, 4),
  ('Espanha', '20 a 30 kg', 20001, 30000, 34.90, 6, 11, 5),
  -- Europa
  ('Europa', 'até 1 kg', 0, 1000, 14.90, 5, 10, 1),
  ('Europa', '1 a 5 kg', 1001, 5000, 19.90, 5, 10, 2),
  ('Europa', '5 a 10 kg', 5001, 10000, 27.00, 6, 12, 3),
  ('Europa', '10 a 20 kg', 10001, 20000, 38.00, 6, 12, 4),
  ('Europa', '20 a 30 kg', 20001, 30000, 49.00, 7, 14, 5)
) AS v(zone_name, name, wf, wt, price, dmin, dmax, pos)
JOIN public.shipping_zones z ON z.name = v.zone_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.shipping_rates r WHERE r.zone_id = z.id AND r.name = v.name
);

-- 23.7 Produto de exemplo (opcional; apagar depois de criar os verdadeiros)
-- INSERT INTO public.products (slug, category_id, brand_id, name, short_description, price, weight_grams, sku)
-- VALUES ('tapete-borracha-universal', (SELECT id FROM public.product_categories WHERE slug = 'tapetes'), (SELECT id FROM public.brands WHERE slug = 'chikane'), 'Tapete de borracha universal', 'Tapete recortavel em borracha.', 24.90, 1200, 'CG-TAP-001')
-- ON CONFLICT (slug) DO NOTHING;


-- ============================================================================
-- 24. Seguranca e ciclo de vida de pagamentos
-- ============================================================================
-- A encomenda só é marcada como paga por um webhook autenticado no servidor.
CREATE OR REPLACE FUNCTION public.set_order_payment_reference(
  p_order_id UUID, p_access_token TEXT, p_provider TEXT, p_reference TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_provider NOT IN ('stripe', 'ifthenpay') OR NULLIF(p_reference, '') IS NULL THEN
    RETURN false;
  END IF;
  UPDATE public.orders
  SET payment_provider = p_provider, payment_reference = p_reference, updated_at = NOW()
  WHERE id = p_order_id AND access_token = p_access_token
    AND payment_status = 'pending' AND status = 'pending_payment';
  RETURN FOUND;
END;
$$;

-- Reverte o stock se o fornecedor não conseguir iniciar o pagamento.
CREATE OR REPLACE FUNCTION public.cancel_order(
  p_order_id UUID, p_access_token TEXT, p_reason TEXT DEFAULT ''
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders;
  v_line RECORD;
BEGIN
  SELECT * INTO v_order FROM public.orders
  WHERE id = p_order_id AND access_token = p_access_token
  FOR UPDATE;
  IF v_order.id IS NULL OR v_order.status <> 'pending_payment' OR v_order.payment_status <> 'pending' THEN
    RETURN false;
  END IF;
  FOR v_line IN
    SELECT oi.variant_id, SUM(oi.quantity)::INT AS quantity
    FROM public.order_items oi
    JOIN public.product_variants pv ON pv.id = oi.variant_id
    JOIN public.products p ON p.id = pv.product_id
    WHERE oi.order_id = p_order_id AND p.stock_mode = 'managed'
    GROUP BY oi.variant_id
  LOOP
    UPDATE public.product_variants
    SET stock_quantity = stock_quantity + v_line.quantity, updated_at = NOW()
    WHERE id = v_line.variant_id;
    INSERT INTO public.stock_movements (variant_id, delta, reason, order_id, note)
    VALUES (v_line.variant_id, v_line.quantity, 'restock', p_order_id, left(COALESCE(p_reason, 'Pagamento não iniciado'), 240));
  END LOOP;
  UPDATE public.orders SET status = 'cancelled', payment_status = 'failed', updated_at = NOW()
  WHERE id = p_order_id;
  INSERT INTO public.order_status_history (order_id, status, note)
  VALUES (p_order_id, 'cancelled', left(COALESCE(p_reason, 'Pagamento não iniciado'), 300));
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_pending_order_service(p_reference TEXT, p_provider TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders;
BEGIN
  SELECT * INTO v_order FROM public.orders
  WHERE payment_reference = p_reference AND payment_provider = p_provider
    AND payment_status = 'pending' AND status = 'pending_payment'
  FOR UPDATE;
  IF v_order.id IS NULL THEN RETURN false; END IF;
  RETURN public.cancel_order(v_order.id, v_order.access_token, 'Pagamento não concluído');
END;
$$;

-- O papel anónimo só pode criar uma encomenda através do RPC validado e ler
-- catálogo público. Tabelas internas não aceitam escritas diretas via REST.
DROP POLICY IF EXISTS "orders_insert_public" ON public.orders;
DROP POLICY IF EXISTS "order_items_insert_public" ON public.order_items;
DROP POLICY IF EXISTS "order_history_insert_public" ON public.order_status_history;
DROP POLICY IF EXISTS "coupon_uses_insert_public" ON public.coupon_uses;
DROP POLICY IF EXISTS "stock_movements_insert_public" ON public.stock_movements;
DROP POLICY IF EXISTS "stock_holds_insert_public" ON public.stock_holds;
DROP POLICY IF EXISTS "email_log_insert_public" ON public.email_log;
DROP POLICY IF EXISTS "return_requests_insert_public" ON public.return_requests;
DROP POLICY IF EXISTS "return_items_insert_public" ON public.return_items;
REVOKE INSERT, UPDATE, DELETE ON public.orders, public.order_items, public.order_status_history,
  public.coupon_uses, public.stock_movements, public.stock_holds, public.email_log,
  public.return_requests, public.return_items FROM PUBLIC, anon, authenticated;
GRANT UPDATE ON public.orders TO authenticated;
GRANT INSERT ON public.order_status_history, public.stock_movements TO authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_order_paid(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_order_paid(TEXT, TEXT) TO service_role;
REVOKE EXECUTE ON FUNCTION public.set_order_payment_reference(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_order_payment_reference(UUID, TEXT, TEXT, TEXT) TO service_role;
REVOKE EXECUTE ON FUNCTION public.cancel_order(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_order(UUID, TEXT, TEXT) TO service_role;
REVOKE EXECUTE ON FUNCTION public.cancel_pending_order_service(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_pending_order_service(TEXT, TEXT) TO service_role;
REVOKE EXECUTE ON FUNCTION public.place_order(JSONB, JSONB, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_order(JSONB, JSONB, TEXT, TEXT) TO service_role;
GRANT ALL ON public.orders, public.order_items, public.order_status_history, public.coupon_uses,
  public.stock_movements, public.stock_holds, public.email_log TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.order_number_seq TO anon, authenticated;

-- ============================================================================
-- 25. Campanhas — página pública /campanhas e backoffice /admin/loja/campanhas
-- ============================================================================
-- Campanha promocional com foto, título, texto, datas e botão com ligação.
-- O público só vê as campanhas ativas e dentro do intervalo de datas.
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

-- Leitura pública: só as campanhas ativas (o intervalo de datas filtra-se na página).
DROP POLICY IF EXISTS "campaigns_select_public" ON public.campaigns;
CREATE POLICY "campaigns_select_public" ON public.campaigns FOR SELECT USING (is_active);

-- Escrita: só administradores (vêem também as inativas/agendadas).
DROP POLICY IF EXISTS "campaigns_admin_all" ON public.campaigns;
CREATE POLICY "campaigns_admin_all" ON public.campaigns FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

GRANT SELECT ON public.campaigns TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;

DROP TRIGGER IF EXISTS trg_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER trg_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.shop_touch_updated_at();

NOTIFY pgrst, 'reload schema';
SELECT '✅ INSTALAÇÃO COMPLETA — schema, políticas, funções e permissões prontos!' AS resultado;

