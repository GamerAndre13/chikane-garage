-- Adiciona classificação de estilo para os filtros do catálogo.
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS body_style TEXT;

-- Classifica os formatos mais comuns a partir do modelo e da versão já guardados.
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
