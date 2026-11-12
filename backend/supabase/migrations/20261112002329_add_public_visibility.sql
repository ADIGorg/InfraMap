-- RN022, RN059: admin controla visibilidade no mapa público via flag
-- default TRUE preserva comportamento atual (compatível com prod)
-- public_occurrences_source filtra por public_visible — a view public_occurrences
-- (security_invoker=true) automaticamente respeita, sem precisar recriar.

ALTER TABLE public.occurrences
  ADD COLUMN IF NOT EXISTS public_visible BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.occurrences.public_visible
  IS 'RN022/RN059. Admin pode ocultar ocorrência do mapa público. Default TRUE.';

CREATE OR REPLACE FUNCTION public.set_occurrence_public_visibility(
  p_occurrence_id UUID,
  p_visible       BOOLEAN
) RETURNS public.occurrences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_occ public.occurrences%ROWTYPE;
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

  IF v_occ.status NOT IN ('CONFIRMED', 'IN_SERVICE') THEN
    RAISE EXCEPTION 'Visibilidade só controlada em CONFIRMED ou IN_SERVICE (RN022). Atual: %.',
      v_occ.status USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF v_occ.public_visible = p_visible THEN
    RAISE EXCEPTION 'Visibilidade já é %.', p_visible USING ERRCODE = 'invalid_parameter_value';
  END IF;

  UPDATE public.occurrences
     SET public_visible = p_visible, updated_at = NOW()
   WHERE id = p_occurrence_id;

  INSERT INTO public.occurrence_history
    (occurrence_id, actor_id, actor_type, action, previous_data, new_data)
  VALUES (
    p_occurrence_id, v_uid, 'USER', 'PUBLIC_VISIBILITY_CHANGED',
    jsonb_build_object('public_visible', v_occ.public_visible),
    jsonb_build_object('public_visible', p_visible)
  );

  RETURN (SELECT * FROM public.occurrences WHERE id = p_occurrence_id);
END;
$$;

COMMENT ON FUNCTION public.set_occurrence_public_visibility(UUID, BOOLEAN)
  IS 'RN022/RN059. Admin oculta/reexibe ocorrência CONFIRMED/IN_SERVICE no mapa público.';

REVOKE EXECUTE ON FUNCTION public.set_occurrence_public_visibility(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_occurrence_public_visibility(UUID, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.public_occurrences_source()
RETURNS TABLE (
  id UUID,
  category_id UUID,
  description VARCHAR(500),
  status public.occurrence_status,
  created_at TIMESTAMPTZ,
  location_approximate extensions.geography
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    o.id,
    o.category_id,
    o.description,
    o.status,
    o.created_at,
    extensions.ST_SnapToGrid(o.location_original::extensions.geometry, 0.001)::extensions.geography
  FROM public.occurrences o
  WHERE o.status IN ('CONFIRMED', 'IN_SERVICE')
    AND o.public_visible = TRUE;
$$;

COMMENT ON FUNCTION public.public_occurrences_source()
  IS 'RN022. Fonte da view public_occurrences. Filtra CONFIRMED/IN_SERVICE E public_visible=TRUE.';

REVOKE EXECUTE ON FUNCTION public.public_occurrences_source() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_occurrences_source() TO anon, authenticated;
