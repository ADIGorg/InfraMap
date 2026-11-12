-- RN060, RN070: encaminhamento para órgão responsável
-- Registra em forwardings E occurrence_history (RN039)
-- Status da ocorrência NÃO muda (RN060) — permanece CONFIRMED até admin mover para IN_SERVICE

CREATE OR REPLACE FUNCTION public.create_forwarding(
  p_occurrence_id UUID,
  p_agency_id     UUID,
  p_subject       VARCHAR(200),
  p_observations  TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid           UUID := (SELECT auth.uid());
  v_occ           public.occurrences%ROWTYPE;
  v_agency        public.agencies%ROWTYPE;
  v_forwarding_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores ativos.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_subject IS NULL OR char_length(trim(p_subject)) = 0 THEN
    RAISE EXCEPTION 'Assunto obrigatório.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT * INTO v_occ FROM public.occurrences WHERE id = p_occurrence_id FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ocorrência não encontrada.' USING ERRCODE = 'no_data_found';
  END IF;

  IF v_occ.status <> 'CONFIRMED' THEN
    RAISE EXCEPTION 'Só ocorrências CONFIRMED podem ser encaminhadas (RN060). Atual: %.',
      v_occ.status USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT * INTO v_agency FROM public.agencies WHERE id = p_agency_id FOR SHARE;
  IF NOT FOUND OR NOT v_agency.is_active THEN
    RAISE EXCEPTION 'Órgão inválido ou inativo.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  INSERT INTO public.forwardings (
    occurrence_id, agency_id, admin_id,
    recipient_email, subject, observations,
    channel, status
  ) VALUES (
    p_occurrence_id, p_agency_id, v_uid,
    v_agency.email, trim(p_subject), p_observations,
    'EMAIL', 'PENDING'
  ) RETURNING id INTO v_forwarding_id;

  INSERT INTO public.occurrence_history
    (occurrence_id, actor_id, actor_type, action, details)
  VALUES (
    p_occurrence_id, v_uid, 'USER', 'FORWARDED_TO_AGENCY',
    jsonb_build_object(
      'forwarding_id', v_forwarding_id::text,
      'agency_id', p_agency_id::text,
      'agency_name', v_agency.name,
      'recipient_email', v_agency.email,
      'channel', 'EMAIL'
    )
  );

  RETURN v_forwarding_id;
END;
$$;

COMMENT ON FUNCTION public.create_forwarding(UUID, UUID, VARCHAR, TEXT)
  IS 'RN060/RN070. Admin encaminha ocorrência CONFIRMED para órgão ativo. Status não muda. Registra em forwardings + history.';

REVOKE EXECUTE ON FUNCTION public.create_forwarding(UUID, UUID, VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_forwarding(UUID, UUID, VARCHAR, TEXT) TO authenticated;
