-- FWD-02: autorização, transação PENDING → SENT/FAILED e auditoria.
BEGIN;
SELECT plan(17);
INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,raw_app_meta_data,raw_user_meta_data)
VALUES('00000000-0000-4000-8000-000000004101','00000000-0000-0000-0000-000000000000','authenticated','authenticated','fwd-citizen@example.invalid','x','{}','{"name":"FWD citizen"}');
INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,raw_app_meta_data,raw_user_meta_data)
VALUES('00000000-0000-4000-8000-000000004102','00000000-0000-0000-0000-000000000000','authenticated','authenticated','fwd-admin@example.invalid','x','{}','{"name":"FWD admin"}');
INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,raw_app_meta_data,raw_user_meta_data)
VALUES('00000000-0000-4000-8000-000000004103','00000000-0000-0000-0000-000000000000','authenticated','authenticated','fwd-admin2@example.invalid','x','{}','{"name":"FWD admin2"}');
UPDATE public.user_roles SET role='ADMIN',admin_level='MASTER' WHERE user_id='00000000-0000-4000-8000-000000004102';
UPDATE public.user_roles SET role='ADMIN',admin_level='OPERATIONAL' WHERE user_id='00000000-0000-4000-8000-000000004103';
INSERT INTO public.ai_analyses(id,user_id,input_photo_paths,status) VALUES('00000000-0000-4000-8000-000000004201','00000000-0000-4000-8000-000000004101','["temporary/example.jpg"]','CONSUMED');
INSERT INTO public.occurrences(id,author_id,category_id,ai_analysis_id,description,status,priority,category_source,description_source,location_original,location_source)
VALUES('00000000-0000-4000-8000-000000004301','00000000-0000-4000-8000-000000004101',(SELECT id FROM public.categories WHERE code='CAT01'),
'00000000-0000-4000-8000-000000004201','Buraco na via','CONFIRMED','LOW','USER_MANUAL','USER_MANUAL',
extensions.ST_SetSRID(extensions.ST_MakePoint(-38.97,-12.26),4326)::extensions.geography,'GPS');
INSERT INTO public.agencies(id,name,email) VALUES('00000000-0000-4000-8000-000000004401','Órgão de Obras','obras@example.invalid');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000004101',true);
SELECT throws_ok($x$SELECT public.create_forwarding('00000000-0000-4000-8000-000000004301','00000000-0000-4000-8000-000000004401','Assunto teste')$x$,'42501',NULL,'Cidadão não encaminha para órgão');
SELECT is((SELECT count(*)::int FROM public.forwardings),0,'Cidadão não lê encaminhamentos alheios');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000004102',true);
SELECT lives_ok($x$SELECT public.create_forwarding('00000000-0000-4000-8000-000000004301','00000000-0000-4000-8000-000000004401','Encaminhamento A','Verificar rapidamente')$x$,'Admin encaminha ocorrência CONFIRMED');
SELECT is((SELECT status::text FROM public.forwardings WHERE occurrence_id='00000000-0000-4000-8000-000000004301' LIMIT 1),'PENDING','Novo encaminhamento começa PENDING');
SELECT is((SELECT recipient_email::text FROM public.forwardings WHERE occurrence_id='00000000-0000-4000-8000-000000004301' LIMIT 1),'obras@example.invalid','E-mail do órgão registrado como snapshot');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.occurrence_history WHERE occurrence_id='00000000-0000-4000-8000-000000004301' AND action='FORWARDED_TO_AGENCY'),1,'Encaminhamento registra histórico');
SET LOCAL ROLE authenticated;
SELECT throws_ok($x$SELECT public.record_forwarding_result(
(SELECT id FROM public.forwardings WHERE occurrence_id='00000000-0000-4000-8000-000000004301' LIMIT 1),
'PENDING'::public.forwarding_status)$x$,'22023',NULL,'Resultado não pode permanecer PENDING');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000004103',true);
SELECT throws_ok($x$SELECT public.record_forwarding_result(
(SELECT id FROM public.forwardings WHERE occurrence_id='00000000-0000-4000-8000-000000004301' LIMIT 1),
'SENT'::public.forwarding_status,'provider-other')$x$,'42501',NULL,'Admin diferente não registra resultado alheio');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000004102',true);
SELECT lives_ok($x$SELECT public.record_forwarding_result(
(SELECT id FROM public.forwardings WHERE occurrence_id='00000000-0000-4000-8000-000000004301' LIMIT 1),
'SENT'::public.forwarding_status,'provider-message-01')$x$,'Resultado SENT registrado');
SELECT is((SELECT status::text FROM public.forwardings WHERE occurrence_id='00000000-0000-4000-8000-000000004301' LIMIT 1),'SENT','Status SENT persistido');
SELECT ok((SELECT sent_at IS NOT NULL FROM public.forwardings WHERE occurrence_id='00000000-0000-4000-8000-000000004301' LIMIT 1),'SENT registra sent_at');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.occurrence_history WHERE occurrence_id='00000000-0000-4000-8000-000000004301' AND action='FORWARDING_SENT'),1,'Resultado gera histórico de envio');
SET LOCAL ROLE authenticated;
SELECT throws_ok($x$SELECT public.record_forwarding_result(
(SELECT id FROM public.forwardings WHERE occurrence_id='00000000-0000-4000-8000-000000004301' LIMIT 1),
'FAILED'::public.forwarding_status,NULL,'HTTP_503')$x$,'22023',NULL,'Não altera resultado já finalizado');
SELECT lives_ok($x$SELECT public.create_forwarding('00000000-0000-4000-8000-000000004301','00000000-0000-4000-8000-000000004401','Encaminhamento B')$x$,'Segundo encaminhamento pode ser registrado');
SELECT lives_ok($x$SELECT public.record_forwarding_result(
(SELECT id FROM public.forwardings WHERE occurrence_id='00000000-0000-4000-8000-000000004301' AND status='PENDING' LIMIT 1),
'FAILED'::public.forwarding_status,NULL,'PROVIDER_UNAVAILABLE')$x$,'Falha de envio registrada em FAILED');
SELECT is((SELECT count(*)::int FROM public.forwardings WHERE occurrence_id='00000000-0000-4000-8000-000000004301' AND status='FAILED'),1,'Registro FAILED persistido');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.occurrence_history WHERE occurrence_id='00000000-0000-4000-8000-000000004301' AND action='FORWARDING_FAILED'),1,'Falha registrada no histórico');
SET LOCAL ROLE authenticated;
SELECT * FROM finish();
ROLLBACK;
