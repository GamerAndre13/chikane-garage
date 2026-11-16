-- ------------------------------------------------------------
-- 038 — Gestor de vendas pode criar e editar viaturas
-- ------------------------------------------------------------
-- O dono pediu que o gestor de vendas (role = 'sales') também possa
-- adicionar viaturas. Passa a poder:
--   • inserir viaturas;
--   • editar viaturas (dados, fotos, equipamento, extras e destaque);
--   • inserir/apagar fotos e equipamento.
-- Continua a NÃO poder apagar viaturas — isso fica exclusivo do admin.
--
-- As políticas substituem as criadas em supabase/035_roles_backoffice.sql
-- (vehicles_*) e em supabase/setup.sql (vehicle_images_*, vehicle_features_*).
-- Idempotente: pode ser executado mais do que uma vez.

-- ------------------------------------------------------------
-- 1. Viaturas
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "vehicles_insert_admin" ON public.vehicles;
CREATE POLICY "vehicles_insert_admin" ON public.vehicles FOR INSERT WITH CHECK (
  public.has_role(ARRAY['admin', 'sales'])
);

DROP POLICY IF EXISTS "vehicles_update_admin" ON public.vehicles;
CREATE POLICY "vehicles_update_admin" ON public.vehicles FOR UPDATE USING (
  public.has_role(ARRAY['admin', 'sales'])
) WITH CHECK (
  public.has_role(ARRAY['admin', 'sales'])
);

-- Apagar viaturas mantém-se só para o admin.
DROP POLICY IF EXISTS "vehicles_delete_admin" ON public.vehicles;
CREATE POLICY "vehicles_delete_admin" ON public.vehicles FOR DELETE USING (
  public.has_role(ARRAY['admin'])
);

-- ------------------------------------------------------------
-- 2. Fotografias das viaturas
-- ------------------------------------------------------------
-- A leitura pública já vem do setup.sql; aqui só se alarga a escrita.
DROP POLICY IF EXISTS "vehicle_images_insert_admin" ON public.vehicle_images;
CREATE POLICY "vehicle_images_insert_admin" ON public.vehicle_images FOR INSERT WITH CHECK (
  public.has_role(ARRAY['admin', 'sales'])
);

-- Faltava uma política de UPDATE: sem ela, reordenar fotos no backoffice
-- (reorderVehicleImages) era recusado pela RLS, mesmo para o admin.
DROP POLICY IF EXISTS "vehicle_images_update_admin" ON public.vehicle_images;
CREATE POLICY "vehicle_images_update_admin" ON public.vehicle_images FOR UPDATE USING (
  public.has_role(ARRAY['admin', 'sales'])
) WITH CHECK (
  public.has_role(ARRAY['admin', 'sales'])
);

DROP POLICY IF EXISTS "vehicle_images_delete_admin" ON public.vehicle_images;
CREATE POLICY "vehicle_images_delete_admin" ON public.vehicle_images FOR DELETE USING (
  public.has_role(ARRAY['admin', 'sales'])
);

-- ------------------------------------------------------------
-- 3. Equipamento / características das viaturas
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "vehicle_features_insert_admin" ON public.vehicle_features;
CREATE POLICY "vehicle_features_insert_admin" ON public.vehicle_features FOR INSERT WITH CHECK (
  public.has_role(ARRAY['admin', 'sales'])
);

DROP POLICY IF EXISTS "vehicle_features_delete_admin" ON public.vehicle_features;
CREATE POLICY "vehicle_features_delete_admin" ON public.vehicle_features FOR DELETE USING (
  public.has_role(ARRAY['admin', 'sales'])
);

-- ------------------------------------------------------------
-- 4. Recarregar o esquema
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

SELECT '✅ MIGRAÇÃO 038 CONCLUÍDA - gestor de vendas pode gerir viaturas (sem apagar)' AS resultado;
