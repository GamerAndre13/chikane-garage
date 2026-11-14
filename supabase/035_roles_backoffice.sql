-- ------------------------------------------------------------
-- 035 — Níveis de acesso ao backoffice
-- ------------------------------------------------------------
-- Três níveis de acesso, além do cliente comum:
--   admin  — tudo, incluindo viaturas, contas e atribuição de cargos;
--   editor — campanhas e definições (conteúdo) do site;
--   sales  — pedidos/reservas, propostas e extras (viaturas só leitura).
--
-- O cargo fica em profiles.role. A função public.has_role() centraliza a
-- verificação nas políticas RLS (SECURITY DEFINER para não depender das
-- políticas de profiles).
--
-- Idempotente: pode ser executado mais do que uma vez.

-- ------------------------------------------------------------
-- 1. Função de apoio
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(p_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = ANY (p_roles)
  );
$$;

REVOKE ALL ON FUNCTION public.has_role(TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(TEXT[]) TO anon, authenticated;

-- ------------------------------------------------------------
-- 2. Cargos válidos
-- ------------------------------------------------------------
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'user';

UPDATE public.profiles
SET role = 'user'
WHERE role IS NULL OR role NOT IN ('user', 'editor', 'sales', 'admin');

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'editor', 'sales', 'admin'));

-- ------------------------------------------------------------
-- 3. profiles — o admin pode alterar o cargo de qualquer utilizador
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE
  USING (public.has_role(ARRAY['admin']))
  WITH CHECK (public.has_role(ARRAY['admin']));

-- A política profiles_update_own (setup.sql) deixa cada utilizador alterar o
-- próprio perfil; sem esta proteção, também podia promover-se a admin. O
-- cargo só muda por ação de um administrador.
CREATE OR REPLACE FUNCTION public.prevent_self_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.uid() IS NOT NULL
     AND NOT public.has_role(ARRAY['admin']) THEN
    RAISE EXCEPTION 'Só um administrador pode alterar o cargo de um utilizador.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_self_role_change ON public.profiles;
CREATE TRIGGER prevent_self_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_role_change();

-- ------------------------------------------------------------
-- 4. Viaturas — leitura para toda a equipa; escrita só admin
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "vehicles_select" ON public.vehicles;
CREATE POLICY "vehicles_select" ON public.vehicles FOR SELECT USING (
  public.has_role(ARRAY['admin', 'editor', 'sales'])
  OR status IN ('available', 'reserved')
  OR (status = 'sold' AND sold_at >= NOW() - INTERVAL '7 days')
);

DROP POLICY IF EXISTS "vehicles_insert_admin" ON public.vehicles;
CREATE POLICY "vehicles_insert_admin" ON public.vehicles FOR INSERT WITH CHECK (
  public.has_role(ARRAY['admin'])
);

DROP POLICY IF EXISTS "vehicles_update_admin" ON public.vehicles;
CREATE POLICY "vehicles_update_admin" ON public.vehicles FOR UPDATE USING (
  public.has_role(ARRAY['admin'])
) WITH CHECK (
  public.has_role(ARRAY['admin'])
);

DROP POLICY IF EXISTS "vehicles_delete_admin" ON public.vehicles;
CREATE POLICY "vehicles_delete_admin" ON public.vehicles FOR DELETE USING (
  public.has_role(ARRAY['admin'])
);

-- ------------------------------------------------------------
-- 5. Extras — o gestor de vendas cria e edita; o admin também
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "vehicle_extra_catalog_select_public" ON public.vehicle_extra_catalog;
CREATE POLICY "vehicle_extra_catalog_select_public" ON public.vehicle_extra_catalog
  FOR SELECT USING (
    is_active = true
    OR public.has_role(ARRAY['admin', 'sales'])
  );

DROP POLICY IF EXISTS "vehicle_extra_catalog_manage_admin" ON public.vehicle_extra_catalog;
CREATE POLICY "vehicle_extra_catalog_manage_admin" ON public.vehicle_extra_catalog
  FOR ALL USING (public.has_role(ARRAY['admin', 'sales']))
  WITH CHECK (public.has_role(ARRAY['admin', 'sales']));

