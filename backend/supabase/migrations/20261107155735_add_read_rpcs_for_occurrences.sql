-- ============================================================
-- DB-14 — RPCs de leitura para occurrences (recuperação pós DB-13)
-- Depende de DB-01..DB-13.
--
-- Contexto: DB-13 revogou SELECT em `occurrences` de anon/authenticated
-- (fix do vazamento de colunas via PostgREST). As RPCs abaixo restauram as
-- leituras necessárias SEM reabrir o acesso direto à tabela.
--
-- Todas SECURITY DEFINER (bypassam RLS, executam com privilégios do owner)
-- e validam auth.uid() + role + autoria internamente. Não expõem campos
-- privados (author_id, priority, location_original exata) em contexto
-- público/cidadão.
--
-- Endpoints servidos:
--   GET /occurrences/mine          → get_my_occurrences()
--   GET /occurrences/mine/:id      → get_occurrence_detail()
--   GET /admin/occurrences         → admin_list_occurrences()
--   GET /admin/occurrences/:id     → get_occurrence_detail()
--   GET /occurrences/:id/history   → get_occurrence_history()
-- ============================================================

-- ============================================
-- 1. get_my_occurrences — lista próprias (cidadão)
-- ============================================

CREATE OR REPLACE FUNCTION public.get_my_occurrences(
  p_page  INT DEFAULT 1,
  p_limit INT DEFAULT 20
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_uid    UUID := (SELECT auth.uid());
  v_page   INT := GREATEST(p_page, 1);
  v_limit  INT := LEAST(GREATEST(p_limit, 1), 100);
  v_offset INT := (v_page - 1) * v_limit;
  v_total  BIGINT;
  v_data   JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT COUNT(*) INTO v_total FROM public.occurrences WHERE author_id = v_uid;

  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.created_at DESC), '[]'::jsonb)
  INTO v_data
  FROM (
    SELECT
      o.id,
      c.code AS category_code,
      c.name AS category_name,
      o.description,
      o.status,
      o.created_at,
      o.status_updated_at,
      o.resolved_at,
      extensions.ST_AsGeoJSON(
        extensions.ST_SnapToGrid(o.location_original::extensions.geometry, 0.001)
      )::jsonb AS location_approximate,
      CASE WHEN o.location_adjusted IS NULL THEN NULL
           ELSE extensions.ST_AsGeoJSON(
             extensions.ST_SnapToGrid(o.location_adjusted::extensions.geometry, 0.001)
           )::jsonb END AS location_adjusted_approximate,
      public.count_votes(o.id) AS vote_count,
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object(
           'storage_path', p.storage_path,
           'mime_type',    p.mime_type,
           'position',     p.position
         ) ORDER BY p.position)
         FROM public.occurrence_photos p
         WHERE p.occurrence_id = o.id),
        '[]'::jsonb
      ) AS photos
    FROM public.occurrences o
    JOIN public.categories c ON c.id = o.category_id
    WHERE o.author_id = v_uid
    ORDER BY o.created_at DESC
    OFFSET v_offset LIMIT v_limit
  ) t;

  RETURN jsonb_build_object(
    'data', v_data,
    'pagination', jsonb_build_object(
      'page', v_page, 'limit', v_limit,
      'total', v_total,
      'total_pages', CEIL(v_total::numeric / v_limit)::int
    )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_occurrences(INT, INT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_my_occurrences(INT, INT) TO authenticated;

-- ============================================
-- 2. get_occurrence_detail — detalhe (autor ou admin)
-- ============================================
-- Autor recebe campos públicos + fotos + observations CITIZEN_RESPONSE.
-- Admin recebe tudo (author, priority, location exata, campos internos).

CREATE OR REPLACE FUNCTION public.get_occurrence_detail(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_uid       UUID := (SELECT auth.uid());
  v_occ       public.occurrences%ROWTYPE;
  v_is_admin  BOOLEAN;
  v_is_author BOOLEAN;
  v_obs       JSONB;
  v_result    JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_occ FROM public.occurrences WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ocorrência não encontrada.' USING ERRCODE = 'no_data_found';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_uid AND role = 'ADMIN' AND is_active = TRUE
  ) INTO v_is_admin;

  v_is_author := (v_occ.author_id = v_uid);

  IF NOT v_is_admin AND NOT v_is_author THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id',         ob.id,
    'content',    ob.content,
    'visibility', ob.visibility,
    'created_at', ob.created_at
  ) ORDER BY ob.created_at ASC), '[]'::jsonb)
  INTO v_obs
  FROM public.observations ob
  WHERE ob.occurrence_id = p_id
    AND (v_is_admin OR ob.visibility = 'CITIZEN_RESPONSE');

  v_result := jsonb_build_object(
    'id',                 v_occ.id,
    'category_code',      (SELECT code FROM public.categories WHERE id = v_occ.category_id),
    'category_name',      (SELECT name FROM public.categories WHERE id = v_occ.category_id),
    'description',        v_occ.description,
    'status',             v_occ.status,
    'created_at',         v_occ.created_at,
    'status_updated_at',  v_occ.status_updated_at,
    'resolved_at',        v_occ.resolved_at,
    'location_approximate',
      extensions.ST_AsGeoJSON(
        extensions.ST_SnapToGrid(v_occ.location_original::extensions.geometry, 0.001)
      )::jsonb,
    'vote_count',         public.count_votes(v_occ.id),
    'photos', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
         'storage_path', p.storage_path,
         'mime_type',    p.mime_type,
         'position',     p.position
       ) ORDER BY p.position)
       FROM public.occurrence_photos p
       WHERE p.occurrence_id = p_id),
      '[]'::jsonb
    ),
    'observations', v_obs
  );

  IF v_is_admin THEN
    v_result := v_result || jsonb_build_object(
      'author', jsonb_build_object(
        'id',   v_occ.author_id,
        'name', (SELECT name FROM public.profiles WHERE id = v_occ.author_id)
      ),
      'priority',           v_occ.priority,
      'location_original',
        extensions.ST_AsGeoJSON(v_occ.location_original::extensions.geometry)::jsonb,
      'location_adjusted',
        CASE WHEN v_occ.location_adjusted IS NULL THEN NULL
             ELSE extensions.ST_AsGeoJSON(v_occ.location_adjusted::extensions.geometry)::jsonb
        END,
      'location_source',    v_occ.location_source,
      'location_accuracy_m', v_occ.location_accuracy_m,
      'category_source',    v_occ.category_source,
      'description_source', v_occ.description_source,
      'ai_analysis_id',     v_occ.ai_analysis_id
    );
  END IF;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_occurrence_detail(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_occurrence_detail(UUID) TO authenticated;

-- ============================================
-- 3. get_occurrence_history — histórico (autor ou admin)
-- ============================================
-- NOTA para manutenção: se um dia o RPC `add_observation` armazenar
-- OBSERVATION_ADDED com details contendo conteúdo INTERNAL, filtrar aqui.

CREATE OR REPLACE FUNCTION public.get_occurrence_history(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_uid       UUID := (SELECT auth.uid());
  v_occ       public.occurrences%ROWTYPE;
  v_is_admin  BOOLEAN;
  v_is_author BOOLEAN;
  v_data      JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_occ FROM public.occurrences WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ocorrência não encontrada.' USING ERRCODE = 'no_data_found';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_uid AND role = 'ADMIN' AND is_active = TRUE
  ) INTO v_is_admin;

  v_is_author := (v_occ.author_id = v_uid);

  IF NOT v_is_admin AND NOT v_is_author THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id',           h.id,
    'action',       h.action,
    'actor_type',   h.actor_type,
    'previous_data', h.previous_data,
    'new_data',     h.new_data,
    'details',      h.details,
    'created_at',   h.created_at
  ) ORDER BY h.created_at ASC), '[]'::jsonb)
  INTO v_data
  FROM public.occurrence_history h
  WHERE h.occurrence_id = p_id;

  RETURN jsonb_build_object('data', v_data);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_occurrence_history(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_occurrence_history(UUID) TO authenticated;

-- ============================================
-- 4. admin_list_occurrences — lista admin com filtros
-- ============================================
-- p_filters: {
--   "status":   ["RECEIVED","UNDER_ANALYSIS"],
--   "category": ["CAT01","CAT04"],
--   "priority": ["LOW","HIGH"]
-- }
-- p_filters.sort: created_at|priority|status_updated_at (default created_at)
-- p_filters.order: asc|desc (default desc)

CREATE OR REPLACE FUNCTION public.admin_list_occurrences(
  p_filters JSONB DEFAULT '{}'::jsonb,
  p_page    INT   DEFAULT 1,
  p_limit   INT   DEFAULT 20
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_uid         UUID := (SELECT auth.uid());
  v_is_admin    BOOLEAN;
  v_page        INT := GREATEST(p_page, 1);
  v_limit       INT := LEAST(GREATEST(p_limit, 1), 100);
  v_offset      INT := (v_page - 1) * v_limit;
  v_statuses    public.occurrence_status[];
  v_categories  VARCHAR(10)[];
  v_priorities  public.occurrence_priority[];
  v_sort        TEXT := COALESCE(p_filters->>'sort', 'created_at');
  v_order       TEXT := LOWER(COALESCE(p_filters->>'order', 'desc'));
  v_total       BIGINT;
  v_data        JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_uid AND role = 'ADMIN' AND is_active = TRUE
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Apenas administradores ativos.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_sort NOT IN ('created_at', 'priority', 'status_updated_at') THEN
    v_sort := 'created_at';
  END IF;
  IF v_order NOT IN ('asc', 'desc') THEN
    v_order := 'desc';
  END IF;

  IF p_filters ? 'status' THEN
    SELECT array_agg(s::public.occurrence_status) INTO v_statuses
    FROM jsonb_array_elements_text(p_filters->'status') s;
  END IF;
  IF p_filters ? 'category' THEN
    SELECT array_agg(s::VARCHAR(10)) INTO v_categories
    FROM jsonb_array_elements_text(p_filters->'category') s;
  END IF;
  IF p_filters ? 'priority' THEN
    SELECT array_agg(s::public.occurrence_priority) INTO v_priorities
    FROM jsonb_array_elements_text(p_filters->'priority') s;
  END IF;

  SELECT COUNT(*) INTO v_total
  FROM public.occurrences o
  JOIN public.categories c ON c.id = o.category_id
  WHERE (v_statuses   IS NULL OR o.status = ANY(v_statuses))
    AND (v_categories IS NULL OR c.code = ANY(v_categories))
    AND (v_priorities IS NULL OR o.priority = ANY(v_priorities));

  EXECUTE format(
    'SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.%I %s), ''[]''::jsonb)
     FROM (
       SELECT
         o.id,
         c.code AS category_code,
         c.name AS category_name,
         o.description,
         o.status,
         o.priority,
         o.created_at,
         o.status_updated_at,
         o.resolved_at,
         o.author_id,
         (SELECT name FROM public.profiles WHERE id = o.author_id) AS author_name,
         extensions.ST_AsGeoJSON(o.location_original::extensions.geometry)::jsonb AS location_original,
         CASE WHEN o.location_adjusted IS NULL THEN NULL
              ELSE extensions.ST_AsGeoJSON(o.location_adjusted::extensions.geometry)::jsonb END AS location_adjusted,
         o.location_source,
         o.location_accuracy_m,
         o.category_source,
         o.description_source,
         o.ai_analysis_id,
         public.count_votes(o.id) AS vote_count,
         (SELECT COUNT(*) FROM public.occurrence_photos p WHERE p.occurrence_id = o.id)::int AS photo_count
       FROM public.occurrences o
       JOIN public.categories c ON c.id = o.category_id
       WHERE ($1 IS NULL OR o.status   = ANY($1))
         AND ($2 IS NULL OR c.code     = ANY($2))
         AND ($3 IS NULL OR o.priority = ANY($3))
       ORDER BY o.%I %s
       OFFSET $4 LIMIT $5
     ) t',
    v_sort, v_order, v_sort, v_order
  ) INTO v_data
  USING v_statuses, v_categories, v_priorities, v_offset, v_limit;

  RETURN jsonb_build_object(
    'data', v_data,
    'pagination', jsonb_build_object(
      'page', v_page, 'limit', v_limit,
      'total', v_total,
      'total_pages', CEIL(v_total::numeric / v_limit)::int
    )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_occurrences(JSONB, INT, INT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_list_occurrences(JSONB, INT, INT) TO authenticated;