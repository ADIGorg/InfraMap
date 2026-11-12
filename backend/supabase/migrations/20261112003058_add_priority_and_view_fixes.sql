-- Adiciona priority + category_id a 3 RPCs/views (backward-compatible: só adiciona campos)

-- ============================================================
-- 1. get_my_occurrences — adiciona priority + category_id
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_occurrences(
  p_page  INT DEFAULT 1,
  p_limit INT DEFAULT 20
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_page INT := GREATEST(p_page, 1);
  v_limit INT := LEAST(GREATEST(p_limit, 1), 100);
  v_offset INT := (v_page - 1) * v_limit;
  v_total BIGINT;
  v_data JSONB;
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
      c.id   AS category_id,
      c.code AS category_code,
      c.name AS category_name,
      o.description,
      o.status,
      o.priority,
      o.created_at,
      o.status_updated_at,
      o.resolved_at,
      extensions.ST_AsGeoJSON(extensions.ST_SnapToGrid(o.location_original::extensions.geometry, 0.001))::jsonb AS location_approximate,
      CASE WHEN o.location_adjusted IS NULL THEN NULL
           ELSE extensions.ST_AsGeoJSON(extensions.ST_SnapToGrid(o.location_adjusted::extensions.geometry, 0.001))::jsonb END AS location_adjusted_approximate,
      public.count_votes(o.id) AS vote_count,
      COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'storage_path', p.storage_path, 'mime_type', p.mime_type, 'position', p.position
      ) ORDER BY p.position) FROM public.occurrence_photos p WHERE p.occurrence_id = o.id), '[]'::jsonb) AS photos
    FROM public.occurrences o
    JOIN public.categories c ON c.id = o.category_id
    WHERE o.author_id = v_uid
    ORDER BY o.created_at DESC
    OFFSET v_offset LIMIT v_limit
  ) t;

  RETURN jsonb_build_object(
    'data', v_data,
    'pagination', jsonb_build_object(
      'page', v_page, 'limit', v_limit, 'total', v_total,
      'total_pages', CEIL(v_total::numeric / v_limit)::int
    )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_occurrences(INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_occurrences(INT, INT) TO authenticated;

-- ============================================================
-- 2. get_occurrence_detail — adiciona priority + category_id (base)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_occurrence_detail(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_occ public.occurrences%ROWTYPE;
  v_is_admin BOOLEAN;
  v_is_author BOOLEAN;
  v_obs JSONB;
  v_result JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_occ FROM public.occurrences WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ocorrência não encontrada.' USING ERRCODE = 'no_data_found';
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uid AND role = 'ADMIN' AND is_active = TRUE) INTO v_is_admin;
  v_is_author := (v_occ.author_id = v_uid);

  IF NOT v_is_admin AND NOT v_is_author THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', ob.id, 'content', ob.content, 'visibility', ob.visibility, 'created_at', ob.created_at
  ) ORDER BY ob.created_at ASC), '[]'::jsonb)
  INTO v_obs
  FROM public.observations ob
  WHERE ob.occurrence_id = p_id
    AND (v_is_admin OR ob.visibility = 'CITIZEN_RESPONSE');

  v_result := jsonb_build_object(
    'id', v_occ.id,
    'category_id', v_occ.category_id,
    'category_code', (SELECT code FROM public.categories WHERE id = v_occ.category_id),
    'category_name', (SELECT name FROM public.categories WHERE id = v_occ.category_id),
    'description', v_occ.description,
    'status', v_occ.status,
    'priority', v_occ.priority,
    'created_at', v_occ.created_at,
    'status_updated_at', v_occ.status_updated_at,
    'resolved_at', v_occ.resolved_at,
    'location_approximate', extensions.ST_AsGeoJSON(extensions.ST_SnapToGrid(v_occ.location_original::extensions.geometry, 0.001))::jsonb,
    'vote_count', public.count_votes(v_occ.id),
    'photos', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'storage_path', p.storage_path, 'mime_type', p.mime_type, 'position', p.position
    ) ORDER BY p.position) FROM public.occurrence_photos p WHERE p.occurrence_id = p_id), '[]'::jsonb),
    'observations', v_obs
  );

  IF v_is_admin THEN
    v_result := v_result || jsonb_build_object(
      'author', jsonb_build_object('id', v_occ.author_id, 'name', (SELECT name FROM public.profiles WHERE id = v_occ.author_id)),
      'location_original', extensions.ST_AsGeoJSON(v_occ.location_original::extensions.geometry)::jsonb,
      'location_adjusted', CASE WHEN v_occ.location_adjusted IS NULL THEN NULL
                                ELSE extensions.ST_AsGeoJSON(v_occ.location_adjusted::extensions.geometry)::jsonb END,
      'location_source', v_occ.location_source,
      'location_accuracy_m', v_occ.location_accuracy_m,
      'category_source', v_occ.category_source,
      'description_source', v_occ.description_source,
      'ai_analysis_id', v_occ.ai_analysis_id,
      'public_visible', v_occ.public_visible
    );
  END IF;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_occurrence_detail(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_occurrence_detail(UUID) TO authenticated;

-- ============================================================
-- 3. public_occurrences view — adiciona category_id
-- ============================================================
DROP VIEW IF EXISTS public.public_occurrences;

CREATE VIEW public.public_occurrences
WITH (security_invoker = true)
AS
SELECT
  o.id,
  c.id   AS category_id,
  c.code AS category_code,
  c.name AS category_name,
  o.description::VARCHAR(500) AS description,
  o.status,
  o.created_at,
  o.location_approximate,
  public.count_votes(o.id) AS vote_count
FROM public.public_occurrences_source() o
JOIN public.categories c ON c.id = o.category_id;

GRANT SELECT ON public.public_occurrences TO anon, authenticated;