DROP POLICY IF EXISTS "vehicle_extra_variants_select_public" ON public.vehicle_extra_variants;
CREATE POLICY "vehicle_extra_variants_select_public" ON public.vehicle_extra_variants
  FOR SELECT USING (
    is_active = true
    OR public.has_role(ARRAY['admin', 'sales'])
  );

DROP POLICY IF EXISTS "vehicle_extra_variants_manage_admin" ON public.vehicle_extra_variants;
CREATE POLICY "vehicle_extra_variants_manage_admin" ON public.vehicle_extra_variants
  FOR ALL USING (public.has_role(ARRAY['admin', 'sales']))
  WITH CHECK (public.has_role(ARRAY['admin', 'sales']));

DROP POLICY IF EXISTS "vehicle_extras_select_public" ON public.vehicle_extras;
CREATE POLICY "vehicle_extras_select_public" ON public.vehicle_extras
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.id = vehicle_id
        AND (
          public.has_role(ARRAY['admin', 'editor', 'sales'])
          OR v.status IN ('available', 'reserved')
          OR (v.status = 'sold' AND v.sold_at IS NOT NULL AND v.sold_at >= NOW() - INTERVAL '7 days')
        )
    )
  );

DROP POLICY IF EXISTS "vehicle_extras_manage_admin" ON public.vehicle_extras;
CREATE POLICY "vehicle_extras_manage_admin" ON public.vehicle_extras
  FOR ALL USING (public.has_role(ARRAY['admin', 'sales']))
  WITH CHECK (public.has_role(ARRAY['admin', 'sales']));

-- ------------------------------------------------------------
-- 6. Conteúdo do site — editor e admin
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "site_content_select" ON public.site_content;
CREATE POLICY "site_content_select" ON public.site_content FOR SELECT USING (true);

DROP POLICY IF EXISTS "site_content_insert_admin" ON public.site_content;
CREATE POLICY "site_content_insert_admin" ON public.site_content FOR INSERT WITH CHECK (
  public.has_role(ARRAY['admin', 'editor'])
);

DROP POLICY IF EXISTS "site_content_update_admin" ON public.site_content;
CREATE POLICY "site_content_update_admin" ON public.site_content FOR UPDATE USING (
  public.has_role(ARRAY['admin', 'editor'])
) WITH CHECK (
  public.has_role(ARRAY['admin', 'editor'])
);

DROP POLICY IF EXISTS "site_content_delete_admin" ON public.site_content;
CREATE POLICY "site_content_delete_admin" ON public.site_content FOR DELETE USING (
  public.has_role(ARRAY['admin', 'editor'])
);

DROP POLICY IF EXISTS "site_settings_insert_admin" ON public.site_settings;
CREATE POLICY "site_settings_insert_admin" ON public.site_settings FOR INSERT WITH CHECK (
  public.has_role(ARRAY['admin', 'editor'])
);

DROP POLICY IF EXISTS "site_settings_update_admin" ON public.site_settings;
CREATE POLICY "site_settings_update_admin" ON public.site_settings FOR UPDATE USING (
  public.has_role(ARRAY['admin', 'editor'])
) WITH CHECK (
  public.has_role(ARRAY['admin', 'editor'])
);

-- ------------------------------------------------------------
-- 7. Campanhas — editor e admin
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "campaigns_select_public" ON public.campaigns;
CREATE POLICY "campaigns_select_public" ON public.campaigns
  FOR SELECT USING (
    (
      is_active = true
      AND (starts_at IS NULL OR starts_at <= NOW())
      AND (ends_at IS NULL OR ends_at >= NOW())
    )
    OR public.has_role(ARRAY['admin', 'editor'])
  );

DROP POLICY IF EXISTS "campaigns_manage_admin" ON public.campaigns;
CREATE POLICY "campaigns_manage_admin" ON public.campaigns
  FOR ALL USING (public.has_role(ARRAY['admin', 'editor']))
  WITH CHECK (public.has_role(ARRAY['admin', 'editor']));

