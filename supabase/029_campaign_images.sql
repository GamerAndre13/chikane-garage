-- ============================================================
-- MIGRAÇÃO 029: FOTOS DAS CAMPANHAS
-- ============================================================
-- Cada campanha passa a poder ter várias fotografias, mostradas na
-- página própria /campanhas/<slug>. A primeira (posição 0) é também a
-- capa usada nos cartões da home e da listagem.
--
-- Idempotente: pode ser re-executado sem efeitos secundários.
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABELA
-- ------------------------------------------------------------
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
-- 2. RLS E POLÍTICAS
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
-- 3. PERMISSÕES
-- ------------------------------------------------------------
GRANT SELECT ON public.campaign_images TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.campaign_images TO authenticated;

-- ------------------------------------------------------------
-- 4. RECARREGAR O ESQUEMA
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

SELECT 'OK. MIGRAÇÃO 029 CONCLUÍDA - fotos das campanhas criadas' AS resultado;
