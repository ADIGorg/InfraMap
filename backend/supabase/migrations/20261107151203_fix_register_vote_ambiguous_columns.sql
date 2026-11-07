-- DB-10 fix: qualifica colunas em register_vote para evitar ambiguity
-- entre os OUT params (RETURNS TABLE) e as colunas de public.votes.

CREATE OR REPLACE FUNCTION public.register_vote(
  p_occurrence_id UUID,
  p_action        TEXT
) RETURNS TABLE(occurrence_id UUID, action TEXT, new_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_occ public.occurrences%ROWTYPE;
  v_role public.app_role;
  v_active BOOLEAN;
  v_count BIGINT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_action NOT IN ('ADD', 'REMOVE') THEN
    RAISE EXCEPTION 'Ação deve ser ADD ou REMOVE.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT role, is_active INTO v_role, v_active FROM public.user_roles WHERE user_id = v_uid;
  IF NOT FOUND OR v_role <> 'CITIZEN' OR NOT v_active THEN
    RAISE EXCEPTION 'Somente cidadãos ativos podem votar.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_occ FROM public.occurrences WHERE id = p_occurrence_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ocorrência não encontrada.' USING ERRCODE = 'no_data_found';
  END IF;

  IF v_occ.author_id = v_uid THEN
    RAISE EXCEPTION 'Autor não pode votar na própria ocorrência.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_occ.status NOT IN ('CONFIRMED', 'IN_SERVICE') THEN
    RAISE EXCEPTION 'Só é possível votar em CONFIRMED ou IN_SERVICE.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_action = 'ADD' THEN
    INSERT INTO public.votes (occurrence_id, user_id) VALUES (p_occurrence_id, v_uid);
  ELSE
    -- ALIAS `v` qualifica: v.occurrence_id resolve coluna, não OUT param.
    DELETE FROM public.votes v
     WHERE v.occurrence_id = p_occurrence_id AND v.user_id = v_uid;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Voto não encontrado.' USING ERRCODE = 'no_data_found';
    END IF;
  END IF;

  -- Mesma qualificação.
  SELECT COUNT(*) INTO v_count FROM public.votes v WHERE v.occurrence_id = p_occurrence_id;

  RETURN QUERY SELECT p_occurrence_id, p_action, v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.register_vote(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_vote(UUID, TEXT) TO authenticated;