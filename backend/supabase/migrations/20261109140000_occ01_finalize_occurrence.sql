-- OCC-01: finalização transacional de ocorrência
-- Dependências: DB-03 a DB-10, AI-03, ID-01
--
-- Garante atomicidade: occurrence + photos + consumo da análise + histórico
-- em uma única transação implícita (qualquer falha → rollback total).

-- ============================================================
-- 0. Safety net: garantir valores necessários nos enums
-- ============================================================
DO $$ BEGIN
  ALTER TYPE ai_analysis_status ADD VALUE IF NOT EXISTS 'CONSUMED';
EXCEPTION WHEN undefined_object THEN
  RAISE NOTICE 'Enum ai_analysis_status não encontrado. Ajuste o nome conforme schema.';
END $$;

DO $$ BEGIN
  ALTER TYPE category_source_type ADD VALUE IF NOT EXISTS 'MANUAL';
EXCEPTION WHEN undefined_object THEN
  RAISE NOTICE 'Enum category_source_type não encontrado.';
END $$;

DO $$ BEGIN
  ALTER TYPE description_source_type ADD VALUE IF NOT EXISTS 'MANUAL';
EXCEPTION WHEN undefined_object THEN
  RAISE NOTICE 'Enum description_source_type não encontrado.';
END $$;

-- ============================================================
-- 1. Função transacional de finalização
-- ============================================================
CREATE OR REPLACE FUNCTION finalize_occurrence(
  p_author_id UUID,
  p_ai_analysis_id UUID,
  p_category_id UUID,
  p_description VARCHAR(500),
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_category_source VARCHAR,
  p_description_source VARCHAR,
  p_photos JSONB
) RETURNS UUID AS $$
DECLARE
  v_occurrence_id UUID;
  v_analysis_user UUID;
  v_analysis_status VARCHAR;
  v_category_active BOOLEAN;
  v_existing_occurrence UUID;
  v_photo JSONB;
  v_position INT := 0;
  v_photo_count INT;
  v_expected_prefix TEXT;
BEGIN
  -- 1. Validar cidadão ativo (RN002) — defesa em profundidade
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_author_id
      AND role = 'CITIZEN'
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: Apenas cidadãos ativos podem registrar ocorrências.';
  END IF;

  -- 2. Lock na análise (evita race condition entre duas requisições)
  SELECT user_id, status
    INTO v_analysis_user, v_analysis_status
    FROM ai_analyses
   WHERE id = p_ai_analysis_id
   FOR UPDATE;

  IF v_analysis_user IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: Análise de IA não encontrada.';
  END IF;

  -- 3. Propriedade da análise
  IF v_analysis_user != p_author_id THEN
    RAISE EXCEPTION 'FORBIDDEN: A análise não pertence a este cidadão.';
  END IF;

  -- 4. Análise concluída
  IF v_analysis_status != 'COMPLETED' THEN
    RAISE EXCEPTION 'CONFLICT: A análise não está COMPLETED. Status atual: %.', v_analysis_status;
  END IF;

  -- 5. Análise não consumida (ai_analysis_id é UNIQUE)
  SELECT id INTO v_existing_occurrence
    FROM occurrences
   WHERE ai_analysis_id = p_ai_analysis_id;
  IF v_existing_occurrence IS NOT NULL THEN
    RAISE EXCEPTION 'CONFLICT: Esta análise já foi consumida por uma ocorrência.';
  END IF;

  -- 6. Categoria válida e ativa (RN007)
  SELECT is_active INTO v_category_active
    FROM categories
   WHERE id = p_category_id;
  IF v_category_active IS NULL OR NOT v_category_active THEN
    RAISE EXCEPTION 'BAD_REQUEST: Categoria inválida ou inativa (RN007).';
  END IF;

  -- 7. Descrição (RN009)
  IF p_description IS NULL OR length(trim(p_description)) = 0 THEN
    RAISE EXCEPTION 'BAD_REQUEST: Descrição é obrigatória (RN009).';
  END IF;
  IF length(p_description) > 500 THEN
    RAISE EXCEPTION 'BAD_REQUEST: Descrição deve ter no máximo 500 caracteres (RN009).';
  END IF;

  -- 8. Localização (RN019)
  IF p_lat IS NULL OR p_lng IS NULL
     OR p_lat < -90 OR p_lat > 90
     OR p_lng < -180 OR p_lng > 180 THEN
    RAISE EXCEPTION 'BAD_REQUEST: Coordenadas inválidas (RN019).';
  END IF;

  -- 9. Fotos (RN010)
  v_photo_count := jsonb_array_length(p_photos);
  IF v_photo_count < 1 OR v_photo_count > 3 THEN
    RAISE EXCEPTION 'BAD_REQUEST: 1 a 3 fotos são obrigatórias (RN010).';
  END IF;

  v_expected_prefix := p_author_id::text || '/' || p_ai_analysis_id::text || '/';

  -- 10. Fontes (RN068)
  IF p_category_source NOT IN ('AI_CONFIRMED', 'AI_EDITED', 'MANUAL') THEN
    RAISE EXCEPTION 'BAD_REQUEST: category_source inválido.';
  END IF;
  IF p_description_source NOT IN ('AI_CONFIRMED', 'AI_EDITED', 'MANUAL') THEN
    RAISE EXCEPTION 'BAD_REQUEST: description_source inválido.';
  END IF;

  -- 11. INSERT da ocorrência com status inicial RECEIVED (RN030)
  INSERT INTO occurrences (
    author_id, category_id, ai_analysis_id, description, status,
    category_source, description_source, location_original
  ) VALUES (
    p_author_id, p_category_id, p_ai_analysis_id, trim(p_description), 'RECEIVED',
    p_category_source::category_source_type,
    p_description_source::description_source_type,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
  ) RETURNING id INTO v_occurrence_id;

  -- 12. INSERT das fotos (com validação de path)
  FOR v_photo IN SELECT * FROM jsonb_array_elements(p_photos)
  LOOP
    IF NOT (v_photo->>'storagePath') LIKE v_expected_prefix || '%' THEN
      RAISE EXCEPTION 'BAD_REQUEST: Path de foto inválido: %', v_photo->>'storagePath';
    END IF;

    INSERT INTO occurrence_photos (
      occurrence_id, storage_path, mime_type, size_bytes, position
    ) VALUES (
      v_occurrence_id,
      v_photo->>'storagePath',
      v_photo->>'mimeType',
      (v_photo->>'sizeBytes')::BIGINT,
      v_position
    );

    v_position := v_position + 1;
  END LOOP;

  -- 13. Consumir a análise
  UPDATE ai_analyses SET status = 'CONSUMED' WHERE id = p_ai_analysis_id;

  -- 14. Histórico (RN039)
  INSERT INTO occurrence_history (occurrence_id, actor_id, action, new_data)
    VALUES (
      v_occurrence_id,
      p_author_id,
      'OCCURRENCE_CREATED',
      jsonb_build_object(
        'status', 'RECEIVED',
        'categorySource', p_category_source,
        'descriptionSource', p_description_source,
        'photosCount', v_photo_count
      )
    );

  RETURN v_occurrence_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;