DROP POLICY IF EXISTS "campaign_images_select_public" ON public.campaign_images;
CREATE POLICY "campaign_images_select_public" ON public.campaign_images
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "campaign_images_manage_admin" ON public.campaign_images;
CREATE POLICY "campaign_images_manage_admin" ON public.campaign_images
  FOR ALL USING (public.has_role(ARRAY['admin', 'editor']))
  WITH CHECK (public.has_role(ARRAY['admin', 'editor']));

-- ------------------------------------------------------------
-- 8. Pedidos, test drives, reservas e propostas — admin e vendas
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "contact_requests_select_admin" ON public.contact_requests;
CREATE POLICY "contact_requests_select_admin" ON public.contact_requests FOR SELECT USING (
  public.has_role(ARRAY['admin', 'sales'])
);

DROP POLICY IF EXISTS "contact_requests_update_admin" ON public.contact_requests;
CREATE POLICY "contact_requests_update_admin" ON public.contact_requests FOR UPDATE USING (
  public.has_role(ARRAY['admin', 'sales'])
) WITH CHECK (
  public.has_role(ARRAY['admin', 'sales'])
);

DROP POLICY IF EXISTS "test_drives_select_admin" ON public.test_drives;
CREATE POLICY "test_drives_select_admin" ON public.test_drives FOR SELECT USING (
  public.has_role(ARRAY['admin', 'sales'])
);

DROP POLICY IF EXISTS "test_drives_update_admin" ON public.test_drives;
CREATE POLICY "test_drives_update_admin" ON public.test_drives FOR UPDATE USING (
  public.has_role(ARRAY['admin', 'sales'])
) WITH CHECK (
  public.has_role(ARRAY['admin', 'sales'])
);

DROP POLICY IF EXISTS "reservations_select_admin" ON public.reservations;
CREATE POLICY "reservations_select_admin" ON public.reservations FOR SELECT USING (
  public.has_role(ARRAY['admin', 'sales'])
);

DROP POLICY IF EXISTS "reservations_update_admin" ON public.reservations;
CREATE POLICY "reservations_update_admin" ON public.reservations FOR UPDATE USING (
  public.has_role(ARRAY['admin', 'sales'])
) WITH CHECK (
  public.has_role(ARRAY['admin', 'sales'])
);

DROP POLICY IF EXISTS "sale_proposals_select_admin" ON public.sale_proposals;
CREATE POLICY "sale_proposals_select_admin" ON public.sale_proposals FOR SELECT USING (
  public.has_role(ARRAY['admin', 'sales'])
);

DROP POLICY IF EXISTS "sale_proposals_update_admin" ON public.sale_proposals;
CREATE POLICY "sale_proposals_update_admin" ON public.sale_proposals FOR UPDATE USING (
  public.has_role(ARRAY['admin', 'sales'])
) WITH CHECK (
  public.has_role(ARRAY['admin', 'sales'])
);

-- ------------------------------------------------------------
-- 9. Newsletter — só admin (dados de marketing)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "newsletter_select_admin" ON public.newsletter_subscribers;
CREATE POLICY "newsletter_select_admin" ON public.newsletter_subscribers FOR SELECT USING (
  public.has_role(ARRAY['admin'])
);

DROP POLICY IF EXISTS "newsletter_update_admin" ON public.newsletter_subscribers;
CREATE POLICY "newsletter_update_admin" ON public.newsletter_subscribers FOR UPDATE USING (
  public.has_role(ARRAY['admin'])
) WITH CHECK (
  public.has_role(ARRAY['admin'])
);

DROP POLICY IF EXISTS "newsletter_delete_admin" ON public.newsletter_subscribers;
CREATE POLICY "newsletter_delete_admin" ON public.newsletter_subscribers FOR DELETE USING (
  public.has_role(ARRAY['admin'])
);

-- ------------------------------------------------------------
-- 10. Recarregar o esquema
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

SELECT '✅ MIGRAÇÃO 035 CONCLUÍDA - níveis de acesso ao backoffice' AS resultado;
