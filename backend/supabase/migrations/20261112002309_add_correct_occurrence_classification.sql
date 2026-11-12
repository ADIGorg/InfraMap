-- RN025, RN068: admin corrige categoria e/ou descrição, registrando origem ADMIN_CORRECTED
-- Substitui a versão órfã de 09/11 (mod04) que nunca foi aplicada
-- Remove p_admin_id (usa auth.uid) — alinhado com RPCs 11/07

CREATE OR REPLACE FUNCTION public.correct_occurrence_classification(
  p_occurrence_id     UUID,
  p_new_category_id   UUID DEFAULT NULL,
  p_new_description   VARCHAR(500) DEFAULT NULL
) RETURNS public.occurrences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid               UUID := (SELECT auth.uid());
  v_occ               public.occurrences%ROWTYPE;
  v_cat_active        BOOLEAN;
  v_cat_changed       BOOLEAN := FALSE;
  v_desc_changed      BOOLEAN := FALSE;
  v_prev_data         JSONB := '{}'::jsonb;
  v_new_data          JSONB := '{}'::jsonb;
  v_prev_cat_source   public.field_source;
  v_prev_desc_source  public.field_source;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores ativos.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_new_category_id IS NULL AND p_new_description IS NULL THEN
    RAISE EXCEPTION 'Informe ao menos uma correção.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT * INTO v_occ FROM public.occurrences WHERE id = p_occurrence_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ocorrência não encontrada.' USING ERRCODE = 'no_data_found';
  END IF;

  IF v_occ.status NOT IN ('UNDER_ANALYSIS', 'CONFIRMED', 'IN_SERVICE', 'RESOLVED') THEN
    RAISE EXCEPTION 'Correção só em UNDER_ANALYSIS/CONFIRMED/IN_SERVICE/RESOLVED. Atual: %.',
      v_occ.status USING ERRCODE = 'invalid_parameter_value';
  END IF;

  v_prev_cat_source  := v_occ.category_source;
  v_prev_desc_source := v_occ.description_source;

  IF p_new_category_id IS NOT NULL AND p_new_category_id <> v_occ.category_id THEN
    SELECT is_active INTO v_cat_active FROM public.categories WHERE id = p_new_category_id;
    IF NOT FOUND OR NOT v_cat_active THEN
      RAISE EXCEPTION 'Categoria inválida ou inativa (RN007).' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    v_cat_changed := TRUE;
    v_prev_data := v_prev_data || jsonb_build_object('category_id', v_occ.category_id::text);
    v_new_data  := v_new_data  || jsonb_build_object('category_id', p_new_category_id::text);
  END IF;

  IF p_new_description IS NOT NULL AND trim(p_new_description) <> v_occ.description THEN
    IF char_length(trim(p_new_description)) = 0 THEN
      RAISE EXCEPTION 'Descrição não pode ser vazia.' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    IF char_length(p_new_description) > 500 THEN
      RAISE EXCEPTION 'Descrição máx 500 caracteres (RN009).' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    v_desc_changed := TRUE;
    v_prev_data := v_prev_data || jsonb_build_object('description', v_occ.description);
    v_new_data  := v_new_data  || jsonb_build_object('description', trim(p_new_description));
  END IF;

  IF NOT v_cat_changed AND NOT v_desc_changed THEN
    RAISE EXCEPTION 'Valores idênticos aos atuais. Nada a corrigir.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  UPDATE public.occurrences
     SET category_id        = CASE WHEN v_cat_changed  THEN p_new_category_id   ELSE category_id END,
         description        = CASE WHEN v_desc_changed THEN trim(p_new_description) ELSE description END,
         category_source    = CASE WHEN v_cat_changed  THEN 'ADMIN_CORRECTED'::public.field_source ELSE category_source END,
         description_source = CASE WHEN v_desc_changed THEN 'ADMIN_CORRECTED'::public.field_source ELSE description_source END,
         updated_at         = NOW()
   WHERE id = p_occurrence_id;

  INSERT INTO public.occurrence_history
    (occurrence_id, actor_id, actor_type, action, previous_data, new_data, details)
  VALUES (
    p_occurrence_id, v_uid, 'USER', 'CLASSIFICATION_CORRECTED',
    v_prev_data, v_new_data,
    jsonb_build_object(
      'category_corrected', v_cat_changed,
      'description_corrected', v_desc_changed,
      'previous_category_source', v_prev_cat_source::text,
      'previous_description_source', v_prev_desc_source::text,
      'new_source', 'ADMIN_CORRECTED'
    )
  );

  RETURN (SELECT * FROM public.occurrences WHERE id = p_occurrence_id);
END;
$$;

COMMENT ON FUNCTION public.correct_occurrence_classification(UUID, UUID, VARCHAR)
  IS 'RN025/RN068. Admin corrige categoria/descrição. Marca field_source=ADMIN_CORRECTED no histórico.';

REVOKE EXECUTE ON FUNCTION public.correct_occurrence_classification(UUID, UUID, VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.correct_occurrence_classification(UUID, UUID, VARCHAR) TO authenticated;
