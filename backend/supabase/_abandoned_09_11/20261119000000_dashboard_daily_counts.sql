CREATE OR REPLACE FUNCTION public.get_admin_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  calendar_today date := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores ativos.' USING ERRCODE = '42501';
  END IF;

  RETURN (
    WITH days AS (
      SELECT calendar_today - offset_day AS day
      FROM generate_series(1, 7) AS offset_day
    ), daily AS (
      SELECT (created_at AT TIME ZONE 'America/Sao_Paulo')::date AS day, count(*) AS total
      FROM public.occurrences
      WHERE created_at >= ((calendar_today - 7)::timestamp AT TIME ZONE 'America/Sao_Paulo')
        AND created_at < (calendar_today::timestamp AT TIME ZONE 'America/Sao_Paulo')
      GROUP BY 1
    )
    SELECT jsonb_build_object(
      'daily_counts_timezone', 'America/Sao_Paulo',
      'daily_counts', (
        SELECT jsonb_agg(jsonb_build_object('date', to_char(days.day, 'YYYY-MM-DD'),
          'count', COALESCE(daily.total, 0)) ORDER BY days.day)
        FROM days LEFT JOIN daily USING (day)
      ),
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
        FILTER (WHERE status = 'RESOLVED' AND resolved_at IS NOT NULL),
      'sla_breaches', jsonb_build_object(
        'received_over_48h', COUNT(*) FILTER (
          WHERE status = 'RECEIVED'
            AND created_at < NOW() - INTERVAL '48 hours'
        ),
        'under_analysis_over_5d', COUNT(*) FILTER (
          WHERE status = 'UNDER_ANALYSIS'
            AND status_updated_at < NOW() - INTERVAL '5 days'
        )
      )
    )
    FROM public.occurrences
  );
END;
$$;

COMMENT ON FUNCTION public.get_admin_dashboard()
  IS 'API1-103. Dashboard e série de sete dias completos anteriores a hoje em America/Sao_Paulo; limites convertidos para timestamptz, intervalo [início, fim).';

REVOKE ALL ON FUNCTION public.get_admin_dashboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard() TO authenticated;
