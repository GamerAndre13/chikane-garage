-- ------------------------------------------------------------
-- 039 — O cargo de administrador só se atribui na base de dados
-- ------------------------------------------------------------
-- O dono pediu que a aplicação deixe de permitir criar novos admins pela
-- interface. O seletor de /admin/utilizadores passa a oferecer apenas
-- user/editor/sales; esta migração garante a mesma regra na base de dados,
-- mesmo que alguém chame a API do Supabase diretamente.
--
-- Regra: uma sessão autenticada (auth.uid() não nulo) não pode colocar
-- role = 'admin' numa linha de profiles. O SQL Editor do Supabase continua a
-- poder fazê-lo, porque aí auth.uid() é NULL.
--
-- Não mexe na regra de 037 (ninguém altera o próprio cargo). Idempotente:
-- pode ser executado mais do que uma vez.
--
-- Exemplo (SQL Editor) para criar o primeiro admin ou outro admin:
--   UPDATE public.profiles SET role = 'admin' WHERE email = 'email@exemplo.pt';

CREATE OR REPLACE FUNCTION public.prevent_admin_role_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só interessa quando a linha passa a ser administradora.
  IF NEW.role IS DISTINCT FROM 'admin' THEN
    RETURN NEW;
  END IF;

  -- Numa atualização, manter um admin que já era admin não é uma promoção.
  IF TG_OP = 'UPDATE' AND OLD.role = 'admin' THEN
    RETURN NEW;
  END IF;

  -- Sem sessão de utilizador (SQL Editor / service role) a promoção é
  -- permitida; com sessão, é recusada.
  IF auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'O cargo de administrador só pode ser atribuído diretamente na base de dados (SQL Editor do Supabase).';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_admin_role_assignment ON public.profiles;
CREATE TRIGGER prevent_admin_role_assignment
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_admin_role_assignment();

NOTIFY pgrst, 'reload schema';

SELECT '✅ MIGRAÇÃO 039 CONCLUÍDA - cargo admin só atribuível na base de dados' AS resultado;
