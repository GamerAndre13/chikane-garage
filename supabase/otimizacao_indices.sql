-- ============================================================
-- OTIMIZAÇÃO: Índices para melhorar performance
-- ============================================================
-- Correr no SQL Editor do Supabase. Idempotente.
-- ============================================================

-- Vehicles: listagem pública e filtros
CREATE INDEX IF NOT EXISTS idx_vehicles_status_published ON public.vehicles(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicles_spotlight_active ON public.vehicles(spotlight) WHERE spotlight = true AND status = 'available';

-- Vehicle images
CREATE INDEX IF NOT EXISTS idx_vehicle_images_vehicle_pos ON public.vehicle_images(vehicle_id, position);

-- Campaigns: filtro de campanhas ativas por datas
CREATE INDEX IF NOT EXISTS idx_campaigns_active_dates ON public.campaigns(is_active, position, starts_at, ends_at);

-- Site content
CREATE INDEX IF NOT EXISTS idx_site_content_section ON public.site_content(section_key);

-- Favorites
CREATE INDEX IF NOT EXISTS idx_favorites_user_vehicle ON public.favorites(user_id, vehicle_id);

-- Contact/test drives
CREATE INDEX IF NOT EXISTS idx_contact_requests_status_created ON public.contact_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_drives_status_date ON public.test_drives(status, preferred_date);

-- Newsletter
CREATE INDEX IF NOT EXISTS idx_newsletter_status_created ON public.newsletter_subscribers(status, created_at DESC);

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Vehicle requests
CREATE INDEX IF NOT EXISTS idx_vehicle_requests_status_created ON public.vehicle_requests(status, created_at DESC);

NOTIFY pgrst, 'reload schema';

SELECT 'Índices de otimização criados/atualizados com sucesso!' AS resultado;
