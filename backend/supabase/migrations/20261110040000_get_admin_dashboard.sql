-- ADM-01: aggregates use one snapshot and never expose individual occurrences.
CREATE FUNCTION public.get_admin_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
      AND role = 'ADMIN' AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Apenas administradores ativos.'
      USING ERRCODE = '42501';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'counts_by_status', jsonb_build_object(
        'RECEIVED', COUNT(*) FILTER (WHERE status = 'RECEIVED'),
        'UNDER_ANALYSIS', COUNT(*) FILTER (WHERE status = 'UNDER_ANALYSIS'),
        'CONFIRMED', COUNT(*) FILTER (WHERE status = 'CONFIRMED'),
        'IN_SERVICE', COUNT(*) FILTER (WHERE status = 'IN_SERVICE'),
        'RESOLVED', COUNT(*) FILTER (WHERE status = 'RESOLVED'),
        'REJECTED', COUNT(*) FILTER (WHERE status = 'REJECTED')
      ),
      'high_priority_total', COUNT(*) FILTER (WHERE priority = 'HIGH'),
      'average_resolution_days',
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 86400.0)
        FILTER (WHERE status = 'RESOLVED' AND resolved_at IS NOT NULL)
    )
    FROM public.occurrences
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_dashboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard() TO authenticated;

COMMENT ON FUNCTION public.get_admin_dashboard() IS
'ADM-01. All occurrences, six status counts, HIGH across all statuses, average elapsed 24-hour days for RESOLVED with resolved_at. Null average when none qualify. Active ADMIN only.';
