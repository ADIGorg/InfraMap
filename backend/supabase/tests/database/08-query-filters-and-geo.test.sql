-- Queries contract on fully migrated disposable Supabase only.
BEGIN;
SELECT plan(6);

SELECT ok(to_regclass('public.public_occurrences_api') IS NOT NULL,
 'Secure public coordinates view exists');
SELECT ok((SELECT 'security_invoker=true' = ANY(reloptions)
  FROM pg_class WHERE oid='public.public_occurrences_api'::regclass),
 'Public coordinates view is security invoker');
SELECT ok(has_table_privilege('anon','public.public_occurrences_api','SELECT'),
 'Anonymous map access retained');
SELECT ok(to_regprocedure('public.get_my_occurrences(jsonb,integer,integer)') IS NOT NULL,
 'Filtered own-occurrences RPC exists');
SELECT ok(to_regprocedure('public.admin_list_occurrences(jsonb,integer,integer)') IS NOT NULL,
 'Administrative filtering RPC exists');
SELECT ok(NOT has_table_privilege('anon','public.occurrences','SELECT'),
 'Public cannot read exact locations from table');
SELECT * FROM finish();
ROLLBACK;
