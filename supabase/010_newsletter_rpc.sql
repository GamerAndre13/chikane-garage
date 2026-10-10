-- RPC para subscrever a newsletter verificando duplicados (case-insensitive)
-- Retorna TRUE se foi nova subscrição (enviar email) e FALSE se já existia.
CREATE OR REPLACE FUNCTION public.subscribe_newsletter(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT := lower(trim(p_email));
  v_status TEXT;
BEGIN
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Email inválido';
  END IF;

  SELECT status INTO v_status
  FROM public.newsletter_subscribers
  WHERE lower(email) = v_email
  LIMIT 1;

  IF FOUND THEN
    -- Já subscrito e ativo: não volta a enviar
    IF v_status = 'active' THEN
      RETURN false;
    END IF;
    -- Estava cancelado: reativa e permite novo email
    UPDATE public.newsletter_subscribers
    SET status = 'active'
    WHERE lower(email) = v_email;
    RETURN true;
  END IF;

  INSERT INTO public.newsletter_subscribers (email) VALUES (v_email);
  RETURN true;
EXCEPTION WHEN unique_violation THEN
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.subscribe_newsletter(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.subscribe_newsletter(TEXT) TO anon, authenticated;
