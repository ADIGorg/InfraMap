-- DB-10: view pública + 4 funções transacionais.
-- Depende de DB-01..DB-09.
--
-- Funções SECURITY DEFINER (bypassam RLS para operações atômicas):
--   - finalize_occurrence: consome análise + cria ocorrência + fotos + histórico.
--   - transition_occurrence: valida + atualiza status + histórico + notificação.
--   - register_vote: ADD/REMOVE voto com validação de papel/autoria/status/unicidade.
--   - adjust_occurrence_location: atualiza location_adjusted, nunca location_original.
--
-- Helper: count_votes — necessário porque o view `security_invoker` executa
-- subqueries como o invocador. RLS de votes não permite SELECT direto a anon
-- nem a authenticated. O helper (DEF) faz o COUNT, expondo apenas o agregado.

-- ============================================
-- 1. Helpers
-- ============================================

CREATE OR REPLACE FUNCTION public.count_votes(p_occurrence_id UUID)
RETURNS BIGINT
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COUNT(*)::BIGINT FROM public.votes WHERE occurrence_id = p_occurrence_id;
$$;

COMMENT ON FUNCTION public.count_votes(UUID) IS
  'Contagem pública de votos. SECURITY DEFINER para viabilizar o view '
  'security_invoker sem expor a tabela votes a anon/authenticated.';

