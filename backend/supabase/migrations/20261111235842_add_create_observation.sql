-- RN043, RN044: observações administrativas (INTERNAL | CITIZEN_RESPONSE)
-- Substitui 20261109120000_mod03 (nunca aplicada)
-- Correções: B1 (actor_type explícito), Q1 (search_path), Q3 (notification via trigger)

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
  v_uid    UUID := (SELECT auth.uid());
  v_obs_id UUID;
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

  INSERT INTO public.occurrence_history
    (occurrence_id, actor_id, actor_type, action, details)
  VALUES (
    p_occurrence_id, v_uid, 'USER', 'OBSERVATION_ADDED',
    jsonb_build_object(
      'observation_id', v_obs_id::text,
      'visibility', p_visibility::text
    )
  );

  RETURN v_obs_id;
END;
$$;

COMMENT ON FUNCTION public.create_observation(UUID, TEXT, public.observation_visibility)
  IS 'RN043/RN044. Admin cria observação em ocorrência. Trigger notify_citizen_response cuida da notificação em CITIZEN_RESPONSE.';

REVOKE EXECUTE ON FUNCTION public.create_observation(
  UUID, TEXT, public.observation_visibility
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_observation(
  UUID, TEXT, public.observation_visibility
) TO authenticated;
