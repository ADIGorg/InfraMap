-- Canonical, server-side filters; public coords are always snapped/approximated.
-- Separate migration: requires 20261114173000 security fix to be deployed first.
BEGIN;

CREATE OR REPLACE VIEW public.public_occurrences_api
WITH (security_invoker = true) AS
SELECT v.id, v.category_id, v.category_code, v.category_name,
       v.description, v.status, v.created_at, v.vote_count,
       extensions.ST_Y(v.location_approximate::extensions.geometry) AS latitude,
       extensions.ST_X(v.location_approximate::extensions.geometry) AS longitude
FROM public.public_occurrences AS v;
GRANT SELECT ON public.public_occurrences_api TO anon, authenticated;

-- Administrator: existing contract plus bbox over exact adjusted/original location.
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
  v_offset      INT := (v_page - 1) * v_limit;
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
  WHERE (v_statuses IS NULL OR o.status = ANY(v_statuses))
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
       WHERE ($1 IS NULL OR o.status   = ANY($1))
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
  USING v_statuses, v_categories, v_priorities, v_min_votes, v_offset, v_limit, v_bbox;

  RETURN jsonb_build_object(
    'data', v_data,
    'pagination', jsonb_build_object(
      'page', v_page, 'limit', v_limit, 'total', v_total,
      'total_pages', CEIL(v_total::numeric / v_limit)::int
    )
  );
END;
$function$;


-- The existing two-argument get_my_occurrences is retained for compatibility.
-- The new overload requires filters, so no ambiguous RPC selection.
CREATE OR REPLACE FUNCTION public.get_my_occurrences(
 p_filters JSONB, p_page INTEGER, p_limit INTEGER
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
 v_uid UUID := (SELECT auth.uid());
 v_page INT := GREATEST(COALESCE(p_page, 1), 1);
 v_limit INT := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
 v_offset INT := (v_page - 1) * v_limit;
 v_statuses public.occurrence_status[];
 v_categories TEXT[];
 v_bbox JSONB := p_filters->'bbox';
 v_sort TEXT := COALESCE(p_filters->>'sort','recent');
 v_total BIGINT;
 v_data JSONB;
BEGIN
 IF v_uid IS NULL THEN
   RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = 'insufficient_privilege';
 END IF;
 IF p_filters ? 'status' THEN
   SELECT array_agg(value::public.occurrence_status) INTO v_statuses
   FROM jsonb_array_elements_text(p_filters->'status') AS value;
 END IF;
 IF p_filters ? 'category' THEN
   SELECT array_agg(value::TEXT) INTO v_categories
   FROM jsonb_array_elements_text(p_filters->'category') AS value;
 END IF;
 IF v_sort NOT IN ('recent','oldest','most_liked') THEN v_sort := 'recent'; END IF;

 WITH filtered AS (
   SELECT o.id, c.id AS category_id, c.code AS category_code,
          c.name AS category_name, o.description, o.status, o.priority,
          o.created_at,o.updated_at,o.status_updated_at,o.resolved_at,
          extensions.ST_AsGeoJSON(
            COALESCE(o.location_adjusted,o.location_original)::extensions.geometry
          )::jsonb AS location,
          public.count_votes(o.id) AS vote_count,
          COALESCE((SELECT jsonb_agg(jsonb_build_object(
             'storage_path',p.storage_path,'mime_type',p.mime_type,
             'size_bytes',p.size_bytes,'position',p.position
          ) ORDER BY p.position) FROM public.occurrence_photos p
          WHERE p.occurrence_id=o.id),'[]'::jsonb) AS photos
   FROM public.occurrences o
   JOIN public.categories c ON c.id=o.category_id
   WHERE o.author_id=v_uid
     AND (v_statuses IS NULL OR o.status = ANY(v_statuses))
     AND (v_categories IS NULL OR c.id::text=ANY(v_categories) OR c.code::text=ANY(v_categories))
     AND (v_bbox IS NULL OR (
        extensions.ST_Y(COALESCE(o.location_adjusted,o.location_original)::extensions.geometry)
          BETWEEN (v_bbox->>'minLat')::DOUBLE PRECISION AND (v_bbox->>'maxLat')::DOUBLE PRECISION
        AND extensions.ST_X(COALESCE(o.location_adjusted,o.location_original)::extensions.geometry)
          BETWEEN (v_bbox->>'minLng')::DOUBLE PRECISION AND (v_bbox->>'maxLng')::DOUBLE PRECISION
     ))
 ),
 numbered AS (
   SELECT row_number() OVER (
      ORDER BY
       CASE WHEN v_sort='most_liked' THEN vote_count END DESC NULLS LAST,
       CASE WHEN v_sort='oldest' THEN created_at END ASC NULLS LAST,
       CASE WHEN v_sort='recent' THEN created_at END DESC NULLS LAST,
       id DESC
   ) AS row_order, f.*
   FROM filtered f
 ),
 paged AS (
   SELECT * FROM numbered WHERE row_order>v_offset AND row_order<=v_offset+v_limit
 )
 SELECT (SELECT count(*) FROM filtered),
        COALESCE((SELECT jsonb_agg(to_jsonb(p)-'row_order' ORDER BY p.row_order) FROM paged p),'[]'::jsonb)
 INTO v_total,v_data;
 RETURN jsonb_build_object(
   'data',v_data,
   'pagination',jsonb_build_object('page',v_page,'limit',v_limit,'total',v_total,
     'total_pages',CEIL(v_total::numeric/v_limit)::int)
 );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_my_occurrences(JSONB,INTEGER,INTEGER) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_occurrences(JSONB,INTEGER,INTEGER) TO authenticated;

COMMIT;