REVOKE EXECUTE ON FUNCTION public.count_votes(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.count_votes(UUID) TO anon, authenticated;

-- ============================================
-- 2. View public_occurrences
-- ============================================
-- Desvio consciente do anexo 02 §10: o subquery `(SELECT COUNT(*) FROM votes)`
-- não funciona com security_invoker=true (RLS de votes bloqueia anon/auth).
-- Substituído por `count_votes(o.id)` — mesmo resultado, só agregado exposto.

CREATE OR REPLACE VIEW public.public_occurrences
WITH (security_invoker = true)
AS
SELECT
  o.id,
  c.code AS category_code,
  c.name AS category_name,
  o.description,
  o.status,
  o.created_at,
  extensions.ST_SnapToGrid(o.location_original::extensions.geometry, 0.001)::extensions.geography
    AS location_approximate,
  public.count_votes(o.id) AS vote_count
FROM public.occurrences o
JOIN public.categories c ON c.id = o.category_id
WHERE o.status IN ('CONFIRMED', 'IN_SERVICE');

COMMENT ON VIEW public.public_occurrences IS
  'Projeção pública: categoria, descrição, status, data, localização aproximada, contagem de votos. '
  'Não expõe author_id, location exata, priority, ai_analysis_id ou paths de Storage.';

GRANT SELECT ON public.public_occurrences TO anon, authenticated;

-- ============================================
-- 3. finalize_occurrence
-- ============================================

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
  p_photos            JSONB DEFAULT '[]'::jsonb
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
      'photo_count', v_photo_count
    )
  );

  RETURN QUERY SELECT v_occ_id, 'RECEIVED'::public.occurrence_status;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.finalize_occurrence(
  UUID, UUID, VARCHAR, public.field_source, public.field_source,
  DOUBLE PRECISION, DOUBLE PRECISION, public.location_source,
  NUMERIC, JSONB
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_occurrence(
  UUID, UUID, VARCHAR, public.field_source, public.field_source,
  DOUBLE PRECISION, DOUBLE PRECISION, public.location_source,
  NUMERIC, JSONB
) TO authenticated;

-- ============================================
-- 4. transition_occurrence
-- ============================================

CREATE OR REPLACE FUNCTION public.transition_occurrence(
  p_occurrence_id UUID,
  p_new_status    public.occurrence_status,
  p_reason        TEXT DEFAULT NULL,
  p_priority      public.occurrence_priority DEFAULT NULL,
  p_action        TEXT DEFAULT NULL
) RETURNS TABLE(occurrence_id UUID, new_status public.occurrence_status)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_occ public.occurrences%ROWTYPE;
  v_is_admin BOOLEAN;
  v_action VARCHAR(100);
  v_title VARCHAR(150);
  v_message TEXT;
  v_resolved_at TIMESTAMPTZ;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_uid AND role = 'ADMIN' AND is_active = TRUE
  ) INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Apenas administradores ativos.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_occ FROM public.occurrences WHERE id = p_occurrence_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ocorrência não encontrada.' USING ERRCODE = 'no_data_found';
  END IF;

  IF v_occ.status = 'RECEIVED' AND p_new_status = 'UNDER_ANALYSIS' THEN
    v_action := 'ANALYSIS_STARTED';
    v_title  := 'Análise iniciada';
    v_message := 'Sua ocorrência entrou em análise.';

  ELSIF v_occ.status = 'UNDER_ANALYSIS' AND p_new_status = 'CONFIRMED' THEN
    v_action := 'OCCURRENCE_CONFIRMED';
    v_title  := 'Ocorrência confirmada';
    v_message := 'Sua ocorrência foi confirmada e está visível no mapa público.';

  ELSIF v_occ.status = 'UNDER_ANALYSIS' AND p_new_status = 'REJECTED' THEN
    IF p_reason IS NULL OR char_length(trim(p_reason)) = 0 THEN
      RAISE EXCEPTION 'Justificativa obrigatória para rejeição.' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    v_action := 'OCCURRENCE_REJECTED';
    v_title  := 'Ocorrência rejeitada';
    v_message := 'Sua ocorrência foi rejeitada. Motivo: ' || p_reason;

  ELSIF v_occ.status = 'CONFIRMED' AND p_new_status = 'IN_SERVICE' THEN
    IF v_occ.priority IS NULL AND p_priority IS NULL THEN
      RAISE EXCEPTION 'Prioridade obrigatória para iniciar atendimento.' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    IF p_action IS NULL OR char_length(trim(p_action)) = 0 THEN
      RAISE EXCEPTION 'Ação concreta obrigatória para iniciar atendimento.' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    v_action := 'STATUS_CHANGED';
    v_title  := 'Atendimento iniciado';
    v_message := 'O atendimento da sua ocorrência foi iniciado. Ação: ' || p_action;

  ELSIF v_occ.status = 'IN_SERVICE' AND p_new_status = 'RESOLVED' THEN
    v_action := 'STATUS_CHANGED';
    v_title  := 'Ocorrência resolvida';
    v_message := 'Sua ocorrência foi resolvida.';
    v_resolved_at := NOW();

  ELSE
    RAISE EXCEPTION 'Transição inválida: % → %.', v_occ.status, p_new_status
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  UPDATE public.occurrences SET
    status = p_new_status,
    status_updated_at = NOW(),
    priority = COALESCE(p_priority, priority),
    resolved_at = COALESCE(v_resolved_at, resolved_at)
  WHERE id = p_occurrence_id;

  INSERT INTO public.occurrence_history
    (occurrence_id, actor_id, actor_type, action, previous_data, new_data, details)
  VALUES (
    p_occurrence_id, v_uid, 'USER', v_action,
    jsonb_build_object('status', v_occ.status::text),
    jsonb_build_object('status', p_new_status::text),
    CASE
      WHEN p_reason IS NOT NULL THEN jsonb_build_object('reason', p_reason)
      WHEN p_action IS NOT NULL THEN jsonb_build_object('action', p_action)
      ELSE NULL
    END
  );

  INSERT INTO public.notifications
    (user_id, occurrence_id, title, message, type)
  VALUES (
    v_occ.author_id, p_occurrence_id, v_title, v_message, 'OCCURRENCE_STATUS_CHANGED'
  );

  RETURN QUERY SELECT p_occurrence_id, p_new_status;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.transition_occurrence(
  UUID, public.occurrence_status, TEXT, public.occurrence_priority, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_occurrence(
  UUID, public.occurrence_status, TEXT, public.occurrence_priority, TEXT
) TO authenticated;

-- ============================================
-- 5. register_vote
-- ============================================

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
    DELETE FROM public.votes WHERE occurrence_id = p_occurrence_id AND user_id = v_uid;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Voto não encontrado.' USING ERRCODE = 'no_data_found';
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.votes WHERE occurrence_id = p_occurrence_id;

  RETURN QUERY SELECT p_occurrence_id, p_action, v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.register_vote(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_vote(UUID, TEXT) TO authenticated;

-- ============================================
-- 6. adjust_occurrence_location
-- ============================================

CREATE OR REPLACE FUNCTION public.adjust_occurrence_location(
  p_occurrence_id UUID,
  p_new_lon       DOUBLE PRECISION,
  p_new_lat       DOUBLE PRECISION
) RETURNS TABLE(occurrence_id UUID, new_location extensions.geography)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_occ public.occurrences%ROWTYPE;
  v_is_admin BOOLEAN;
  v_new_geog extensions.geography;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_uid AND role = 'ADMIN' AND is_active = TRUE
  ) INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Apenas administradores ativos.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_occ FROM public.occurrences WHERE id = p_occurrence_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ocorrência não encontrada.' USING ERRCODE = 'no_data_found';
  END IF;

  IF v_occ.status IN ('RESOLVED', 'REJECTED') THEN
    RAISE EXCEPTION 'Não é possível ajustar ocorrência terminal (%).', v_occ.status
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_new_lon IS NULL OR p_new_lat IS NULL THEN
    RAISE EXCEPTION 'Nova localização obrigatória.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  v_new_geog := extensions.ST_SetSRID(
    extensions.ST_MakePoint(p_new_lon, p_new_lat), 4326
  )::extensions.geography;

  UPDATE public.occurrences
     SET location_adjusted = v_new_geog,
         updated_at = NOW()
   WHERE id = p_occurrence_id;

  INSERT INTO public.occurrence_history
    (occurrence_id, actor_id, actor_type, action, previous_data, new_data)
  VALUES (
    p_occurrence_id, v_uid, 'USER', 'LOCATION_ADJUSTED',
    jsonb_build_object('location_adjusted',
      CASE WHEN v_occ.location_adjusted IS NULL THEN NULL
           ELSE extensions.ST_AsText(v_occ.location_adjusted) END),
    jsonb_build_object('location_adjusted', extensions.ST_AsText(v_new_geog))
  );

  RETURN QUERY SELECT p_occurrence_id, v_new_geog;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.adjust_occurrence_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_occurrence_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;