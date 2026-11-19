-- RN017 - Persistencia explicita do consentimento de publicacao das fotos.
-- Fotos legadas ficam privadas por padrao e nao recebem consentimento retroativo ficticio.

BEGIN;

ALTER TABLE public.occurrence_photos
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS consent_recorded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consent_version VARCHAR(50);

COMMENT ON COLUMN public.occurrence_photos.is_public IS
  'RN017. TRUE somente quando o cidadao concedeu consentimento explicito para exibicao publica.';
COMMENT ON COLUMN public.occurrence_photos.consent_recorded_at IS
  'Data em que o consentimento explicito foi persistido. NULL em fotos legadas.';
COMMENT ON COLUMN public.occurrence_photos.consent_version IS
  'Versao do texto/regra de consentimento aceita. NULL em fotos legadas.';

DROP FUNCTION IF EXISTS public.finalize_occurrence(
  UUID, UUID, VARCHAR, public.field_source, public.field_source,
  DOUBLE PRECISION, DOUBLE PRECISION, public.location_source,
  NUMERIC, JSONB
);

CREATE OR REPLACE FUNCTION public.finalize_occurrence(
  p_analysis_id UUID,
  p_category_id UUID,
  p_description VARCHAR(500),
  p_category_source public.field_source,
  p_description_source public.field_source,
  p_location_lon DOUBLE PRECISION,
  p_location_lat DOUBLE PRECISION,
  p_location_source public.location_source,
  p_photo_public_consent BOOLEAN,
  p_location_accuracy_m NUMERIC DEFAULT NULL,
  p_photos JSONB DEFAULT '[]'::jsonb
) RETURNS TABLE(occurrence_id UUID, status public.occurrence_status)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_analysis public.ai_analyses%ROWTYPE;
  v_category_active BOOLEAN;
  v_photo_count INT := COALESCE(jsonb_array_length(p_photos), 0);
  v_occ_id UUID := gen_random_uuid();
  v_photo JSONB;
  v_position INT;
  v_ext TEXT;
  v_mime TEXT;
  v_size BIGINT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Nao autenticado.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_photo_public_consent IS NULL THEN
    RAISE EXCEPTION 'Consentimento de publicacao das fotos e obrigatorio.'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT * INTO v_analysis FROM public.ai_analyses WHERE id = p_analysis_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Analise nao encontrada.' USING ERRCODE = 'no_data_found';
  END IF;
  IF v_analysis.user_id <> v_uid THEN
    RAISE EXCEPTION 'Analise pertence a outro usuario.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_analysis.status <> 'COMPLETED' THEN
    RAISE EXCEPTION 'Analise deve estar COMPLETED. Atual: %.', v_analysis.status
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF v_analysis.consumed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Analise ja consumida.' USING ERRCODE = 'unique_violation';
  END IF;

  SELECT is_active INTO v_category_active FROM public.categories WHERE id = p_category_id;
  IF NOT FOUND OR NOT v_category_active THEN
    RAISE EXCEPTION 'Categoria invalida ou inativa.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_description IS NULL OR char_length(p_description) = 0 OR char_length(p_description) > 500 THEN
    RAISE EXCEPTION 'Descricao deve ter 1 a 500 caracteres.' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF v_photo_count < 1 OR v_photo_count > 3 THEN
    RAISE EXCEPTION 'Necessario 1 a 3 fotos. Recebido: %.', v_photo_count
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF p_location_lon IS NULL OR p_location_lat IS NULL THEN
    RAISE EXCEPTION 'Localizacao obrigatoria.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  INSERT INTO public.occurrences (
    id, author_id, category_id, ai_analysis_id, description,
    status, priority, category_source, description_source,
    location_original, location_source, location_accuracy_m
  ) VALUES (
    v_occ_id, v_uid, p_category_id, p_analysis_id, p_description,
    'RECEIVED', NULL, p_category_source, p_description_source,
    extensions.ST_SetSRID(
      extensions.ST_MakePoint(p_location_lon, p_location_lat), 4326
    )::extensions.geography,
    p_location_source, p_location_accuracy_m
  );

  FOR i IN 0..(v_photo_count - 1) LOOP
    v_photo := p_photos->i;
    v_mime := v_photo->>'mime_type';
    v_size := (v_photo->>'size_bytes')::BIGINT;
    v_ext := CASE v_mime WHEN 'image/jpeg' THEN 'jpg' WHEN 'image/png' THEN 'png' END;
    IF v_ext IS NULL THEN
      RAISE EXCEPTION 'MIME invalido: %.', v_mime USING ERRCODE = 'invalid_parameter_value';
    END IF;
    v_position := i + 1;
    INSERT INTO public.occurrence_photos (
      occurrence_id, storage_path, mime_type, size_bytes, position,
      is_public, consent_recorded_at, consent_version
    ) VALUES (
      v_occ_id,
      'occurrences/' || v_occ_id::text || '/photo-' || v_position || '.' || v_ext,
      v_mime, v_size, v_position,
      p_photo_public_consent, NOW(), 'photo-public-v1'
    );
  END LOOP;

  UPDATE public.ai_analyses
     SET status = 'CONSUMED', consumed_at = NOW()
   WHERE id = p_analysis_id;

  INSERT INTO public.occurrence_history
    (occurrence_id, actor_id, actor_type, action, new_data)
  VALUES (
    v_occ_id, v_uid, 'USER', 'OCCURRENCE_CREATED',
    jsonb_build_object(
      'status', 'RECEIVED'::text,
      'analysis_id', p_analysis_id::text,
      'photo_count', v_photo_count,
      'photo_public_consent', p_photo_public_consent,
      'consent_version', 'photo-public-v1'
    )
  );

  RETURN QUERY SELECT v_occ_id, 'RECEIVED'::public.occurrence_status;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.finalize_occurrence(
  UUID, UUID, VARCHAR, public.field_source, public.field_source,
  DOUBLE PRECISION, DOUBLE PRECISION, public.location_source,
  BOOLEAN, NUMERIC, JSONB
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_occurrence(
  UUID, UUID, VARCHAR, public.field_source, public.field_source,
  DOUBLE PRECISION, DOUBLE PRECISION, public.location_source,
  BOOLEAN, NUMERIC, JSONB
) TO authenticated;

COMMIT;
