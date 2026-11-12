-- QA-02: corrige classificação e localização via RPC real, sem service_role.
-- Fixtures criadas localmente pela conexão pgTAP; todos os dados são revertidos.
BEGIN;
SELECT plan(8);
INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,raw_app_meta_data,raw_user_meta_data)
VALUES ('00000000-0000-4000-8000-000000009101','00000000-0000-0000-0000-000000000000','authenticated','authenticated','classification-citizen@example.invalid','x','{}','{"name":"QA cidadão classificação"}'),
       ('00000000-0000-4000-8000-000000009102','00000000-0000-0000-0000-000000000000','authenticated','authenticated','classification-admin@example.invalid','x','{}','{"name":"QA admin classificação"}');
UPDATE public.user_roles SET role='ADMIN',admin_level='OPERATIONAL' WHERE user_id='00000000-0000-4000-8000-000000009102';
INSERT INTO public.ai_analyses(id,user_id,input_photo_paths,status)
VALUES ('00000000-0000-4000-8000-000000009201','00000000-0000-4000-8000-000000009101','["temporary/a.png"]','CONSUMED');
INSERT INTO public.occurrences
(id,author_id,category_id,ai_analysis_id,description,status,
 category_source,description_source,location_original,location_source)
VALUES('00000000-0000-4000-8000-000000009301','00000000-0000-4000-8000-000000009101',(SELECT id FROM public.categories WHERE code='CAT01'),
 '00000000-0000-4000-8000-000000009201','Descrição antes da correção','UNDER_ANALYSIS',
 'USER_MANUAL','USER_MANUAL',
 extensions.ST_SetSRID(extensions.ST_MakePoint(-38.97658,-12.26674),4326)::extensions.geography,'GPS');

SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009102',true);

SELECT lives_ok($rpc$SELECT * FROM public.adjust_occurrence_location(
 '00000000-0000-4000-8000-000000009301'::uuid,-38.975,-12.265)$rpc$,'Admin ajusta localização via RPC');
SELECT ok((SELECT location_adjusted IS NOT NULL FROM public.occurrences WHERE id='00000000-0000-4000-8000-000000009301'),
 'Ajuste é persistido em location_adjusted');
SELECT ok((SELECT extensions.ST_DWithin(location_original,
 extensions.ST_SetSRID(extensions.ST_MakePoint(-38.97658,-12.26674),4326)::extensions.geography,0.1)
 FROM public.occurrences WHERE id='00000000-0000-4000-8000-000000009301'),'Localização original não foi alterada');
SELECT is((SELECT COUNT(*)::int FROM public.occurrence_history
 WHERE occurrence_id='00000000-0000-4000-8000-000000009301' AND action='LOCATION_ADJUSTED'),1,'Ajuste gera histórico');

SELECT lives_ok($rpc$SELECT public.correct_occurrence_classification(
 '00000000-0000-4000-8000-000000009301'::uuid,(SELECT id FROM public.categories WHERE code='CAT02'), 'Texto novo após revisão')$rpc$,
 'Admin deve corrigir categoria/descrição via RPC sem SQLSTATE 42601');
SELECT is((SELECT description::text FROM public.occurrences WHERE id='00000000-0000-4000-8000-000000009301'),
 'Texto novo após revisão','Descrição corrigida é persistida no banco');

UPDATE public.occurrences SET status='RESOLVED',resolved_at=now() WHERE id='00000000-0000-4000-8000-000000009301';
SELECT throws_ok($rpc$SELECT * FROM public.adjust_occurrence_location(
 '00000000-0000-4000-8000-000000009301'::uuid,-38.973,-12.263)$rpc$,
 '22023',NULL,'Ajustar localização em RESOLVED é proibido');
SELECT throws_ok($rpc$SELECT public.correct_occurrence_classification(
 '00000000-0000-4000-8000-000000009301'::uuid,NULL,'Alteração depois de resolvido')$rpc$,
 '22023',NULL,'Corrigir classificação em RESOLVED deve ser proibido');

SELECT * FROM finish();
ROLLBACK;
