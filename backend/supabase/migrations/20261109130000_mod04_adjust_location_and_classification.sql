-- MOD-04: Ajuste de localização e correção de classificação
-- Dependências: MOD-01, OCC-02, DB-04, DB-06, DB-10
--
-- IMPORTANTE:
--   * location_original já é protegida por trigger (prevent_location_original_change).
--     Esta migration apenas grava em location_adjusted.
--   * location_adjusted passa a ser a posição exibida nos mapas
--     (a view public_occurrences e a view admin já fazem COALESCE).

-- ============================================================
-- 0. Adicionar 'ADMIN_CORRECTED' aos enums de origem
-- ============================================================
DO $$ BEGIN
  ALTER TYPE category_source_type ADD VALUE IF NOT EXISTS 'ADMIN_CORRECTED';
EXCEPTION WHEN undefined_object THEN
  RAISE NOTICE 'Enum category_source_type não encontrado. Ajuste o nome conforme seu schema.';
END $$;

DO $$ BEGIN
  ALTER TYPE description_source_type ADD VALUE IF NOT EXISTS 'ADMIN_CORRECTED';
EXCEPTION WHEN undefined_object THEN
  RAISE NOTICE 'Enum description_source_type não encontrado. Ajuste o nome conforme seu schema.';
END $$;

-- ============================================================
-- 1. Ajustar localização administrativa (RN020, RN021)
-- ============================================================
CREATE OR REPLACE FUNCTION adjust_occurrence_location(
  p_occurrence_id UUID,
  p_admin_id UUID,
  p_new_lat DOUBLE PRECISION,
  p_new_lng DOUBLE PRECISION
) RETURNS UUID AS $$
DECLARE
  v_admin_role VARCHAR;
  v_admin_active BOOLEAN;
  v_original_lat DOUBLE PRECISION;
  v_original_lng DOUBLE PRECISION;
  v_previous_lat DOUBLE PRECISION;
  v_previous_lng DOUBLE PRECISION;
  v_existed BOOLEAN;
BEGIN
  -- 1. Validar admin ativo
  SELECT role, is_active INTO v_admin_role, v_admin_active
    FROM user_roles WHERE user_id = p_admin_id;
  IF v_admin_role IS NULL OR v_admin_role != 'ADMIN' OR NOT COALESCE(v_admin_active, false) THEN
    RAISE EXCEPTION 'FORBIDDEN: Apenas administradores ativos podem ajustar a localização.';
  END IF;

  -- 2. Validar coordenadas (defesa em profundidade — Zod também valida)
  IF p_new_lat IS NULL OR p_new_lng IS NULL
     OR p_new_lat < -90 OR p_new_lat > 90
     OR p_new_lng < -180 OR p_new_lng > 180 THEN
    RAISE EXCEPTION 'BAD_REQUEST: Coordenadas inválidas.';
  END IF;

  -- 3. Lock + extração das coordenadas (original e ajustada atual)
  SELECT
    ST_Y(location_original::geometry),
    ST_X(location_original::geometry),
    ST_Y(location_adjusted::geometry),
    ST_X(location_adjusted::geometry),
    (location_adjusted IS NOT NULL)
  INTO v_original_lat, v_original_lng, v_previous_lat, v_previous_lng, v_existed
  FROM occurrences
  WHERE id = p_occurrence_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Ocorrência não encontrada.';
  END IF;

  -- 4. Atualizar APENAS location_adjusted
  --    location_original permanece intacta (também protegida por trigger).
  UPDATE occurrences
     SET location_adjusted = ST_SetSRID(ST_MakePoint(p_new_lng, p_new_lat), 4326)::geography,
         updated_at = NOW()
   WHERE id = p_occurrence_id;

  -- 5. Registrar no histórico
  --    previous_data: posição anterior EXIBIDA (ajustada se existia, senão original)
  --    new_data: posição ajustada
  INSERT INTO occurrence_history (occurrence_id, actor_id, action, previous_data, new_data, details)
  VALUES (
    p_occurrence_id,
    p_admin_id,
    'LOCATION_ADJUSTED',
    jsonb_build_object(
      'lat', COALESCE(v_previous_lat, v_original_lat),
      'lng', COALESCE(v_previous_lng, v_original_lng),
      'source', CASE WHEN v_existed THEN 'PREVIOUS_ADJUSTMENT' ELSE 'ORIGINAL' END
    ),
    jsonb_build_object(
      'lat', p_new_lat,
      'lng', p_new_lng,
      'source', 'ADMIN_CORRECTED'
    ),
    jsonb_build_object(
      'original', jsonb_build_object('lat', v_original_lat, 'lng', v_original_lng)
    )
  );

  RETURN p_occurrence_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. Corrigir categoria e/ou descrição (RN068)
