-- Execute after the ADM-01 migration in the SAME transaction; always roll back.
DO $test$
DECLARE
  u uuid := gen_random_uuid();
  c uuid;
  a uuid;
  s public.occurrence_status;
  result jsonb;
  i integer := 0;
BEGIN
  INSERT INTO auth.users(id, email, raw_user_meta_data)
  VALUES (u, u::text || '@example.invalid', '{"name":"ADM-01 transactional test"}');
  UPDATE public.user_roles SET role = 'ADMIN', admin_level = 'OPERATIONAL' WHERE user_id = u;
  PERFORM set_config('request.jwt.claim.sub', u::text, true);

  result := public.get_admin_dashboard();
  IF result <> '{"counts_by_status":{"RECEIVED":0,"UNDER_ANALYSIS":0,"CONFIRMED":0,"IN_SERVICE":0,"RESOLVED":0,"REJECTED":0},"high_priority_total":0,"average_resolution_days":null}'::jsonb THEN
    RAISE EXCEPTION 'Expected empty database baseline';
  END IF;

  SELECT id INTO STRICT c FROM public.categories WHERE code = 'CAT01';
  FOREACH s IN ARRAY ARRAY['RECEIVED','UNDER_ANALYSIS','CONFIRMED','IN_SERVICE','REJECTED','RESOLVED','RESOLVED','RESOLVED']::public.occurrence_status[]
  LOOP
    i := i + 1;
    INSERT INTO public.ai_analyses(user_id, input_photo_paths, status)
    VALUES(u, '["test-only.jpg"]', 'CONSUMED') RETURNING id INTO a;
    INSERT INTO public.occurrences(author_id, category_id, ai_analysis_id, description,
      status, priority, category_source, description_source, location_original,
      location_source, created_at, resolved_at)
    VALUES(u, c, a, 'Temporary dashboard fixture', s,
      CASE WHEN i IN (3,6,7) THEN 'HIGH'::public.occurrence_priority ELSE NULL END,
      'AI_CONFIRMED', 'AI_CONFIRMED', extensions.ST_SetSRID(extensions.ST_MakePoint(-46,-23),4326)::extensions.geography,
      'MANUAL', '2026-01-01T00:00:00Z',
      CASE WHEN i = 6 THEN '2026-01-02T00:00:00Z'::timestamptz
           WHEN i = 7 THEN '2026-01-04T12:00:00Z'::timestamptz ELSE NULL END);
  END LOOP;
  result := public.get_admin_dashboard();
  IF result <> '{"counts_by_status":{"RECEIVED":1,"UNDER_ANALYSIS":1,"CONFIRMED":1,"IN_SERVICE":1,"RESOLVED":3,"REJECTED":1},"high_priority_total":3,"average_resolution_days":2.25}'::jsonb THEN
    RAISE EXCEPTION 'Unexpected dashboard aggregation: %', result;
  END IF;
  UPDATE public.user_roles SET admin_level = 'MASTER' WHERE user_id = u;
  IF public.get_admin_dashboard() <> result THEN RAISE EXCEPTION 'Master result differs'; END IF;

  UPDATE public.user_roles SET is_active = false WHERE user_id = u;
  BEGIN
    PERFORM public.get_admin_dashboard();
    RAISE EXCEPTION 'Inactive admin was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  UPDATE public.user_roles SET is_active = true, role = 'CITIZEN', admin_level = NULL WHERE user_id = u;
  BEGIN
    PERFORM public.get_admin_dashboard();
    RAISE EXCEPTION 'Citizen was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  PERFORM set_config('request.jwt.claim.sub', '', true);
  BEGIN
    PERFORM public.get_admin_dashboard();
    RAISE EXCEPTION 'Unauthenticated caller was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  IF has_function_privilege('anon', 'public.get_admin_dashboard()', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.get_admin_dashboard()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Unexpected function grants';
  END IF;
END;
$test$;
SELECT 'PASS: empty database, six statuses, HIGH total, fractional average, null exclusion, both admin levels, inactive/citizen/anonymous denial, grants' AS result;
ROLLBACK;
