-- API1-102 / BE-CTX-03: photo consent is opt-in, never inferred from status.
-- Existing occurrence rows are deliberately classified PRIVATE (FALSE).
-- Private Storage bucket stays private; signed URLs require backend checks.
-- Migration must be validated in disposable LOCAL Supabase before application.
BEGIN;

ALTER TABLE public.occurrences
  ADD COLUMN photo_public_consent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN photo_public_consent_at TIMESTAMPTZ,
  ADD COLUMN photo_consent_notice_version TEXT;

ALTER TABLE public.occurrences
  ADD CONSTRAINT occurrences_photo_consent_evidence_check CHECK (
    (photo_public_consent = FALSE
      AND photo_public_consent_at IS NULL AND photo_consent_notice_version IS NULL)
    OR
    (photo_public_consent = TRUE
      AND photo_public_consent_at IS NOT NULL
      AND photo_consent_notice_version = 'RN017-2026-11-15')
  );

COMMENT ON COLUMN public.occurrences.photo_public_consent
  IS 'RN017. TRUE only after explicit citizen opt-in to public photos. Existing/missing choices are FALSE.';
COMMENT ON COLUMN public.occurrences.photo_public_consent_at
  IS 'Timestamp for recorded explicit public-photo opt-in (NULL when private).';
COMMENT ON COLUMN public.occurrences.photo_consent_notice_version
  IS 'Version of RN017 opt-in notice shown on mobile (NULL when private).';

-- Re-create instead of overloading: PostgREST must not face ambiguous functions
-- when callers omit the new defaulted argument. No dependent database objects use
-- this RPC as an object reference (callers resolve the routine by name).
DROP FUNCTION public.finalize_occurrence(
  UUID, UUID, VARCHAR, public.field_source, public.field_source,
  DOUBLE PRECISION, DOUBLE PRECISION, public.location_source,
  NUMERIC, JSONB
);

CREATE OR REPLACE FUNCTION public.finalize_occurrence(
  p_analysis_id       UUID,
  p_category_id       UUID,
  p_description       VARCHAR(500),
  p_category_source   public.field_source,
  p_description_source public.field_source,
  p_location_lon      DOUBLE PRECISION,
  p_location_lat      DOUBLE PRECISION,
  p_location_source   public.location_source,
  p_location_accuracy_m NUMERIC DEFAULT NULL,
  p_photos            JSONB DEFAULT '[]'::jsonb,
  p_photo_public_consent BOOLEAN DEFAULT FALSE
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
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_analysis FROM public.ai_analyses WHERE id = p_analysis_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Análise não encontrada.' USING ERRCODE = 'no_data_found';
  END IF;
  IF v_analysis.user_id <> v_uid THEN
    RAISE EXCEPTION 'Análise pertence a outro usuário.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_analysis.status <> 'COMPLETED' THEN
    RAISE EXCEPTION 'Análise deve estar COMPLETED. Atual: %.', v_analysis.status
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF v_analysis.consumed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Análise já consumida.' USING ERRCODE = 'unique_violation';
  END IF;

  SELECT is_active INTO v_category_active FROM public.categories WHERE id = p_category_id;
  IF NOT FOUND OR NOT v_category_active THEN
    RAISE EXCEPTION 'Categoria inválida ou inativa.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_description IS NULL OR char_length(p_description) = 0 OR char_length(p_description) > 500 THEN
    RAISE EXCEPTION 'Descrição deve ter 1 a 500 caracteres.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF v_photo_count < 1 OR v_photo_count > 3 THEN
    RAISE EXCEPTION 'Necessário 1 a 3 fotos. Recebido: %.', v_photo_count
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_location_lon IS NULL OR p_location_lat IS NULL THEN
    RAISE EXCEPTION 'Localização obrigatória.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  INSERT INTO public.occurrences (
    id, author_id, category_id, ai_analysis_id, description,
    status, priority, category_source, description_source,
    location_original, location_source, location_accuracy_m,
    photo_public_consent, photo_public_consent_at, photo_consent_notice_version
  ) VALUES (
    v_occ_id, v_uid, p_category_id, p_analysis_id, p_description,
    'RECEIVED', NULL, p_category_source, p_description_source,
    extensions.ST_SetSRID(
      extensions.ST_MakePoint(p_location_lon, p_location_lat), 4326
    )::extensions.geography,
    p_location_source, p_location_accuracy_m,
    COALESCE(p_photo_public_consent, FALSE),
    CASE WHEN p_photo_public_consent IS TRUE THEN NOW() ELSE NULL END,
    CASE WHEN p_photo_public_consent IS TRUE THEN 'RN017-2026-11-15' ELSE NULL END
  );

  FOR i IN 0..(v_photo_count - 1) LOOP
    v_photo := p_photos->i;
    v_mime  := v_photo->>'mime_type';
    v_size  := (v_photo->>'size_bytes')::BIGINT;
    v_ext   := CASE v_mime WHEN 'image/jpeg' THEN 'jpg' WHEN 'image/png' THEN 'png' END;
    IF v_ext IS NULL THEN
      RAISE EXCEPTION 'MIME inválido: %.', v_mime USING ERRCODE = 'invalid_parameter_value';
    END IF;
    v_position := i + 1;
    INSERT INTO public.occurrence_photos
      (occurrence_id, storage_path, mime_type, size_bytes, position)
    VALUES (
      v_occ_id,
      'occurrences/' || v_occ_id::text || '/photo-' || v_position || '.' || v_ext,
      v_mime, v_size, v_position
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
      'photo_public_consent', COALESCE(p_photo_public_consent, FALSE),
      'photo_consent_notice_version', CASE WHEN p_photo_public_consent IS TRUE THEN 'RN017-2026-11-15' ELSE NULL END
    )
  );

  RETURN QUERY SELECT v_occ_id, 'RECEIVED'::public.occurrence_status;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_occurrence(
  UUID, UUID, VARCHAR, public.field_source, public.field_source,
  DOUBLE PRECISION, DOUBLE PRECISION, public.location_source,
  NUMERIC, JSONB, BOOLEAN
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_occurrence(
  UUID, UUID, VARCHAR, public.field_source, public.field_source,
  DOUBLE PRECISION, DOUBLE PRECISION, public.location_source,
  NUMERIC, JSONB, BOOLEAN
) TO authenticated;

-- The existing RLS for occurrence_photos calls this helper to decide access
-- to private metadata. Author/admin can always view, third parties only after
-- explicit consent AND public status/visibility. Not callable by anon.
CREATE OR REPLACE FUNCTION public.is_occurrence_visible(p_occurrence_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.occurrences o
    WHERE o.id = p_occurrence_id AND (
      o.author_id = (SELECT auth.uid())
      OR (SELECT public.is_admin())
      OR (o.status IN ('CONFIRMED', 'IN_SERVICE')
        AND o.public_visible IS TRUE
        AND o.photo_public_consent IS TRUE)
    )
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_occurrence_visible(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_occurrence_visible(UUID) TO authenticated;

COMMIT;
