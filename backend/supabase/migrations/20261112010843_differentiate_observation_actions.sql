-- P1-2 (RN040/RN044): diferencia ação de observação INTERNAL vs CITIZEN_RESPONSE
-- para auditoria. Ambas continuam criando 1 linha em observations + 1 em history.

CREATE OR REPLACE FUNCTION public.create_observation(
  p_occurrence_id UUID,
  p_content       TEXT,
  p_visibility    public.observation_visibility
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid      UUID := (SELECT auth.uid());
  v_obs_id   UUID;
  v_action   VARCHAR(100);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores ativos.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_content IS NULL OR char_length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Conteúdo obrigatório.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  PERFORM 1 FROM public.occurrences WHERE id = p_occurrence_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ocorrência não encontrada.' USING ERRCODE = 'no_data_found';
  END IF;

  INSERT INTO public.observations (occurrence_id, admin_id, content, visibility)
  VALUES (p_occurrence_id, v_uid, p_content, p_visibility)
  RETURNING id INTO v_obs_id;

  v_action := CASE p_visibility
    WHEN 'INTERNAL'         THEN 'OBSERVATION_INTERNAL_ADDED'
    WHEN 'CITIZEN_RESPONSE' THEN 'OBSERVATION_CITIZEN_REPLY_ADDED'
  END;

  INSERT INTO public.occurrence_history
    (occurrence_id, actor_id, actor_type, action, details)
  VALUES (
    p_occurrence_id, v_uid, 'USER', v_action,
    jsonb_build_object(
      'observation_id', v_obs_id::text,
      'visibility', p_visibility::text
    )
  );

  RETURN v_obs_id;
END;
$$;