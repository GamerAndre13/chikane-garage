-- ------------------------------------------------------------
-- 037 — Ninguém altera o próprio cargo
-- ------------------------------------------------------------
-- O admin passou a ver o cargo da própria conta em /admin/utilizadores
-- apenas como leitura (para não se despromover por engano e ficar sem
-- backoffice). Esta migração reforça a regra na base de dados: qualquer
-- alteração de cargo feita por um utilizador autenticado à sua própria
-- linha é recusada, mesmo que seja administrador.
--
-- O SQL Editor do Supabase continua a poder corrigir cargos, porque aí
-- auth.uid() é NULL (não há sessão de utilizador).
--
-- Só substitui a função criada em 035; é idempotente e pode ser executada
-- mais do que uma vez.

CREATE OR REPLACE FUNCTION public.prevent_self_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- 1. Ninguém muda o cargo da própria conta (nem o admin).
    IF auth.uid() IS NOT NULL AND NEW.id = auth.uid() THEN
      RAISE EXCEPTION 'Não podes alterar o teu próprio cargo. Pede a outro administrador que o faça.';
    END IF;

    -- 2. Fora isso, o cargo só muda por ação de um administrador
    --    (impede que um cliente se promova a si mesmo via API).
    IF NOT public.has_role(ARRAY['admin']) THEN
      RAISE EXCEPTION 'Só um administrador pode alterar o cargo de um utilizador.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_self_role_change ON public.profiles;
CREATE TRIGGER prevent_self_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_role_change();
