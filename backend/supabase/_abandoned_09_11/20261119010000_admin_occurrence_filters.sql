-- API1-104: bairros reais com limites importados; nenhum nome/região fictícios.
BEGIN;
CREATE TABLE public.administrative_neighborhoods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 150),
  municipality text NOT NULL CHECK (length(trim(municipality)) BETWEEN 1 AND 150),
  boundary extensions.geometry(MultiPolygon,4326) NOT NULL,
  source text NOT NULL CHECK (length(trim(source)) > 0),
  is_active boolean NOT NULL DEFAULT true,
  CHECK (extensions.ST_IsValid(boundary) AND NOT extensions.ST_IsEmpty(boundary)),
  CHECK (extensions.ST_XMin(extensions.Box3D(boundary)) >= -180 AND extensions.ST_XMax(extensions.Box3D(boundary)) <= 180
     AND extensions.ST_YMin(extensions.Box3D(boundary)) >= -90 AND extensions.ST_YMax(extensions.Box3D(boundary)) <= 90)
);
CREATE INDEX administrative_neighborhoods_boundary_idx ON public.administrative_neighborhoods USING gist(boundary);
ALTER TABLE public.administrative_neighborhoods ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.administrative_neighborhoods FROM anon, authenticated;
GRANT SELECT ON public.administrative_neighborhoods TO authenticated;
CREATE POLICY administrative_neighborhoods_admin_read ON public.administrative_neighborhoods
  FOR SELECT TO authenticated USING (public.is_admin());

-- Mesma expressão aplicada no total e na página; busca literal, sem SQL dinâmico do usuário.
CREATE FUNCTION public.admin_occurrence_matches_extra_filters(
  o public.occurrences, c public.categories, f jsonb
) RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT
    (f->>'priority_filter' IS NULL OR
      CASE WHEN f->>'priority_filter' = 'UNDEFINED' THEN o.priority IS NULL
           ELSE o.priority::text = f->>'priority_filter' END)
    AND (f->>'createdFrom' IS NULL OR o.created_at >= (f->>'createdFrom')::timestamptz)
    AND (f->>'createdBefore' IS NULL OR o.created_at < (f->>'createdBefore')::timestamptz)
    AND (f->>'q' IS NULL OR
      strpos(lower(o.description), lower(f->>'q')) > 0 OR
      strpos(lower(c.name), lower(f->>'q')) > 0 OR
      strpos(lower(o.id::text), lower(regexp_replace(f->>'q', '^#?[Oo][Cc]-|^#', ''))) > 0)
    AND (f->>'neighborhoodId' IS NULL OR EXISTS (
      SELECT 1 FROM public.administrative_neighborhoods n
      WHERE n.id = (f->>'neighborhoodId')::uuid AND n.is_active
        AND extensions.ST_Covers(n.boundary, COALESCE(o.location_adjusted,o.location_original)::extensions.geometry)
    ));
