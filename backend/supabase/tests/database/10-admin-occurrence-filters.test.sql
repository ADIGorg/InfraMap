BEGIN;
SELECT plan(12);
INSERT INTO auth.users(id,email,raw_user_meta_data)
VALUES ('00000000-0000-4000-8000-000000001041','filter-admin@example.invalid','{"name":"Filtros QA"}');
UPDATE public.user_roles SET role='ADMIN',admin_level='OPERATIONAL' WHERE user_id='00000000-0000-4000-8000-000000001041';
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000001041',true);
INSERT INTO public.administrative_neighborhoods(id,name,municipality,boundary,source)
VALUES ('00000000-0000-4000-8000-000000001042','Região QA','Município QA',
  extensions.ST_Multi(extensions.ST_GeomFromText('POLYGON((-40 -13,-38 -13,-38 -11,-40 -11,-40 -13))',4326)),'Fixture sintética somente teste');
DO $$
DECLARE analysis uuid; occurrence uuid;
BEGIN
  FOR n IN 1..5 LOOP
    INSERT INTO public.ai_analyses(user_id,input_photo_paths,status)
      VALUES ('00000000-0000-4000-8000-000000001041','["fixture.jpg"]','CONSUMED') RETURNING id INTO analysis;
    INSERT INTO public.occurrences(author_id,category_id,ai_analysis_id,description,priority,
      category_source,description_source,location_original,location_source,created_at)
    VALUES ('00000000-0000-4000-8000-000000001041',(SELECT id FROM public.categories WHERE code='CAT01'),analysis,
      CASE WHEN n=5 THEN 'Literal 100%_QA' ELSE 'Vazamento QA' END,
      CASE WHEN n<=3 THEN 'HIGH'::public.occurrence_priority ELSE NULL END,
      'AI_CONFIRMED','AI_CONFIRMED',
      extensions.ST_SetSRID(extensions.ST_MakePoint(CASE WHEN n=3 THEN -45 ELSE -39 END,-12),4326)::extensions.geography,
      'MANUAL',('2026-11-01T03:00:00Z'::timestamptz + (n-1)*interval '1 day')) RETURNING id INTO occurrence;
  END LOOP;
  -- Região considera o ajuste, inclusive a borda do polígono.
  UPDATE public.occurrences SET location_adjusted=extensions.ST_SetSRID(extensions.ST_MakePoint(-40,-12),4326)::extensions.geography
    WHERE created_at='2026-11-03T03:00:00Z';
END;
$$;
SET LOCAL ROLE authenticated;
SELECT is((public.admin_list_occurrences('{"priority_filter":"HIGH"}',1,1)->'pagination'->>'total')::int,3,'Prioridade aplicada antes do total');
SELECT is(jsonb_array_length(public.admin_list_occurrences('{"priority_filter":"HIGH"}',1,1)->'data'),1,'Página limitada após filtro');
SELECT is((public.admin_list_occurrences('{"priority_filter":"HIGH"}',2,1)->'pagination'->>'total')::int,3,'Mesmo total em outra página');
SELECT is((public.admin_list_occurrences('{"priority_filter":"UNDEFINED"}',1,20)->'pagination'->>'total')::int,2,'Prioridade nula explícita');
SELECT is((public.admin_list_occurrences('{"priority_filter":"HIGH","createdFrom":"2026-11-02T00:00:00-03:00","createdBefore":"2026-11-03T00:00:00-03:00"}',1,20)->'pagination'->>'total')::int,1,'Período UTC/local inclui início e exclui fim');
SELECT is((public.admin_list_occurrences('{"q":"vAzAmEnTo"}',1,20)->'pagination'->>'total')::int,4,'Busca ignora caixa');
SELECT is((public.admin_list_occurrences('{"q":"100%_QA"}',1,20)->'pagination'->>'total')::int,1,'Busca literal sem curingas');
SELECT is((public.admin_list_occurrences('{"neighborhoodId":"00000000-0000-4000-8000-000000001042","priority_filter":"HIGH"}',1,20)->'pagination'->>'total')::int,3,'Bairro usa localização ajustada e borda');
SELECT is((public.admin_list_occurrences('{"bbox":{"minLat":-13,"maxLat":-11,"minLng":-39.5,"maxLng":-38},"priority_filter":"HIGH"}',1,20)->'pagination'->>'total')::int,2,'Bbox combinado usa localização ajustada');
SELECT is(jsonb_array_length(public.admin_list_occurrences('{"q":"Vazamento"}',2147483647,100)->'data'),0,'Offset bigint suporta página extrema');
SELECT is((public.admin_list_occurrences('{"neighborhoodId":"00000000-0000-4000-8000-000000001049"}',1,20)->'pagination'->>'total')::int,0,'Bairro desconhecido não remove filtro');
RESET ROLE;
UPDATE public.user_roles SET is_active=false WHERE user_id='00000000-0000-4000-8000-000000001041';
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.admin_list_occurrences('{}',1,20)$$,'42501',NULL,'Admin inativo negado');
SELECT * FROM finish();
ROLLBACK;
