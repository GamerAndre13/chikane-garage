-- Reforçar correção de ambiguidade nas RPCs de admin de contas
CREATE OR REPLACE FUNCTION public.admin_pending_deletions()
RETURNS TABLE(id UUID, email TEXT, full_name TEXT, deletion_requested_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  RETURN QUERY
  SELECT p.id, p.email, p.full_name, p.deletion_requested_at
  FROM public.profiles p
  WHERE p.deletion_requested_at IS NOT NULL
  ORDER BY p.deletion_requested_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_pending_deletions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_pending_deletions() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_user(target_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  DELETE FROM auth.users WHERE auth.users.id = target_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_clear_deletion_request(target_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  UPDATE public.profiles p
  SET deletion_requested_at = NULL, updated_at = NOW()
  WHERE p.id = target_id AND p.deletion_requested_at IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_clear_deletion_request(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_clear_deletion_request(UUID) TO authenticated;