$$;
REVOKE ALL ON FUNCTION public.admin_occurrence_matches_extra_filters(public.occurrences,public.categories,jsonb) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.admin_list_occurrences(p_filters jsonb DEFAULT '{}'::jsonb, p_page integer DEFAULT 1, p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_uid         UUID := (SELECT auth.uid());
  v_page        INT := GREATEST(p_page, 1);
  v_limit       INT := LEAST(GREATEST(p_limit, 1), 100);
  v_offset      BIGINT := (v_page::bigint - 1) * v_limit;
  v_statuses    public.occurrence_status[];
  v_categories  TEXT[];            -- aceita UUID ou CAT01..07
  v_priorities  public.occurrence_priority[];
  v_min_votes   INT;
  v_sort        TEXT := COALESCE(p_filters->>'sort', 'created_at');
  v_order       TEXT := LOWER(COALESCE(p_filters->>'order', 'desc'));
  v_sort_col    TEXT;
  v_sort_dir    TEXT;
  v_bbox        JSONB := p_filters->'bbox';
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
  IF v_order NOT IN ('asc', 'desc') THEN v_order := 'desc'; END IF;

  IF p_filters ? 'status' THEN
    SELECT array_agg(s::public.occurrence_status) INTO v_statuses
    FROM jsonb_array_elements_text(p_filters->'status') s;
  END IF;
  IF p_filters ? 'category' THEN
    SELECT array_agg(s::TEXT) INTO v_categories
    FROM jsonb_array_elements_text(p_filters->'category') s;
  END IF;
  IF p_filters ? 'priority' THEN
    SELECT array_agg(s::public.occurrence_priority) INTO v_priorities
    FROM jsonb_array_elements_text(p_filters->'priority') s;
  END IF;
  IF p_filters ? 'min_votes' THEN
    BEGIN v_min_votes := (p_filters->>'min_votes')::INT;
    EXCEPTION WHEN OTHERS THEN v_min_votes := NULL; END;
  END IF;

  v_sort_col := CASE v_sort WHEN 'votes' THEN 'vote_count' ELSE v_sort END;
  v_sort_dir := CASE v_order WHEN 'asc' THEN 'ASC' ELSE 'DESC' END;

  SELECT COUNT(*) INTO v_total
  FROM public.occurrences o
  JOIN public.categories c ON c.id = o.category_id
  WHERE public.admin_occurrence_matches_extra_filters(o,c,p_filters)
    AND (v_statuses IS NULL OR o.status = ANY(v_statuses))
    AND (v_categories IS NULL OR c.code::text = ANY(v_categories) OR c.id::text = ANY(v_categories))
    AND (v_priorities IS NULL OR o.priority = ANY(v_priorities))
    AND (v_min_votes IS NULL OR public.count_votes(o.id) >= v_min_votes)
    AND (
      v_bbox IS NULL OR (
        extensions.ST_Y(COALESCE(o.location_adjusted, o.location_original)::extensions.geometry)
          BETWEEN (v_bbox->>'minLat')::DOUBLE PRECISION AND (v_bbox->>'maxLat')::DOUBLE PRECISION
        AND extensions.ST_X(COALESCE(o.location_adjusted, o.location_original)::extensions.geometry)
          BETWEEN (v_bbox->>'minLng')::DOUBLE PRECISION AND (v_bbox->>'maxLng')::DOUBLE PRECISION
      )
    );

  EXECUTE format(
    'SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.%I %s, t.id DESC), ''[]''::jsonb)
     FROM (
       SELECT
         o.id,
         c.id   AS category_id,
         c.code AS category_code,
         c.name AS category_name,
         o.description, o.status, o.priority,
         o.created_at, o.updated_at, o.status_updated_at, o.resolved_at,
         o.author_id,
         (SELECT name FROM public.profiles WHERE id = o.author_id) AS author_name,
         extensions.ST_AsGeoJSON(o.location_original::extensions.geometry)::jsonb AS location_original,
         CASE WHEN o.location_adjusted IS NULL THEN NULL
              ELSE extensions.ST_AsGeoJSON(o.location_adjusted::extensions.geometry)::jsonb END AS location_adjusted,
         o.location_source, o.location_accuracy_m,
         o.category_source, o.description_source, o.ai_analysis_id,
         o.public_visible,
         public.count_votes(o.id) AS vote_count,
         COALESCE(
           (SELECT jsonb_agg(jsonb_build_object(
              ''storage_path'', p.storage_path,
              ''mime_type'',    p.mime_type,
              ''size_bytes'',   p.size_bytes,
              ''position'',     p.position
            ) ORDER BY p.position)
            FROM public.occurrence_photos p WHERE p.occurrence_id = o.id),
           ''[]''::jsonb
         ) AS photos
       FROM public.occurrences o
       JOIN public.categories c ON c.id = o.category_id
       WHERE public.admin_occurrence_matches_extra_filters(o,c,$8)
         AND ($1 IS NULL OR o.status   = ANY($1))
         AND ($2 IS NULL OR c.code::text = ANY($2) OR c.id::text = ANY($2))
         AND ($3 IS NULL OR o.priority = ANY($3))
         AND ($4::int IS NULL OR public.count_votes(o.id) >= $4::int)
         AND (
      $7::jsonb IS NULL OR (
        extensions.ST_Y(COALESCE(o.location_adjusted, o.location_original)::extensions.geometry)
          BETWEEN ($7->>''minLat'')::DOUBLE PRECISION AND ($7->>''maxLat'')::DOUBLE PRECISION
        AND extensions.ST_X(COALESCE(o.location_adjusted, o.location_original)::extensions.geometry)
          BETWEEN ($7->>''minLng'')::DOUBLE PRECISION AND ($7->>''maxLng'')::DOUBLE PRECISION
      )
    )
       ORDER BY %I %s, o.id DESC
       OFFSET $5 LIMIT $6
     ) t',
    v_sort_col, v_sort_dir, v_sort_col, v_sort_dir
  ) INTO v_data
  USING v_statuses, v_categories, v_priorities, v_min_votes, v_offset, v_limit, v_bbox, p_filters;

  RETURN jsonb_build_object(
    'filters_version', 1,
    'data', v_data,
    'pagination', jsonb_build_object(
      'page', v_page, 'limit', v_limit, 'total', v_total,
      'total_pages', CEIL(v_total::numeric / v_limit)::int
    )
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_list_occurrences(jsonb,integer,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_occurrences(jsonb,integer,integer) TO authenticated;
COMMIT;
