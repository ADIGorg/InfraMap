-- RN058: desativação e anonimização de conta do cidadão
-- Substitui 20261109070000_id02 (nunca aplicada)
-- Correção: SET search_path = ''
--
-- Anonimiza profiles (name, phone) + desativa user_roles.
-- auth.users.email é anonimizado por job assíncrono via service_role
-- (account_deactivation_jobs registra a pendência).

CREATE TABLE IF NOT EXISTS public.account_deactivation_jobs (
  user_id UUID PRIMARY KEY
    REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  auth_cleanup_completed_at TIMESTAMPTZ
);

COMMENT ON TABLE public.account_deactivation_jobs
  IS 'RN058. Fila de limpeza de auth.users pós-desativação. Processado por service_role.';

ALTER TABLE public.account_deactivation_jobs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.account_deactivation_jobs
  FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE
  ON public.account_deactivation_jobs TO service_role;

CREATE OR REPLACE FUNCTION public.deactivate_my_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id   UUID := (SELECT auth.uid());
  v_role      public.app_role;
  v_is_active BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária.' USING ERRCODE = '28000';
  END IF;

  SELECT ur.role, ur.is_active INTO v_role, v_is_active
    FROM public.user_roles ur
   WHERE ur.user_id = v_user_id
   FOR UPDATE;

  IF NOT FOUND
     OR v_role IS DISTINCT FROM 'CITIZEN'::public.app_role
     OR v_is_active IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'A operação exige um cidadão ativo.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
     SET name = 'Usuário excluído', phone = NULL
   WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil não encontrado.';
  END IF;

  UPDATE public.user_roles SET is_active = FALSE WHERE user_id = v_user_id;

  INSERT INTO public.account_deactivation_jobs (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.deactivate_my_account()
  IS 'RN058. Cidadão autenticado anonimiza o próprio perfil e desativa a conta. Auth cleanup via job.';

REVOKE ALL ON FUNCTION public.deactivate_my_account() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_my_account() TO authenticated;
