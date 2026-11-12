-- RN033-RN036: definição e alteração de prioridade por admin
-- Aceita CONFIRMED, IN_SERVICE, RESOLVED (schema CHECK permite priority em todos)
-- Substitui 20261109110000_mod02 (parcial, nunca aplicada)

CREATE OR REPLACE FUNCTION public.update_occurrence_priority(
  p_occurrence_id UUID,
  p_priority      public.occurrence_priority
) RETURNS public.occurrences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid    UUID := (SELECT auth.uid());
  v_occ    public.occurrences%ROWTYPE;
  v_action VARCHAR(100);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores ativos.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_occ FROM public.occurrences WHERE id = p_occurrence_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ocorrência não encontrada.' USING ERRCODE = 'no_data_found';
  END IF;

  IF v_occ.status NOT IN ('CONFIRMED', 'IN_SERVICE', 'RESOLVED') THEN
    RAISE EXCEPTION 'Prioridade só pode ser definida/alterada em CONFIRMED, IN_SERVICE ou RESOLVED. Atual: %.',
      v_occ.status USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF v_occ.priority IS NOT DISTINCT FROM p_priority THEN
    RAISE EXCEPTION 'Prioridade já é %.', p_priority USING ERRCODE = 'invalid_parameter_value';
  END IF;

  v_action := CASE WHEN v_occ.priority IS NULL
                   THEN 'PRIORITY_DEFINED'
                   ELSE 'PRIORITY_UPDATED' END;

  UPDATE public.occurrences
     SET priority = p_priority, updated_at = NOW()
   WHERE id = p_occurrence_id;

  INSERT INTO public.occurrence_history
    (occurrence_id, actor_id, actor_type, action, previous_data, new_data)
  VALUES (
    p_occurrence_id, v_uid, 'USER', v_action,
    CASE WHEN v_occ.priority IS NOT NULL
         THEN jsonb_build_object('priority', v_occ.priority::text)
         ELSE NULL END,
    jsonb_build_object('priority', p_priority::text)
  );

  RETURN (SELECT * FROM public.occurrences WHERE id = p_occurrence_id);
END;
$$;

COMMENT ON FUNCTION public.update_occurrence_priority(UUID, public.occurrence_priority)
  IS 'RN033-RN036. Admin define (PRIORITY_DEFINED) ou altera (PRIORITY_UPDATED) prioridade. Aceita CONFIRMED/IN_SERVICE/RESOLVED.';

REVOKE EXECUTE ON FUNCTION public.update_occurrence_priority(
  UUID, public.occurrence_priority
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_occurrence_priority(
  UUID, public.occurrence_priority
) TO authenticated;
