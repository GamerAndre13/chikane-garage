-- ============================================================
-- MIGRAÇÃO 030: NÚMEROS DO "SOBRE" + FOTOS DAS CAMPANHAS
-- ============================================================
-- Junta num só ficheiro o conteúdo das migrações 028 e 029, para correr
-- uma única vez no SQL Editor do Supabase. Depois de a correr, os ficheiros
-- 028_about_stats.sql e 029_campaign_images.sql podem ser ignorados (os dois
-- são equivalentes a este; este é o que fica como referência).
--
-- Idempotente: pode ser re-executado sem efeitos secundários.
-- ============================================================

-- ------------------------------------------------------------
-- 1. NÚMEROS EDITÁVEIS DA PÁGINA "SOBRE NÓS"
-- ------------------------------------------------------------
-- 140 pontos de inspeção, viaturas vendidas, anos de experiência e clientes
-- satisfeitos: passam a ser editáveis em /admin/definicoes.
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS about_inspection_points INT DEFAULT 140,
  ADD COLUMN IF NOT EXISTS about_vehicles_sold INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS about_years_experience INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS about_clients INT DEFAULT 0;

-- Valores iniciais na linha existente (só preenche o que estiver vazio).
UPDATE public.site_settings
SET
  about_inspection_points = COALESCE(about_inspection_points, 140),
  about_vehicles_sold = COALESCE(about_vehicles_sold, 0),
  about_years_experience = COALESCE(about_years_experience, 0),
  about_clients = COALESCE(about_clients, 0)
WHERE about_inspection_points IS NULL
   OR about_vehicles_sold IS NULL
   OR about_years_experience IS NULL
   OR about_clients IS NULL;

-- ------------------------------------------------------------
-- 2. TABELA DAS FOTOS DAS CAMPANHAS
-- ------------------------------------------------------------
-- Cada campanha pode ter várias fotografias, mostradas na página própria
-- /campanhas/<slug>. A capa continua em campaigns.image_url; esta galeria
-- guarda só as fotos adicionais, pela ordem definida no admin.
CREATE TABLE IF NOT EXISTS public.campaign_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text TEXT DEFAULT '',
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Leitura por campanha, pela ordem definida no admin.
CREATE INDEX IF NOT EXISTS idx_campaign_images_campaign_position
  ON public.campaign_images(campaign_id, position);

-- ------------------------------------------------------------
-- 3. RLS E POLÍTICAS
-- ------------------------------------------------------------
ALTER TABLE public.campaign_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_images_select_public" ON public.campaign_images;
DROP POLICY IF EXISTS "campaign_images_manage_admin" ON public.campaign_images;

-- Público: fotos de campanhas visíveis (a política da tabela campaigns já
-- filtra por estado e datas).
CREATE POLICY "campaign_images_select_public" ON public.campaign_images
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id)
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "campaign_images_manage_admin" ON public.campaign_images
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ------------------------------------------------------------
-- 4. PERMISSÕES
-- ------------------------------------------------------------
GRANT SELECT ON public.campaign_images TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.campaign_images TO authenticated;

-- ------------------------------------------------------------
-- 5. RECARREGAR O ESQUEMA
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

SELECT 'OK. MIGRAÇÃO 030 CONCLUÍDA - números do sobre e fotos das campanhas' AS resultado;
