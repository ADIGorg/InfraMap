-- RN047: admin filtra/ordena ocorrências por número de curtidas
-- p_filters->>'min_votes' (int): filtra por vote_count >= N
-- p_filters->>'sort' = 'votes': ordena por vote_count
-- Retrocompatível: chamadas existentes sem esses campos funcionam igual.

CREATE OR REPLACE FUNCTION public.admin_list_occurrences(
  p_filters JSONB DEFAULT '{}'::jsonb,
  p_page    INT   DEFAULT 1,
  p_limit   INT   DEFAULT 20
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_uid         UUID := (SELECT auth.uid());
  v_page        INT := GREATEST(p_page, 1);
  v_limit       INT := LEAST(GREATEST(p_limit, 1), 100);
  v_offset      INT := (v_page - 1) * v_limit;
  v_statuses    public.occurrence_status[];
  v_categories  VARCHAR(10)[];
  v_priorities  public.occurrence_priority[];
  v_min_votes   INT;
  v_sort        TEXT := COALESCE(p_filters->>'sort', 'created_at');
  v_order       TEXT := LOWER(COALESCE(p_filters->>'order', 'desc'));
  v_sort_col    TEXT;
  v_sort_dir    TEXT;
  v_total       BIGINT;
  v_data        JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores ativos.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_sort NOT IN ('created_at', 'priority', 'status_updated_at', 'votes') THEN
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
  IF p_filters ? 'min_votes' THEN
    BEGIN
      v_min_votes := (p_filters->>'min_votes')::INT;
    EXCEPTION WHEN OTHERS THEN
      v_min_votes := NULL;
    END;
  END IF;

  v_sort_col := CASE v_sort WHEN 'votes' THEN 'vote_count' ELSE v_sort END;
  v_sort_dir := CASE v_order WHEN 'asc' THEN 'ASC' ELSE 'DESC' END;

  SELECT COUNT(*) INTO v_total
  FROM public.occurrences o
  JOIN public.categories c ON c.id = o.category_id
  WHERE (v_statuses   IS NULL OR o.status = ANY(v_statuses))
    AND (v_categories IS NULL OR c.code = ANY(v_categories))
    AND (v_priorities IS NULL OR o.priority = ANY(v_priorities))
    AND (v_min_votes  IS NULL OR public.count_votes(o.id) >= v_min_votes);

  EXECUTE format(
    'SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.%I %s, t.id DESC), ''[]''::jsonb)
     FROM (
       SELECT
         o.id, c.code AS category_code, c.name AS category_name,
         o.description, o.status, o.priority,
         o.created_at, o.status_updated_at, o.resolved_at,
         o.author_id,
         (SELECT name FROM public.profiles WHERE id = o.author_id) AS author_name,
         extensions.ST_AsGeoJSON(o.location_original::extensions.geometry)::jsonb AS location_original,
         CASE WHEN o.location_adjusted IS NULL THEN NULL
              ELSE extensions.ST_AsGeoJSON(o.location_adjusted::extensions.geometry)::jsonb END AS location_adjusted,
         o.location_source, o.location_accuracy_m,
         o.category_source, o.description_source, o.ai_analysis_id,
         o.public_visible,
         public.count_votes(o.id) AS vote_count,
         (SELECT COUNT(*) FROM public.occurrence_photos p WHERE p.occurrence_id = o.id)::int AS photo_count
       FROM public.occurrences o
       JOIN public.categories c ON c.id = o.category_id
       WHERE ($1 IS NULL OR o.status   = ANY($1))
         AND ($2 IS NULL OR c.code     = ANY($2))
         AND ($3 IS NULL OR o.priority = ANY($3))
         AND ($4::int IS NULL OR public.count_votes(o.id) >= $4::int)
       ORDER BY %I %s, o.id DESC
       OFFSET $5 LIMIT $6
     ) t',
    v_sort_col, v_sort_dir, v_sort_col, v_sort_dir
  ) INTO v_data
  USING v_statuses, v_categories, v_priorities, v_min_votes, v_offset, v_limit;

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

COMMENT ON FUNCTION public.admin_list_occurrences(JSONB, INT, INT)
  IS 'RN047. Admin lista ocorrências com filtros status/category/priority/min_votes e sort incluindo votes.';

REVOKE EXECUTE ON FUNCTION public.admin_list_occurrences(JSONB, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_occurrences(JSONB, INT, INT) TO authenticated;
