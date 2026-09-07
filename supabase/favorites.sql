-- ============================================================
-- FAVORITOS - Tabela + RLS
-- Copia e executa no SQL Editor do Supabase
-- ============================================================

-- TABELA: favorites
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, vehicle_id)
);

-- RLS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favorites_select_own" ON public.favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "favorites_insert_own" ON public.favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorites_delete_own" ON public.favorites
  FOR DELETE USING (auth.uid() = user_id);

-- PERMISSÕES
GRANT SELECT ON public.favorites TO authenticated;
GRANT INSERT ON public.favorites TO authenticated;
GRANT DELETE ON public.favorites TO authenticated;

SELECT '✅ FAVORITOS CONFIGURADOS!' AS resultado;
