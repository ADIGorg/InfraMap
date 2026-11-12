-- Correção incremental da Sprint 2. NÃO altera migrations históricas.
-- Pré-requisito: migrations até 20261110054000 aplicadas e verificadas.
-- RLS permanece habilitado. SECURITY DEFINER só executa operações explícitas.
-- Autor é SEMPRE obtido do JWT Supabase, nunca inferido de um ID arbitrário.

CREATE OR REPLACE FUNCTION public.assert_active_admin(p_admin_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL OR (SELECT auth.uid()) IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'FORBIDDEN: Credenciais administrativas inválidas.'
      USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_admin_id AND role = 'ADMIN' AND is_active
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: Administrador inativo ou não autorizado.'
      USING ERRCODE = '42501';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.assert_active_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assert_active_admin(UUID) TO authenticated;

-- O contrato antigo de OCC-01 (9 parâmetros) é descartado para aceitar
-- occurrence_id reservado pelo backend após cópia dos objetos no Storage.
-- A versão antiga de DB-10 com outros nomes/tipos permanece por compatibilidade,
-- mas seu EXECUTE será revogado ao final (evita duas formas de finalizar).
DROP FUNCTION IF EXISTS public.finalize_occurrence(
  UUID, UUID, UUID, VARCHAR, DOUBLE PRECISION, DOUBLE PRECISION,
  VARCHAR, VARCHAR, JSONB
);

CREATE FUNCTION public.finalize_occurrence(
  p_author_id UUID,
  p_ai_analysis_id UUID,
  p_category_id UUID,
  p_description VARCHAR(500),
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_category_source VARCHAR,
  p_description_source VARCHAR,
  p_photos JSONB,
  p_occurrence_id UUID
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_analysis public.ai_analyses%ROWTYPE;
  v_photo_count INTEGER;
  v_photo JSONB;
  v_path TEXT;
  v_source_path TEXT;
  v_mime TEXT;
  v_ext TEXT;
  v_size BIGINT;
  v_expected TEXT;
  i INTEGER;
BEGIN
  IF v_uid IS NULL OR v_uid IS DISTINCT FROM p_author_id THEN
    RAISE EXCEPTION 'FORBIDDEN: Usuário não autenticado.' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_uid AND role = 'CITIZEN' AND is_active
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: Apenas cidadãos ativos podem registrar ocorrências.'
      USING ERRCODE = '42501';
  END IF;
  IF p_occurrence_id IS NULL THEN
    RAISE EXCEPTION 'BAD_REQUEST: Identificador da ocorrência obrigatório.'
      USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_analysis
  FROM public.ai_analyses WHERE id = p_ai_analysis_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Análise não encontrada.' USING ERRCODE = 'P0002';
  END IF;
  IF v_analysis.user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'FORBIDDEN: Análise de outro usuário.' USING ERRCODE = '42501';
  END IF;
  IF v_analysis.status <> 'COMPLETED' OR v_analysis.consumed_at IS NOT NULL THEN
    RAISE EXCEPTION 'CONFLICT: Análise não está disponível para finalização.'
      USING ERRCODE = '23505';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.categories WHERE id = p_category_id AND is_active) THEN
    RAISE EXCEPTION 'BAD_REQUEST: Categoria inválida ou inativa.' USING ERRCODE = '22023';
  END IF;
  IF p_description IS NULL OR LENGTH(TRIM(p_description)) NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'BAD_REQUEST: Descrição deve ter 1 a 500 caracteres.'
      USING ERRCODE = '22023';
  END IF;
  IF p_lat IS NULL OR p_lng IS NULL OR NOT (p_lat BETWEEN -90 AND 90)
     OR NOT (p_lng BETWEEN -180 AND 180) THEN
    RAISE EXCEPTION 'BAD_REQUEST: Coordenadas inválidas.' USING ERRCODE = '22023';
  END IF;
  IF p_category_source NOT IN ('AI_CONFIRMED','AI_EDITED','USER_MANUAL')
     OR p_description_source NOT IN ('AI_CONFIRMED','AI_EDITED','USER_MANUAL') THEN
    RAISE EXCEPTION 'BAD_REQUEST: Fonte de campo inválida.' USING ERRCODE = '22023';
  END IF;
  IF p_category_source = 'AI_CONFIRMED'
     AND p_category_id IS DISTINCT FROM v_analysis.suggested_category_id THEN
    RAISE EXCEPTION 'CONFLICT: Categoria não corresponde à sugestão confirmada.'
      USING ERRCODE = '23505';
  END IF;
  IF p_description_source = 'AI_CONFIRMED'
     AND TRIM(p_description) IS DISTINCT FROM TRIM(v_analysis.suggested_description) THEN
    RAISE EXCEPTION 'CONFLICT: Descrição não corresponde à sugestão confirmada.'
      USING ERRCODE = '23505';
  END IF;
  IF p_photos IS NULL OR jsonb_typeof(p_photos) <> 'array'
    OR jsonb_typeof(v_analysis.input_photo_paths) <> 'array' THEN
    RAISE EXCEPTION 'BAD_REQUEST: Lista de fotografias inválida.'
      USING ERRCODE = '22023';
  END IF;
  v_photo_count := jsonb_array_length(p_photos);
  IF v_photo_count NOT BETWEEN 1 AND 3
     OR v_photo_count <> jsonb_array_length(v_analysis.input_photo_paths) THEN
    RAISE EXCEPTION 'BAD_REQUEST: Envie as 1 a 3 fotografias da análise.'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.occurrences (
    id, author_id, category_id, ai_analysis_id, description, status, priority,
    category_source, description_source, location_original, location_source
  ) VALUES (
    p_occurrence_id, v_uid, p_category_id, p_ai_analysis_id, TRIM(p_description),
    'RECEIVED', NULL, p_category_source::public.field_source,
    p_description_source::public.field_source,
    extensions.ST_SetSRID(extensions.ST_MakePoint(p_lng, p_lat),4326)::extensions.geography,
    'GPS'::public.location_source
  );

  FOR i IN 0..(v_photo_count-1) LOOP
    v_photo := p_photos->i;
    IF jsonb_typeof(v_photo) <> 'object' THEN
      RAISE EXCEPTION 'BAD_REQUEST: Metadados da fotografia inválidos.'
        USING ERRCODE = '22023';
    END IF;
    v_mime := v_photo->>'mimeType';
    v_ext := CASE v_mime WHEN 'image/jpeg' THEN 'jpg' WHEN 'image/png' THEN 'png' ELSE NULL END;
    IF v_ext IS NULL OR v_photo->>'sizeBytes' IS NULL OR
       (v_photo->>'sizeBytes') !~ '^[0-9]+
      RAISE EXCEPTION 'BAD_REQUEST: MIME/tamanho de fotografia inválido.'
        USING ERRCODE = '22023';
    END IF;
    v_size := (v_photo->>'sizeBytes')::BIGINT;
    IF v_size NOT BETWEEN 1 AND 5242880 THEN
      RAISE EXCEPTION 'BAD_REQUEST: Fotografia excede limite de 5 MB.'
        USING ERRCODE = '22023';
    END IF;
    v_expected := 'occurrences/' || p_occurrence_id::TEXT || '/photo-' || (i+1)::TEXT || '.' || v_ext;
    v_path := v_photo->>'storagePath';
    v_source_path := v_analysis.input_photo_paths->>i;
    IF v_path IS DISTINCT FROM v_expected
       OR v_source_path IS DISTINCT FROM
           'temporary/' || v_uid::TEXT || '/' || p_ai_analysis_id::TEXT || '/photo-' || (i+1)::TEXT || '.' || v_ext THEN
      RAISE EXCEPTION 'FORBIDDEN: Fotografia fora do fluxo autorizado.'
        USING ERRCODE = '42501';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM storage.objects
      WHERE bucket_id = 'occurrence-photos' AND name = v_path
    ) THEN
      RAISE EXCEPTION 'BAD_REQUEST: Fotografia definitiva não encontrada.'
        USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.occurrence_photos (
      occurrence_id, storage_path, mime_type, size_bytes, position
    ) VALUES (p_occurrence_id, v_path, v_mime, v_size, i+1);
  END LOOP;

  UPDATE public.ai_analyses
    SET status = 'CONSUMED', consumed_at = NOW()
    WHERE id = p_ai_analysis_id;
  INSERT INTO public.occurrence_history (
    occurrence_id, actor_id, actor_type, action, new_data
  ) VALUES (
    p_occurrence_id, v_uid, 'USER', 'OCCURRENCE_CREATED',
    jsonb_build_object('status','RECEIVED','photo_count',v_photo_count,
      'analysis_id',p_ai_analysis_id)
  );
  RETURN p_occurrence_id;
