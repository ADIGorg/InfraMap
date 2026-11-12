-- FWD-02: registra o resultado do envio de encaminhamento (SENT/FAILED) de forma atômica.
-- Complementa create_forwarding (que cria a linha PENDING + evento FORWARDED_TO_AGENCY).
-- Esta RPC faz UPDATE forwardings + INSERT occurrence_history numa única transação,
-- atendendo anexo 03 §11 ("Sem transação em operação multi-tabela → proibido").
--
-- Autorização: apenas o admin responsável (auth.uid() = forwarding.admin_id).
-- Forwarding precisa estar PENDING. Status final só SENT ou FAILED.

CREATE OR REPLACE FUNCTION public.record_forwarding_result(
  p_forwarding_id       UUID,
  p_status              public.forwarding_status,
  p_provider_message_id VARCHAR(150) DEFAULT NULL,
  p_error_code          VARCHAR(100) DEFAULT NULL
) RETURNS public.forwardings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid    UUID := (SELECT auth.uid());
  v_fwd    public.forwardings%ROWTYPE;
  v_action VARCHAR(100);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores ativos.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_status NOT IN ('SENT', 'FAILED') THEN
    RAISE EXCEPTION 'Status deve ser SENT ou FAILED. Recebido: %.', p_status
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_status = 'SENT' AND p_error_code IS NOT NULL THEN
    RAISE EXCEPTION 'error_code só pode ser informado em FAILED.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_status = 'FAILED' AND p_provider_message_id IS NOT NULL THEN
    RAISE EXCEPTION 'provider_message_id só pode ser informado em SENT.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT * INTO v_fwd FROM public.forwardings WHERE id = p_forwarding_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Encaminhamento não encontrado.' USING ERRCODE = 'no_data_found';
  END IF;

  IF v_fwd.admin_id <> v_uid THEN
    RAISE EXCEPTION 'Apenas o administrador responsável pode registrar o resultado.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_fwd.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Encaminhamento já processado (status=%).', v_fwd.status
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  v_action := CASE p_status
    WHEN 'SENT'   THEN 'FORWARDING_SENT'
    WHEN 'FAILED' THEN 'FORWARDING_FAILED'
  END;

  UPDATE public.forwardings
     SET status              = p_status,
         provider_message_id = p_provider_message_id,
         error_code          = p_error_code,
         sent_at             = CASE WHEN p_status = 'SENT' THEN NOW() ELSE NULL END
   WHERE id = p_forwarding_id
   RETURNING * INTO v_fwd;

  INSERT INTO public.occurrence_history
    (occurrence_id, actor_id, actor_type, action, details)
  VALUES (
    v_fwd.occurrence_id,
    v_uid,
    'USER',
    v_action,
    jsonb_build_object(
      'forwarding_id', v_fwd.id::text,
      'agency_id',     v_fwd.agency_id::text,
      'status',        p_status::text,
      'provider_message_id', p_provider_message_id,
      'error_code',          p_error_code
    )
  );

  RETURN v_fwd;
END;
$$;

COMMENT ON FUNCTION public.record_forwarding_result(UUID, public.forwarding_status, VARCHAR, VARCHAR)
  IS 'RN060/RN070. Registra resultado do envio (SENT/FAILED) de forma atômica. Admin responsável apenas.';

REVOKE EXECUTE ON FUNCTION public.record_forwarding_result(
  UUID, public.forwarding_status, VARCHAR, VARCHAR
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_forwarding_result(
  UUID, public.forwarding_status, VARCHAR, VARCHAR
) TO authenticated;