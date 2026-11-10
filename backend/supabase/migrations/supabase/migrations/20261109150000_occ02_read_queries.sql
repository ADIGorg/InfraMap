-- OCC-02: Consultas (público / cidadão / admin)
-- Dependências: DB-04, DB-08, DB-09, DB-10
--
-- Estratégia:
--   * 1 RPC para listagem (p_role define filtros e colunas efetivas)
--   * 1 RPC para detalhe (p_role define autorização + colunas)
--   * Coordenadas do PUBLIC são arredondadas no repo (aproximação de mapa)
--   * Bbox (mapa): exclui RESOLVED dos pontos ativos

-- ============================================================
-- 1. Listagem genérica por perfil
-- ============================================================
CREATE OR REPLACE FUNCTION list_occurrences(
  p_role TEXT,
  p_user_id UUID DEFAULT NULL,
  p_statuses TEXT[] DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_bbox_min_lat DOUBLE PRECISION DEFAULT NULL,
  p_bbox_max_lat DOUBLE PRECISION DEFAULT NULL,
  p_bbox_min_lng DOUBLE PRECISION DEFAULT NULL,
  p_bbox_max_lng DOUBLE PRECISION DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 20,
  p_sort TEXT DEFAULT 'recent'
) RETURNS TABLE (
  id UUID,
  category_id UUID,
  category_code VARCHAR,
  category_name VARCHAR,
  description VARCHAR,
  status TEXT,
  priority TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  author_id UUID,
  author_name VARCHAR,
  photos_count BIGINT,
  votes_count BIGINT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  total_count BIGINT
) AS $$
DECLARE
  v_statuses TEXT[];
  v_exclude_resolved BOOLEAN := false;
  v_is_map_query BOOLEAN := (p_bbox_min_lat IS NOT NULL);
BEGIN
  IF p_role = 'PUBLIC' THEN
    v_statuses := ARRAY['CONFIRMED', 'IN_SERVICE'];
  ELSIF p_role IN ('CITIZEN', 'ADMIN') THEN
    v_statuses := p_statuses;
  ELSE
    RAISE EXCEPTION 'BAD_REQUEST: Role inválida: %', p_role;
  END IF;

  IF p_role = 'ADMIN' AND v_is_map_query THEN
    v_exclude_resolved := true;
  END IF;

  IF p_role = 'CITIZEN' AND p_user_id IS NULL THEN
    RAISE EXCEPTION 'BAD_REQUEST: p_user_id é obrigatório para CITIZEN.';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT
      o.id, o.category_id, c.code AS category_code, c.name AS category_name,
      o.description, o.status::TEXT AS status, o.priority::TEXT AS priority,
      COALESCE(o.location_adjusted, o.location_original) AS location_effective,
      o.author_id, p.name AS author_name,
      (SELECT COUNT(*) FROM occurrence_photos ph WHERE ph.occurrence_id = o.id) AS photos_count,
      (SELECT COUNT(*) FROM votes v WHERE v.occurrence_id = o.id) AS votes_count,
      o.created_at, o.updated_at, o.resolved_at
    FROM occurrences o
    JOIN categories c ON c.id = o.category_id
    LEFT JOIN profiles p ON p.id = o.author_id
    WHERE (v_statuses IS NULL OR o.status::TEXT = ANY(v_statuses))
      AND (p_category_id IS NULL OR o.category_id = p_category_id)
      AND (p_role != 'CITIZEN' OR o.author_id = p_user_id)
      AND (NOT v_exclude_resolved OR o.status::TEXT != 'RESOLVED')
      AND (
        NOT v_is_map_query
        OR ST_Intersects(
          COALESCE(o.location_adjusted, o.location_original)::geometry,
          ST_MakeEnvelope(p_bbox_min_lng, p_bbox_min_lat, p_bbox_max_lng, p_bbox_max_lat, 4326)
        )
      )
  ),
  with_count AS (
    SELECT *, COUNT(*) OVER() AS total_count FROM filtered
  )
  SELECT
    wc.id, wc.category_id, wc.category_code, wc.category_name,
    wc.description, wc.status, wc.priority,
    ST_Y(wc.location_effective::geometry) AS location_lat,
    ST_X(wc.location_effective::geometry) AS location_lng,
    wc.author_id, wc.author_name, wc.photos_count, wc.votes_count,
    wc.created_at, wc.updated_at, wc.resolved_at, wc.total_count
  FROM with_count wc
  ORDER BY
    CASE WHEN p_sort = 'recent' THEN wc.created_at END DESC NULLS LAST,
    CASE WHEN p_sort = 'oldest' THEN wc.created_at END ASC NULLS LAST,
    CASE WHEN p_sort = 'most_liked' THEN wc.votes_count END DESC NULLS LAST,
    wc.created_at DESC
  LIMIT p_page_size
  OFFSET (p_page - 1) * p_page_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. Detalhe genérico por perfil
-- ============================================================
CREATE OR REPLACE FUNCTION get_occurrence(
  p_role TEXT,
  p_user_id UUID DEFAULT NULL,
  p_occurrence_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF p_occurrence_id IS NULL THEN
    RAISE EXCEPTION 'BAD_REQUEST: p_occurrence_id é obrigatório.';
  END IF;

  SELECT jsonb_build_object(
    'id', o.id,
    'category', jsonb_build_object('id', c.id, 'code', c.code, 'name', c.name),
    'description', o.description,
    'status', o.status::TEXT,
    'priority', o.priority::TEXT,
    'location', jsonb_build_object(
      'lat', ST_Y(COALESCE(o.location_adjusted, o.location_original)::geometry),
      'lng', ST_X(COALESCE(o.location_adjusted, o.location_original)::geometry)
    ),
    'locationOriginal', jsonb_build_object(
      'lat', ST_Y(o.location_original::geometry),
      'lng', ST_X(o.location_original::geometry)
    ),
    'locationAdjusted', CASE
      WHEN o.location_adjusted IS NOT NULL THEN jsonb_build_object(
        'lat', ST_Y(o.location_adjusted::geometry),
        'lng', ST_X(o.location_adjusted::geometry)
      )
      ELSE NULL
    END,
    'author', jsonb_build_object('id', o.author_id, 'name', p.name),
    'photos', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'storagePath', ph.storage_path,
        'mimeType', ph.mime_type,
        'sizeBytes', ph.size_bytes,
        'position', ph.position
      ) ORDER BY ph.position)
      FROM occurrence_photos ph WHERE ph.occurrence_id = o.id
    ), '[]'::jsonb),
    'votesCount', (SELECT COUNT(*) FROM votes v WHERE v.occurrence_id = o.id),
    'categorySource', o.category_source::TEXT,
    'descriptionSource', o.description_source::TEXT,
    'createdAt', o.created_at,
    'updatedAt', o.updated_at,
    'resolvedAt', o.resolved_at
  ) INTO v_result
  FROM occurrences o
  JOIN categories c ON c.id = o.category_id
  LEFT JOIN profiles p ON p.id = o.author_id
  WHERE o.id = p_occurrence_id
    AND (
      (p_role = 'PUBLIC' AND o.status::TEXT IN ('CONFIRMED', 'IN_SERVICE'))
      OR (p_role = 'CITIZEN' AND o.author_id = p_user_id)
      OR (p_role = 'ADMIN')
    );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;