END $$;

REVOKE ALL ON FUNCTION public.finalize_occurrence(
  UUID,UUID,UUID,VARCHAR,DOUBLE PRECISION,DOUBLE PRECISION,VARCHAR,VARCHAR,JSONB,UUID
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_occurrence(
  UUID,UUID,UUID,VARCHAR,DOUBLE PRECISION,DOUBLE PRECISION,VARCHAR,VARCHAR,JSONB,UUID
) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.finalize_occurrence(
  UUID,UUID,VARCHAR,public.field_source,public.field_source,
  DOUBLE PRECISION,DOUBLE PRECISION,public.location_source,NUMERIC,JSONB
) FROM PUBLIC, anon, authenticated;

-- MOD-01: aproveita a máquina de estados transacional já existente em DB-10.
CREATE OR REPLACE FUNCTION public.transition_occurrence_status(
  p_occurrence_id UUID, p_admin_id UUID, p_new_status VARCHAR,
  p_justification TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  PERFORM public.assert_active_admin(p_admin_id);
  IF p_new_status NOT IN ('UNDER_ANALYSIS','CONFIRMED','REJECTED') THEN
    RAISE EXCEPTION 'BAD_REQUEST: Status de destino inválido.' USING ERRCODE = '22023';
  END IF;
  PERFORM public.transition_occurrence(
    p_occurrence_id, p_new_status::public.occurrence_status,
    p_justification, NULL, NULL
  );
  RETURN p_occurrence_id;
END $$;

-- MOD-02: prioridade com verificação dentro da transação.
CREATE OR REPLACE FUNCTION public.set_occurrence_priority(
  p_occurrence_id UUID, p_admin_id UUID, p_priority VARCHAR
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_old public.occurrences%ROWTYPE;
BEGIN
  PERFORM public.assert_active_admin(p_admin_id);
  IF p_priority NOT IN ('LOW','MEDIUM','HIGH') THEN
    RAISE EXCEPTION 'BAD_REQUEST: Prioridade inválida.' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_old FROM public.occurrences
   WHERE id = p_occurrence_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Ocorrência não encontrada.' USING ERRCODE = 'P0002';
  END IF;
  IF v_old.status <> 'CONFIRMED' THEN
    RAISE EXCEPTION 'CONFLICT: Prioridade exige ocorrência confirmada.'
      USING ERRCODE = '23505';
  END IF;
  IF v_old.priority::TEXT IS NOT DISTINCT FROM p_priority THEN
    RAISE EXCEPTION 'CONFLICT: Prioridade já definida.' USING ERRCODE = '23505';
  END IF;
  UPDATE public.occurrences SET priority=p_priority::public.occurrence_priority,
    updated_at=NOW() WHERE id=p_occurrence_id;
  INSERT INTO public.occurrence_history (
    occurrence_id,actor_id,actor_type,action,previous_data,new_data
  ) VALUES (
    p_occurrence_id,p_admin_id,'USER','PRIORITY_SET',
    jsonb_build_object('priority',v_old.priority::TEXT),
    jsonb_build_object('priority',p_priority)
  );
  RETURN p_occurrence_id;
END $$;

CREATE OR REPLACE FUNCTION public.start_occurrence_service(
  p_occurrence_id UUID, p_admin_id UUID, p_action_notes TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  PERFORM public.assert_active_admin(p_admin_id);
  IF p_action_notes IS NULL OR LENGTH(TRIM(p_action_notes)) < 10 THEN
    RAISE EXCEPTION 'BAD_REQUEST: Descreva a ação concreta de atendimento.'
      USING ERRCODE = '22023';
  END IF;
  PERFORM public.transition_occurrence(
    p_occurrence_id,'IN_SERVICE'::public.occurrence_status,
    NULL,NULL,TRIM(p_action_notes)
  );
  RETURN p_occurrence_id;
END $$;

CREATE OR REPLACE FUNCTION public.resolve_occurrence(
  p_occurrence_id UUID, p_admin_id UUID, p_resolution_notes TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  PERFORM public.assert_active_admin(p_admin_id);
  PERFORM public.transition_occurrence(
    p_occurrence_id,'RESOLVED'::public.occurrence_status,
    NULLIF(TRIM(p_resolution_notes),''),
    NULL,NULL
  );
  RETURN p_occurrence_id;
END $$;

-- MOD-03: notificações CITIZEN_RESPONSE são geradas APENAS pelo trigger
-- notify_citizen_response, evitando duplicidade.
CREATE OR REPLACE FUNCTION public.create_occurrence_observation(
  p_occurrence_id UUID, p_admin_id UUID, p_content TEXT, p_visibility VARCHAR
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_id UUID;
BEGIN
  PERFORM public.assert_active_admin(p_admin_id);
  IF p_content IS NULL OR LENGTH(TRIM(p_content)) NOT BETWEEN 5 AND 2000
     OR p_visibility NOT IN ('INTERNAL','CITIZEN_RESPONSE') THEN
    RAISE EXCEPTION 'BAD_REQUEST: Conteúdo ou visibilidade inválidos.'
      USING ERRCODE='22023';
  END IF;
  PERFORM 1 FROM public.occurrences WHERE id=p_occurrence_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Ocorrência não encontrada.'
      USING ERRCODE='P0002';
  END IF;
  INSERT INTO public.observations(occurrence_id,admin_id,content,visibility)
  VALUES(p_occurrence_id,p_admin_id,TRIM(p_content),
         p_visibility::public.observation_visibility) RETURNING id INTO v_id;
  INSERT INTO public.occurrence_history (
    occurrence_id,actor_id,actor_type,action,details
  ) VALUES (
    p_occurrence_id,p_admin_id,'USER','OBSERVATION_ADDED',
    jsonb_build_object('observationId',v_id,'visibility',p_visibility)
  );
  RETURN v_id;
END $$;

-- MOD-04: usa a função original segura de DB-10, sem sobrescrever original.
CREATE OR REPLACE FUNCTION public.adjust_occurrence_location(
  p_occurrence_id UUID, p_admin_id UUID,
  p_new_lat DOUBLE PRECISION, p_new_lng DOUBLE PRECISION
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  PERFORM public.assert_active_admin(p_admin_id);
  IF p_new_lat IS NULL OR p_new_lng IS NULL OR
     NOT (p_new_lat BETWEEN -90 AND 90) OR
     NOT (p_new_lng BETWEEN -180 AND 180) THEN
    RAISE EXCEPTION 'BAD_REQUEST: Coordenadas inválidas.' USING ERRCODE='22023';
  END IF;
  PERFORM public.adjust_occurrence_location(p_occurrence_id,p_new_lng,p_new_lat);
  RETURN p_occurrence_id;
END $$;

CREATE OR REPLACE FUNCTION public.correct_occurrence_classification(
  p_occurrence_id UUID, p_admin_id UUID,
  p_new_category_id UUID DEFAULT NULL, p_new_description VARCHAR DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_old public.occurrences%ROWTYPE;
  v_description TEXT := NULLIF(TRIM(p_new_description),'');
BEGIN
  PERFORM public.assert_active_admin(p_admin_id);
  IF p_new_category_id IS NULL AND p_new_description IS NULL THEN
    RAISE EXCEPTION 'BAD_REQUEST: Informe uma correção.' USING ERRCODE='22023';
  END IF;
  IF p_new_description IS NOT NULL AND
     (v_description IS NULL OR LENGTH(v_description)>500) THEN
    RAISE EXCEPTION 'BAD_REQUEST: Descrição inválida.' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_old FROM public.occurrences WHERE id=p_occurrence_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Ocorrência não encontrada.' USING ERRCODE='P0002';
  END IF;
  IF v_old.status IN ('RESOLVED','REJECTED') THEN
    RAISE EXCEPTION 'CONFLICT: Ocorrência encerrada não pode ser corrigida.'
      USING ERRCODE='23505';
  END IF;
  IF p_new_category_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.categories WHERE id=p_new_category_id AND is_active
  ) THEN
    RAISE EXCEPTION 'BAD_REQUEST: Categoria inválida ou inativa.' USING ERRCODE='22023';
  END IF;
  IF (p_new_category_id IS NULL OR p_new_category_id=v_old.category_id) AND
     (v_description IS NULL OR v_description=v_old.description) THEN
    RAISE EXCEPTION 'CONFLICT: Nenhuma alteração efetiva.' USING ERRCODE='23505';
  END IF;
  UPDATE public.occurrences SET
    category_id=COALESCE(p_new_category_id,category_id),
    description=COALESCE(v_description,description),
    category_source=CASE
      WHEN p_new_category_id IS DISTINCT FROM v_old.category_id
        AND p_new_category_id IS NOT NULL
      THEN 'ADMIN_CORRECTED'::public.field_source ELSE category_source END,
    description_source=CASE
      WHEN v_description IS NOT NULL AND v_description IS DISTINCT FROM v_old.description
      THEN 'ADMIN_CORRECTED'::public.field_source ELSE description_source END,
    updated_at=NOW()
   WHERE id=p_occurrence_id;
  INSERT INTO public.occurrence_history (
    occurrence_id,actor_id,actor_type,action,previous_data,new_data
  ) VALUES (
    p_occurrence_id,p_admin_id,'USER','CLASSIFICATION_CORRECTED',
    jsonb_build_object('categoryId',v_old.category_id,'description',v_old.description),
    jsonb_build_object('categoryId',COALESCE(p_new_category_id,v_old.category_id),
      'description',COALESCE(v_description,v_old.description))
  );
  RETURN p_occurrence_id;
END $$;

-- Limitar execução de funções administrativas autenticadas.
REVOKE EXECUTE ON FUNCTION public.transition_occurrence_status(UUID,UUID,VARCHAR,TEXT) FROM PUBLIC,anon;
REVOKE EXECUTE ON FUNCTION public.set_occurrence_priority(UUID,UUID,VARCHAR) FROM PUBLIC,anon;
REVOKE EXECUTE ON FUNCTION public.start_occurrence_service(UUID,UUID,TEXT) FROM PUBLIC,anon;
REVOKE EXECUTE ON FUNCTION public.resolve_occurrence(UUID,UUID,TEXT) FROM PUBLIC,anon;
REVOKE EXECUTE ON FUNCTION public.create_occurrence_observation(UUID,UUID,TEXT,VARCHAR) FROM PUBLIC,anon;
REVOKE EXECUTE ON FUNCTION public.adjust_occurrence_location(UUID,UUID,DOUBLE PRECISION,DOUBLE PRECISION) FROM PUBLIC,anon;
REVOKE EXECUTE ON FUNCTION public.correct_occurrence_classification(UUID,UUID,UUID,VARCHAR) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.transition_occurrence_status(UUID,UUID,VARCHAR,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_occurrence_priority(UUID,UUID,VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_occurrence_service(UUID,UUID,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_occurrence(UUID,UUID,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_occurrence_observation(UUID,UUID,TEXT,VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_occurrence_location(UUID,UUID,DOUBLE PRECISION,DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION public.correct_occurrence_classification(UUID,UUID,UUID,VARCHAR) TO authenticated;

-- As consultas com p_role/p_user_id são chamadas EXCLUSIVAMENTE pelo backend,
-- que usa uma chave server-side. Clientes anon/authenticated não podem forjar
-- os papéis passando diretamente parâmetros RPC.
REVOKE EXECUTE ON FUNCTION public.list_occurrences(
  TEXT,UUID,TEXT[],UUID,DOUBLE PRECISION,DOUBLE PRECISION,
  DOUBLE PRECISION,DOUBLE PRECISION,INT,INT,TEXT
) FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.get_occurrence(TEXT,UUID,UUID)
FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.list_occurrences(
  TEXT,UUID,TEXT[],UUID,DOUBLE PRECISION,DOUBLE PRECISION,
  DOUBLE PRECISION,DOUBLE PRECISION,INT,INT,TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_occurrence(TEXT,UUID,UUID) TO service_role;
 THEN
      RAISE EXCEPTION 'BAD_REQUEST: MIME/tamanho de fotografia inválido.'
        USING ERRCODE = '22023';
    END IF;
    v_size := (v_photo->>'sizeBytes')::BIGINT;
    IF v_size NOT BETWEEN 1 AND 5242880 THEN
      RAISE EXCEPTION 'BAD_REQUEST: Fotografia excede limite de 5 MB.'
        USING ERRCODE = '22023';
    END IF;
    v_expected := 'occurrences/' || p_occurrence_id::TEXT || '/photo-' || (i+1)::TEXT || '.' || v_ext;
    v_path := v_photo->>'storagePath';
    v_source_path := v_analysis.input_photo_paths->>i;
    IF v_path IS DISTINCT FROM v_expected
       OR v_source_path IS DISTINCT FROM
           'temporary/' || v_uid::TEXT || '/' || p_ai_analysis_id::TEXT || '/photo-' || (i+1)::TEXT || '.' || v_ext THEN
      RAISE EXCEPTION 'FORBIDDEN: Fotografia fora do fluxo autorizado.'
        USING ERRCODE = '42501';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM storage.objects
      WHERE bucket_id = 'occurrence-photos' AND name = v_path
    ) THEN
      RAISE EXCEPTION 'BAD_REQUEST: Fotografia definitiva não encontrada.'
        USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.occurrence_photos (
      occurrence_id, storage_path, mime_type, size_bytes, position
    ) VALUES (p_occurrence_id, v_path, v_mime, v_size, i+1);
  END LOOP;

  UPDATE public.ai_analyses
    SET status = 'CONSUMED', consumed_at = NOW()
    WHERE id = p_ai_analysis_id;
  INSERT INTO public.occurrence_history (
    occurrence_id, actor_id, actor_type, action, new_data
  ) VALUES (
    p_occurrence_id, v_uid, 'USER', 'OCCURRENCE_CREATED',
    jsonb_build_object('status','RECEIVED','photo_count',v_photo_count,
      'analysis_id',p_ai_analysis_id)
  );
  RETURN p_occurrence_id;
END $$;

REVOKE ALL ON FUNCTION public.finalize_occurrence(
  UUID,UUID,UUID,VARCHAR,DOUBLE PRECISION,DOUBLE PRECISION,VARCHAR,VARCHAR,JSONB,UUID
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_occurrence(
  UUID,UUID,UUID,VARCHAR,DOUBLE PRECISION,DOUBLE PRECISION,VARCHAR,VARCHAR,JSONB,UUID
) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.finalize_occurrence(
  UUID,UUID,VARCHAR,public.field_source,public.field_source,
  DOUBLE PRECISION,DOUBLE PRECISION,public.location_source,NUMERIC,JSONB
) FROM PUBLIC, anon, authenticated;

-- MOD-01: aproveita a máquina de estados transacional já existente em DB-10.
CREATE OR REPLACE FUNCTION public.transition_occurrence_status(
  p_occurrence_id UUID, p_admin_id UUID, p_new_status VARCHAR,
  p_justification TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  PERFORM public.assert_active_admin(p_admin_id);
  IF p_new_status NOT IN ('UNDER_ANALYSIS','CONFIRMED','REJECTED') THEN
    RAISE EXCEPTION 'BAD_REQUEST: Status de destino inválido.' USING ERRCODE = '22023';
  END IF;
  PERFORM public.transition_occurrence(
    p_occurrence_id, p_new_status::public.occurrence_status,
    p_justification, NULL, NULL
  );
  RETURN p_occurrence_id;
END $$;

-- MOD-02: prioridade com verificação dentro da transação.
CREATE OR REPLACE FUNCTION public.set_occurrence_priority(
  p_occurrence_id UUID, p_admin_id UUID, p_priority VARCHAR
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_old public.occurrences%ROWTYPE;
BEGIN
  PERFORM public.assert_active_admin(p_admin_id);
  IF p_priority NOT IN ('LOW','MEDIUM','HIGH') THEN
    RAISE EXCEPTION 'BAD_REQUEST: Prioridade inválida.' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_old FROM public.occurrences
   WHERE id = p_occurrence_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Ocorrência não encontrada.' USING ERRCODE = 'P0002';
  END IF;
  IF v_old.status <> 'CONFIRMED' THEN
    RAISE EXCEPTION 'CONFLICT: Prioridade exige ocorrência confirmada.'
      USING ERRCODE = '23505';
  END IF;
  IF v_old.priority::TEXT IS NOT DISTINCT FROM p_priority THEN
    RAISE EXCEPTION 'CONFLICT: Prioridade já definida.' USING ERRCODE = '23505';
  END IF;
  UPDATE public.occurrences SET priority=p_priority::public.occurrence_priority,
    updated_at=NOW() WHERE id=p_occurrence_id;
  INSERT INTO public.occurrence_history (
    occurrence_id,actor_id,actor_type,action,previous_data,new_data
  ) VALUES (
    p_occurrence_id,p_admin_id,'USER','PRIORITY_SET',
    jsonb_build_object('priority',v_old.priority::TEXT),
    jsonb_build_object('priority',p_priority)
  );
  RETURN p_occurrence_id;
END $$;

CREATE OR REPLACE FUNCTION public.start_occurrence_service(
  p_occurrence_id UUID, p_admin_id UUID, p_action_notes TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  PERFORM public.assert_active_admin(p_admin_id);
  IF p_action_notes IS NULL OR LENGTH(TRIM(p_action_notes)) < 10 THEN
    RAISE EXCEPTION 'BAD_REQUEST: Descreva a ação concreta de atendimento.'
      USING ERRCODE = '22023';
  END IF;
  PERFORM public.transition_occurrence(
    p_occurrence_id,'IN_SERVICE'::public.occurrence_status,
    NULL,NULL,TRIM(p_action_notes)
  );
  RETURN p_occurrence_id;
END $$;

CREATE OR REPLACE FUNCTION public.resolve_occurrence(
  p_occurrence_id UUID, p_admin_id UUID, p_resolution_notes TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  PERFORM public.assert_active_admin(p_admin_id);
  PERFORM public.transition_occurrence(
    p_occurrence_id,'RESOLVED'::public.occurrence_status,
    NULLIF(TRIM(p_resolution_notes),''),
    NULL,NULL
  );
  RETURN p_occurrence_id;
END $$;

-- MOD-03: notificações CITIZEN_RESPONSE são geradas APENAS pelo trigger
-- notify_citizen_response, evitando duplicidade.
CREATE OR REPLACE FUNCTION public.create_occurrence_observation(
  p_occurrence_id UUID, p_admin_id UUID, p_content TEXT, p_visibility VARCHAR
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_id UUID;
BEGIN
  PERFORM public.assert_active_admin(p_admin_id);
  IF p_content IS NULL OR LENGTH(TRIM(p_content)) NOT BETWEEN 5 AND 2000
     OR p_visibility NOT IN ('INTERNAL','CITIZEN_RESPONSE') THEN
    RAISE EXCEPTION 'BAD_REQUEST: Conteúdo ou visibilidade inválidos.'
      USING ERRCODE='22023';
  END IF;
  PERFORM 1 FROM public.occurrences WHERE id=p_occurrence_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Ocorrência não encontrada.'
      USING ERRCODE='P0002';
  END IF;
  INSERT INTO public.observations(occurrence_id,admin_id,content,visibility)
  VALUES(p_occurrence_id,p_admin_id,TRIM(p_content),
         p_visibility::public.observation_visibility) RETURNING id INTO v_id;
  INSERT INTO public.occurrence_history (
    occurrence_id,actor_id,actor_type,action,details
  ) VALUES (
    p_occurrence_id,p_admin_id,'USER','OBSERVATION_ADDED',
    jsonb_build_object('observationId',v_id,'visibility',p_visibility)
  );
  RETURN v_id;
END $$;

-- MOD-04: usa a função original segura de DB-10, sem sobrescrever original.
CREATE OR REPLACE FUNCTION public.adjust_occurrence_location(
  p_occurrence_id UUID, p_admin_id UUID,
  p_new_lat DOUBLE PRECISION, p_new_lng DOUBLE PRECISION
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  PERFORM public.assert_active_admin(p_admin_id);
  IF p_new_lat IS NULL OR p_new_lng IS NULL OR
     NOT (p_new_lat BETWEEN -90 AND 90) OR
     NOT (p_new_lng BETWEEN -180 AND 180) THEN
    RAISE EXCEPTION 'BAD_REQUEST: Coordenadas inválidas.' USING ERRCODE='22023';
  END IF;
  PERFORM public.adjust_occurrence_location(p_occurrence_id,p_new_lng,p_new_lat);
  RETURN p_occurrence_id;
END $$;

CREATE OR REPLACE FUNCTION public.correct_occurrence_classification(
  p_occurrence_id UUID, p_admin_id UUID,
  p_new_category_id UUID DEFAULT NULL, p_new_description VARCHAR DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_old public.occurrences%ROWTYPE;
  v_description TEXT := NULLIF(TRIM(p_new_description),'');
BEGIN
  PERFORM public.assert_active_admin(p_admin_id);
  IF p_new_category_id IS NULL AND p_new_description IS NULL THEN
    RAISE EXCEPTION 'BAD_REQUEST: Informe uma correção.' USING ERRCODE='22023';
  END IF;
  IF p_new_description IS NOT NULL AND
     (v_description IS NULL OR LENGTH(v_description)>500) THEN
    RAISE EXCEPTION 'BAD_REQUEST: Descrição inválida.' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_old FROM public.occurrences WHERE id=p_occurrence_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Ocorrência não encontrada.' USING ERRCODE='P0002';
  END IF;
  IF v_old.status IN ('RESOLVED','REJECTED') THEN
    RAISE EXCEPTION 'CONFLICT: Ocorrência encerrada não pode ser corrigida.'
      USING ERRCODE='23505';
  END IF;
  IF p_new_category_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.categories WHERE id=p_new_category_id AND is_active
  ) THEN
    RAISE EXCEPTION 'BAD_REQUEST: Categoria inválida ou inativa.' USING ERRCODE='22023';
  END IF;
  IF (p_new_category_id IS NULL OR p_new_category_id=v_old.category_id) AND
     (v_description IS NULL OR v_description=v_old.description) THEN
    RAISE EXCEPTION 'CONFLICT: Nenhuma alteração efetiva.' USING ERRCODE='23505';
  END IF;
  UPDATE public.occurrences SET
    category_id=COALESCE(p_new_category_id,category_id),
    description=COALESCE(v_description,description),
    category_source=CASE
      WHEN p_new_category_id IS DISTINCT FROM v_old.category_id
        AND p_new_category_id IS NOT NULL
      THEN 'ADMIN_CORRECTED'::public.field_source ELSE category_source END,
    description_source=CASE
      WHEN v_description IS NOT NULL AND v_description IS DISTINCT FROM v_old.description
      THEN 'ADMIN_CORRECTED'::public.field_source ELSE description_source END,
    updated_at=NOW()
   WHERE id=p_occurrence_id;
  INSERT INTO public.occurrence_history (
    occurrence_id,actor_id,actor_type,action,previous_data,new_data
  ) VALUES (
    p_occurrence_id,p_admin_id,'USER','CLASSIFICATION_CORRECTED',
    jsonb_build_object('categoryId',v_old.category_id,'description',v_old.description),
    jsonb_build_object('categoryId',COALESCE(p_new_category_id,v_old.category_id),
      'description',COALESCE(v_description,v_old.description))
  );
  RETURN p_occurrence_id;
END $$;

-- Limitar execução de funções administrativas autenticadas.
REVOKE EXECUTE ON FUNCTION public.transition_occurrence_status(UUID,UUID,VARCHAR,TEXT) FROM PUBLIC,anon;
REVOKE EXECUTE ON FUNCTION public.set_occurrence_priority(UUID,UUID,VARCHAR) FROM PUBLIC,anon;
REVOKE EXECUTE ON FUNCTION public.start_occurrence_service(UUID,UUID,TEXT) FROM PUBLIC,anon;
REVOKE EXECUTE ON FUNCTION public.resolve_occurrence(UUID,UUID,TEXT) FROM PUBLIC,anon;
REVOKE EXECUTE ON FUNCTION public.create_occurrence_observation(UUID,UUID,TEXT,VARCHAR) FROM PUBLIC,anon;
REVOKE EXECUTE ON FUNCTION public.adjust_occurrence_location(UUID,UUID,DOUBLE PRECISION,DOUBLE PRECISION) FROM PUBLIC,anon;
REVOKE EXECUTE ON FUNCTION public.correct_occurrence_classification(UUID,UUID,UUID,VARCHAR) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.transition_occurrence_status(UUID,UUID,VARCHAR,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_occurrence_priority(UUID,UUID,VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_occurrence_service(UUID,UUID,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_occurrence(UUID,UUID,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_occurrence_observation(UUID,UUID,TEXT,VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_occurrence_location(UUID,UUID,DOUBLE PRECISION,DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION public.correct_occurrence_classification(UUID,UUID,UUID,VARCHAR) TO authenticated;

-- As consultas com p_role/p_user_id são chamadas EXCLUSIVAMENTE pelo backend,
-- que usa uma chave server-side. Clientes anon/authenticated não podem forjar
-- os papéis passando diretamente parâmetros RPC.
REVOKE EXECUTE ON FUNCTION public.list_occurrences(
  TEXT,UUID,TEXT[],UUID,DOUBLE PRECISION,DOUBLE PRECISION,
  DOUBLE PRECISION,DOUBLE PRECISION,INT,INT,TEXT
) FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.get_occurrence(TEXT,UUID,UUID)
FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.list_occurrences(
  TEXT,UUID,TEXT[],UUID,DOUBLE PRECISION,DOUBLE PRECISION,
  DOUBLE PRECISION,DOUBLE PRECISION,INT,INT,TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_occurrence(TEXT,UUID,UUID) TO service_role;
