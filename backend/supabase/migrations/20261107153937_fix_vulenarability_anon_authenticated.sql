REVOKE SELECT ON public.occurrences FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_occurrences_source()
RETURNS TABLE (id UUID, category_id UUID, description VARCHAR(500),
  status public.occurrence_status, created_at TIMESTAMPTZ,
  location_approximate extensions.geography)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT id, category_id, description, status, created_at,
         extensions.ST_SnapToGrid(location_original::extensions.geometry, 0.001)::extensions.geography
  FROM public.occurrences
  WHERE status IN ('CONFIRMED','IN_SERVICE');
$$;

-- Reescrever view para usar public_occurrences_source() em vez de occurrences