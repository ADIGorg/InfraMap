-- RN055, RN057: dashboard inclui alertas de SLA violado
-- 48h para iniciar análise (RECEIVED → UNDER_ANALYSIS)
-- 5 dias para concluir análise (UNDER_ANALYSIS → CONFIRMED/REJECTED)
-- NOTA: usa horas/dias corridos como aproximação MVP (dias úteis ficam para v2)

CREATE OR REPLACE FUNCTION public.get_admin_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores ativos.' USING ERRCODE = '42501';
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
  IS 'RN055/RN057. Dashboard inclui counts, HIGH, tempo médio de resolução e alertas SLA.';

REVOKE ALL ON FUNCTION public.get_admin_dashboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard() TO authenticated;