-- ============================================================
CREATE OR REPLACE FUNCTION correct_occurrence_classification(
  p_occurrence_id UUID,
  p_admin_id UUID,
  p_new_category_id UUID DEFAULT NULL,
  p_new_description VARCHAR DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_admin_role VARCHAR;
  v_admin_active BOOLEAN;
  v_current_category_id UUID;
  v_current_description VARCHAR;
  v_current_category_source VARCHAR;
  v_current_description_source VARCHAR;
  v_category_was_corrected BOOLEAN := false;
  v_description_was_corrected BOOLEAN := false;
  v_previous_data JSONB := '{}'::jsonb;
  v_new_data JSONB := '{}'::jsonb;
BEGIN
  -- 1. Validar admin ativo
  SELECT role, is_active INTO v_admin_role, v_admin_active
    FROM user_roles WHERE user_id = p_admin_id;
  IF v_admin_role IS NULL OR v_admin_role != 'ADMIN' OR NOT COALESCE(v_admin_active, false) THEN
    RAISE EXCEPTION 'FORBIDDEN: Apenas administradores ativos podem corrigir a classificação.';
  END IF;

  -- 2. Nada para corrigir?
  IF p_new_category_id IS NULL AND p_new_description IS NULL THEN
    RAISE EXCEPTION 'BAD_REQUEST: Informe ao menos uma correção (categoria ou descrição).';
  END IF;

  -- 3. Validar descrição (500 chars, RN009)
  IF p_new_description IS NOT NULL THEN
    IF trim(p_new_description) = '' THEN
      RAISE EXCEPTION 'BAD_REQUEST: A descrição não pode ser vazia.';
    END IF;
    IF length(p_new_description) > 500 THEN
      RAISE EXCEPTION 'BAD_REQUEST: A descrição deve ter no máximo 500 caracteres (RN009).';
    END IF;
  END IF;

  -- 4. Lock + captura do estado atual
  SELECT category_id, description, category_source, description_source
    INTO v_current_category_id, v_current_description,
         v_current_category_source, v_current_description_source
    FROM occurrences
   WHERE id = p_occurrence_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Ocorrência não encontrada.';
  END IF;

  -- 5. Se mudou categoria, validar que a nova existe e está ativa (RN007)
  IF p_new_category_id IS NOT NULL AND p_new_category_id != v_current_category_id THEN
    PERFORM 1 FROM categories WHERE id = p_new_category_id AND is_active = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'BAD_REQUEST: Categoria inválida ou inativa (RN007).';
    END IF;

    v_category_was_corrected := true;
    v_previous_data := v_previous_data || jsonb_build_object('categoryId', v_current_category_id);
    v_new_data := v_new_data || jsonb_build_object('categoryId', p_new_category_id);
  END IF;

  -- 6. Se mudou descrição
  IF p_new_description IS NOT NULL AND trim(p_new_description) != v_current_description THEN
    v_description_was_corrected := true;
    v_previous_data := v_previous_data || jsonb_build_object('description', v_current_description);
    v_new_data := v_new_data || jsonb_build_object('description', trim(p_new_description));
  END IF;

  -- 7. Nenhuma alteração efetiva? Não registrar evento nem atualizar linha.
  IF NOT v_category_was_corrected AND NOT v_description_was_corrected THEN
    RAISE EXCEPTION 'BAD_REQUEST: Os valores informados são idênticos aos atuais. Nada foi alterado.';
  END IF;

  -- 8. UPDATE com categoria/descrição e flags de origem
  UPDATE occurrences
     SET category_id        = COALESCE(p_new_category_id, category_id),
         description        = COALESCE(trim(p_new_description), description),
         category_source    = CASE
                                WHEN v_category_was_corrected
                                  THEN 'ADMIN_CORRECTED'::category_source_type
                                ELSE category_source
                              END,
         description_source = CASE
                                WHEN v_description_was_corrected
                                  THEN 'ADMIN_CORRECTED'::description_source_type
                                ELSE description_source
                              END,
         updated_at         = NOW()
   WHERE id = p_occurrence_id;

  -- 9. Registrar no histórico (RN068, RN039, RN040, RN041)
  INSERT INTO occurrence_history (occurrence_id, actor_id, action, previous_data, new_data, details)
  VALUES (
    p_occurrence_id,
    p_admin_id,
    'CLASSIFICATION_CORRECTED',
    v_previous_data,
    v_new_data,
    jsonb_build_object(
      'categoryCorrected', v_category_was_corrected,
      'descriptionCorrected', v_description_was_corrected,
      'previousCategorySource', v_current_category_source,
      'previousDescriptionSource', v_current_description_source
    )
  );

  RETURN p_occurrence_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;