-- QA-02: segurança de Storage e imutabilidade geográfica; somente Supabase local.
BEGIN;
SELECT plan(11);
INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,raw_app_meta_data,raw_user_meta_data)
VALUES ('00000000-0000-4000-8000-000000008101','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
 'qa-location@example.invalid','x','{}','{"name":"Local QA"}');
INSERT INTO public.ai_analyses(id,user_id,input_photo_paths,status)
VALUES('00000000-0000-4000-8000-000000008201','00000000-0000-4000-8000-000000008101','["temporary/qa.jpg"]','COMPLETED');
INSERT INTO public.occurrences(id,author_id,category_id,ai_analysis_id,description,status,
 category_source,description_source,location_original,location_source)
VALUES('00000000-0000-4000-8000-000000008301','00000000-0000-4000-8000-000000008101',(SELECT id FROM public.categories WHERE code='CAT01'),'00000000-0000-4000-8000-000000008201',
 'Verificação da imutabilidade','RECEIVED','USER_MANUAL','USER_MANUAL',
 extensions.ST_SetSRID(extensions.ST_MakePoint(-38.97658,-12.26674),4326)::extensions.geography,'GPS');

SELECT ok((SELECT public = FALSE FROM storage.buckets WHERE id='occurrence-photos'), 'Bucket de evidências é privado');
SELECT ok((SELECT 'image/jpeg'=ANY(allowed_mime_types) FROM storage.buckets WHERE id='occurrence-photos'), 'Bucket aceita JPEG');
SELECT ok((SELECT 'image/png'=ANY(allowed_mime_types) FROM storage.buckets WHERE id='occurrence-photos'), 'Bucket aceita PNG');
SELECT ok((SELECT file_size_limit <= 5242880 FROM storage.buckets WHERE id='occurrence-photos'), 'Bucket limita fotos a 5 MiB');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='storage.objects'::regclass), 'RLS habilitado em storage.objects');
SELECT ok(EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.occurrences'::regclass AND tgname='occurrences_prevent_location_original_change' AND tgenabled='A'), 'Imutabilidade de localização é trigger ALWAYS');
SELECT throws_ok($invalid$UPDATE public.occurrences SET location_original=extensions.ST_SetSRID(extensions.ST_MakePoint(-38.5,-12.0),4326)::extensions.geography WHERE id='00000000-0000-4000-8000-000000008301'$invalid$,'23514',NULL,'location_original imutável mesmo por executor privilegiado');
SELECT ok((SELECT extensions.ST_DWithin(location_original,extensions.ST_SetSRID(extensions.ST_MakePoint(-38.97658,-12.26674),4326)::extensions.geography,0.1) FROM public.occurrences WHERE id='00000000-0000-4000-8000-000000008301'),'Ponto original preservado após tentativa de UPDATE');
SELECT lives_ok($valid$UPDATE public.occurrences SET location_adjusted=extensions.ST_SetSRID(extensions.ST_MakePoint(-38.975,-12.265),4326)::extensions.geography WHERE id='00000000-0000-4000-8000-000000008301'$valid$,'Ajuste de localização não altera original');
SELECT ok((SELECT location_adjusted IS NOT NULL FROM public.occurrences WHERE id='00000000-0000-4000-8000-000000008301'),'localização ajustada foi persistida');
SELECT ok((SELECT extensions.ST_Distance(location_original,location_adjusted)>0 FROM public.occurrences WHERE id='00000000-0000-4000-8000-000000008301'),'Pontos original e ajustado permanecem distintos');
SELECT * FROM finish();
ROLLBACK;
