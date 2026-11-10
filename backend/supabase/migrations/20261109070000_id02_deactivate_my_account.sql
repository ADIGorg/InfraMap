
-- ==========================================
-- API1-44 - ID-02
-- DESATIVAÇÃO E ANONIMIZAÇÃO DE CONTA
-- ==========================================

-- Registra operações cuja limpeza no Auth
-- pode precisar ser retomada.
CREATE TABLE IF NOT EXISTS
  public.account_deactivation_jobs (
    user_id UUID PRIMARY KEY
      REFERENCES auth.users(id)
      ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL
      DEFAULT NOW(),

    auth_cleanup_completed_at TIMESTAMPTZ
  );

-- A tabela de controle não deve ser acessível
-- diretamente pelos cidadãos.
ALTER TABLE public.account_deactivation_jobs
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL
  ON public.account_deactivation_jobs
  FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE
  ON public.account_deactivation_jobs
  TO service_role;


-- ==========================================
-- FUNÇÃO TRANSACIONAL
-- ==========================================

CREATE OR REPLACE FUNCTION
  public.deactivate_my_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_role public.app_role;
  v_is_active BOOLEAN;
BEGIN
  -- Identifica o usuário pelo JWT.
  -- O cliente não informa outro user_id.
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária.'
      USING ERRCODE = '28000';
  END IF;

  -- Bloqueia a linha durante a transação.
  SELECT
    ur.role,
    ur.is_active
  INTO
    v_role,
    v_is_active
  FROM public.user_roles AS ur
  WHERE ur.user_id = v_user_id
  FOR UPDATE;

  -- Somente o próprio cidadão ativo
  -- pode executar a desativação.
  IF NOT FOUND
     OR v_role IS DISTINCT FROM
       'CITIZEN'::public.app_role
     OR v_is_active IS DISTINCT FROM TRUE
  THEN
    RAISE EXCEPTION
      'A operação exige um cidadão ativo.'
      USING ERRCODE = '42501';
  END IF;

  -- Anonimiza os dados do perfil.
  UPDATE public.profiles
  SET
    name = 'Usuário excluído',
    phone = NULL
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Perfil não encontrado.';
  END IF;

  -- Desativa o acesso da conta.
  UPDATE public.user_roles
  SET is_active = FALSE
  WHERE user_id = v_user_id;

  -- Registra a limpeza do Auth como pendente.
  INSERT INTO public.account_deactivation_jobs (
    user_id
  )
  VALUES (
    v_user_id
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- As alterações acima são atômicas:
  -- se qualquer comando falhar,
  -- a transação será revertida.
END;
$$;

-- Restringe a execução da função.
REVOKE ALL
  ON FUNCTION public.deactivate_my_account()
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
  ON FUNCTION public.deactivate_my_account()
  TO authenticated;
