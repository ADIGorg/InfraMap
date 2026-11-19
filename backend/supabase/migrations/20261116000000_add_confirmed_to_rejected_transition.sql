-- API1-101 / BE-CTX-02 — ampliar transição de rejeição em CONFIRMED.
-- Mantém assinatura, privilégios, RLS e efeitos da RPC original.
-- Evidência exigida: envio SENT + texto de resposta do órgão; validação documental
-- de que o órgão é o responsável correto continua sendo obrigação do admin.
-- Requer o histórico / forwardings já criados nas migrations anteriores.

CREATE OR REPLACE FUNCTION public.transition_occurrence(
  p_occurrence_id UUID,
  p_new_status    public.occurrence_status,
  p_reason        TEXT DEFAULT NULL,
  p_priority      public.occurrence_priority DEFAULT NULL,
  p_action        TEXT DEFAULT NULL
) RETURNS TABLE(occurrence_id UUID, new_status public.occurrence_status)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_occ public.occurrences%ROWTYPE;
  v_is_admin BOOLEAN;
  v_action VARCHAR(100);
  v_title VARCHAR(150);
  v_message TEXT;
  v_resolved_at TIMESTAMPTZ;
  v_forwarding_id UUID;
  v_agency_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_uid AND role = 'ADMIN' AND is_active = TRUE
  ) INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Apenas administradores ativos.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_occ FROM public.occurrences WHERE id = p_occurrence_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ocorrência não encontrada.' USING ERRCODE = 'no_data_found';
  END IF;

  IF v_occ.status = 'RECEIVED' AND p_new_status = 'UNDER_ANALYSIS' THEN
    v_action := 'ANALYSIS_STARTED';
    v_title  := 'Análise iniciada';
    v_message := 'Sua ocorrência entrou em análise.';

  ELSIF v_occ.status = 'UNDER_ANALYSIS' AND p_new_status = 'CONFIRMED' THEN
    v_action := 'OCCURRENCE_CONFIRMED';
    v_title  := 'Ocorrência confirmada';
    v_message := 'Sua ocorrência foi confirmada e está visível no mapa público.';

  ELSIF v_occ.status = 'UNDER_ANALYSIS' AND p_new_status = 'REJECTED' THEN
    IF p_reason IS NULL OR char_length(trim(p_reason)) < 10 OR char_length(trim(p_reason)) > 2000 THEN
      RAISE EXCEPTION 'Justificativa obrigatória para rejeição.' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    v_action := 'OCCURRENCE_REJECTED';
    v_title  := 'Ocorrência rejeitada';
    v_message := 'Sua ocorrência foi rejeitada. Motivo: ' || p_reason;

  ELSIF v_occ.status = 'CONFIRMED' AND p_new_status = 'REJECTED' THEN
    -- RN029 (caso 2): somente após encaminhamento efetivamente ENVIADO.
    -- A resposta do órgão precisa ser registrada explicitamente; um e-mail
    -- encaminhado, sozinho, NÃO comprova impossibilidade de atendimento.
    IF p_reason IS NULL OR char_length(trim(p_reason)) NOT BETWEEN 10 AND 2000 THEN
      RAISE EXCEPTION 'Justificativa de rejeição deve ter entre 10 e 2000 caracteres.'
        USING ERRCODE = 'invalid_parameter_value';
    END IF;
    IF p_action IS NULL OR char_length(trim(p_action)) NOT BETWEEN 10 AND 2000 THEN
      RAISE EXCEPTION 'Resposta do órgão responsável é obrigatória para rejeitar CONFIRMED.'
        USING ERRCODE = 'invalid_parameter_value';
    END IF;

    SELECT f.id, f.agency_id INTO v_forwarding_id, v_agency_id
    FROM public.forwardings f
    WHERE f.occurrence_id = p_occurrence_id
      AND f.status = 'SENT'
    ORDER BY f.sent_at DESC NULLS LAST, f.created_at DESC
    LIMIT 1;

    IF v_forwarding_id IS NULL THEN
      RAISE EXCEPTION 'Rejeição após confirmação exige encaminhamento SENT ao órgão responsável.'
        USING ERRCODE = 'invalid_parameter_value';
    END IF;

    v_action := 'OCCURRENCE_REJECTED';
    v_title := 'Ocorrência rejeitada';
    v_message := 'Sua ocorrência foi encerrada sem atendimento. Motivo: ' || trim(p_reason);

  ELSIF v_occ.status = 'CONFIRMED' AND p_new_status = 'IN_SERVICE' THEN
    IF v_occ.priority IS NULL AND p_priority IS NULL THEN
      RAISE EXCEPTION 'Prioridade obrigatória para iniciar atendimento.' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    IF p_action IS NULL OR char_length(trim(p_action)) = 0 THEN
      RAISE EXCEPTION 'Ação concreta obrigatória para iniciar atendimento.' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    v_action := 'STATUS_CHANGED';
    v_title  := 'Atendimento iniciado';
    v_message := 'O atendimento da sua ocorrência foi iniciado. Ação: ' || p_action;

  ELSIF v_occ.status = 'IN_SERVICE' AND p_new_status = 'RESOLVED' THEN
    v_action := 'STATUS_CHANGED';
    v_title  := 'Ocorrência resolvida';
    v_message := 'Sua ocorrência foi resolvida.';
    v_resolved_at := NOW();

  ELSE
    RAISE EXCEPTION 'Transição inválida: % → %.', v_occ.status, p_new_status
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  UPDATE public.occurrences SET
    status = p_new_status,
    status_updated_at = NOW(),
    priority = COALESCE(p_priority, priority),
    resolved_at = COALESCE(v_resolved_at, resolved_at)
  WHERE id = p_occurrence_id;

  INSERT INTO public.occurrence_history
    (occurrence_id, actor_id, actor_type, action, previous_data, new_data, details)
  VALUES (
    p_occurrence_id, v_uid, 'USER', v_action,
    jsonb_build_object('status', v_occ.status::text),
    jsonb_build_object('status', p_new_status::text),
    CASE
      WHEN v_occ.status = 'CONFIRMED' AND p_new_status = 'REJECTED' THEN
        jsonb_build_object(
          'reason', trim(p_reason),
          'agency_response', trim(p_action),
          'forwarding_id', v_forwarding_id,
          'agency_id', v_agency_id,
          'rejection_type', 'SERVICE_IMPOSSIBILITY'
        )
      WHEN p_reason IS NOT NULL THEN jsonb_build_object('reason', trim(p_reason))
      WHEN p_action IS NOT NULL THEN jsonb_build_object('action', p_action)
      ELSE NULL
    END
  );

  INSERT INTO public.notifications
    (user_id, occurrence_id, title, message, type)
  VALUES (
    v_occ.author_id, p_occurrence_id, v_title, v_message, 'OCCURRENCE_STATUS_CHANGED'
  );

  RETURN QUERY SELECT p_occurrence_id, p_new_status;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.transition_occurrence(
  UUID, public.occurrence_status, TEXT, public.occurrence_priority, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_occurrence(
  UUID, public.occurrence_status, TEXT, public.occurrence_priority, TEXT
) TO authenticated;
