-- 028_about_stats.sql
-- Números editáveis da página "Sobre Nós" (140 pontos de inspeção, viaturas
-- vendidas, anos de experiência e clientes satisfeitos).
-- Idempotente: pode ser executado mais do que uma vez.

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
