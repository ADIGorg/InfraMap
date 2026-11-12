-- Fluxo principal: IA → ocorrência → moderação → voto → notificações.
-- Testes usam IDs fictícios e rollback; nenhuma ação em ambiente remoto.
BEGIN;
SELECT plan(37);
INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,raw_app_meta_data,raw_user_meta_data)
VALUES ('00000000-0000-4000-8000-000000002101','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
'lifecycle-owner@example.invalid','x','{}','{"name":"owner test"}');
INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,raw_app_meta_data,raw_user_meta_data)
VALUES ('00000000-0000-4000-8000-000000002102','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
'lifecycle-admin@example.invalid','x','{}','{"name":"admin test"}');
INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,raw_app_meta_data,raw_user_meta_data)
VALUES ('00000000-0000-4000-8000-000000002103','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
'lifecycle-voter@example.invalid','x','{}','{"name":"voter test"}');
UPDATE public.user_roles SET role='ADMIN',admin_level='MASTER'
WHERE user_id='00000000-0000-4000-8000-000000002102';
INSERT INTO public.ai_analyses
(id,user_id,input_photo_paths,status,suggested_category_id,suggested_description,confidence,model_name,prompt_version,completed_at)
VALUES ('00000000-0000-4000-8000-000000002201','00000000-0000-4000-8000-000000002101','["temporary/00000000-0000-4000-8000-000000002101/00000000-0000-4000-8000-000000002201/photo-1.jpg"]',
'COMPLETED',(SELECT id FROM public.categories WHERE code='CAT01'),
'Esgoto a céu aberto na rua',0.95,'mock-test','v1',now());
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000002101',true);
SELECT lives_ok($test$SELECT * FROM public.finalize_occurrence(
p_analysis_id=>'00000000-0000-4000-8000-000000002201'::uuid,
p_category_id=>(SELECT id FROM public.categories WHERE code='CAT01'),
p_description=>'Esgoto a céu aberto na rua',
p_category_source=>'AI_CONFIRMED'::public.field_source,
p_description_source=>'AI_CONFIRMED'::public.field_source,
p_location_lon=>-38.9665,p_location_lat=>-12.2667,
p_location_source=>'GPS'::public.location_source,p_location_accuracy_m=>8,
p_photos=>'[{"mime_type":"image/jpeg","size_bytes":1500}]'::jsonb)$test$,'Cidadão registra uma ocorrência a partir de análise COMPLETED');
SELECT is((SELECT count(*)::int FROM public.occurrences WHERE ai_analysis_id='00000000-0000-4000-8000-000000002201'),1,'Exatamente uma ocorrência criada');
SELECT is((SELECT status::text FROM public.occurrences WHERE ai_analysis_id='00000000-0000-4000-8000-000000002201'),'RECEIVED','Status inicial RECEIVED');
SELECT ok((SELECT priority IS NULL FROM public.occurrences WHERE ai_analysis_id='00000000-0000-4000-8000-000000002201'),'Prioridade inicial nula');
SELECT is((SELECT location_source::text FROM public.occurrences WHERE ai_analysis_id='00000000-0000-4000-8000-000000002201'),'GPS','Proveniência da localização GPS');
SELECT is((SELECT status::text FROM public.ai_analyses WHERE id='00000000-0000-4000-8000-000000002201'),'CONSUMED','Análise consumida');
SELECT is((SELECT count(*)::int FROM public.occurrence_photos WHERE occurrence_id=(SELECT id FROM public.occurrences WHERE ai_analysis_id='00000000-0000-4000-8000-000000002201')),1,'Metadados de uma foto criados');
SELECT is((SELECT position::int FROM public.occurrence_photos WHERE occurrence_id=(SELECT id FROM public.occurrences WHERE ai_analysis_id='00000000-0000-4000-8000-000000002201')),1,'Posição de foto começa em 1');
SELECT is((SELECT count(*)::int FROM public.occurrence_history WHERE occurrence_id=(SELECT id FROM public.occurrences WHERE ai_analysis_id='00000000-0000-4000-8000-000000002201') AND action='OCCURRENCE_CREATED' AND actor_type='USER'),1,'Evento de criação auditado');
SELECT throws_ok($test$SELECT * FROM public.finalize_occurrence(
p_analysis_id=>'00000000-0000-4000-8000-000000002201'::uuid,
p_category_id=>(SELECT id FROM public.categories WHERE code='CAT01'),
p_description=>'Esgoto a céu aberto na rua',
p_category_source=>'AI_CONFIRMED'::public.field_source,
p_description_source=>'AI_CONFIRMED'::public.field_source,
p_location_lon=>-38.9665,p_location_lat=>-12.2667,
p_location_source=>'GPS'::public.location_source,p_location_accuracy_m=>8,
p_photos=>'[{"mime_type":"image/jpeg","size_bytes":1500}]'::jsonb)$test$,'22023',NULL,'Análise CONSUMED não pode ser finalizada novamente');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000002103',true);
SELECT throws_ok($test$SELECT * FROM public.finalize_occurrence(
p_analysis_id=>'00000000-0000-4000-8000-000000002201'::uuid,
p_category_id=>(SELECT id FROM public.categories WHERE code='CAT01'),
p_description=>'Esgoto a céu aberto na rua',
p_category_source=>'AI_CONFIRMED'::public.field_source,
p_description_source=>'AI_CONFIRMED'::public.field_source,
p_location_lon=>-38.9665,p_location_lat=>-12.2667,
p_location_source=>'GPS'::public.location_source,p_location_accuracy_m=>8,
p_photos=>'[{"mime_type":"image/jpeg","size_bytes":1500}]'::jsonb)$test$,'42501',NULL,'Outro cidadão não pode finalizar análise alheia');
SELECT throws_ok($test$SELECT * FROM public.transition_occurrence((SELECT id FROM public.occurrences WHERE ai_analysis_id='00000000-0000-4000-8000-000000002201'),'UNDER_ANALYSIS'::public.occurrence_status)$test$,'42501',NULL,'Cidadão não pode moderar uma ocorrência');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000002102',true);
SELECT throws_ok($test$SELECT * FROM public.transition_occurrence((SELECT id FROM public.occurrences WHERE ai_analysis_id='00000000-0000-4000-8000-000000002201'),'RESOLVED'::public.occurrence_status)$test$,'22023',NULL,'Transição RECEIVED → RESOLVED é bloqueada');
SELECT lives_ok($test$SELECT * FROM public.transition_occurrence((SELECT id FROM public.occurrences WHERE ai_analysis_id='00000000-0000-4000-8000-000000002201'),'UNDER_ANALYSIS'::public.occurrence_status)$test$ ,'Admin inicia análise');
SELECT lives_ok($test$SELECT * FROM public.transition_occurrence((SELECT id FROM public.occurrences WHERE ai_analysis_id='00000000-0000-4000-8000-000000002201'),'CONFIRMED'::public.occurrence_status)$test$ ,'Admin confirma ocorrência');
SELECT is((SELECT status::text FROM public.occurrences WHERE id=(SELECT id FROM public.occurrences WHERE ai_analysis_id='00000000-0000-4000-8000-000000002201')),'CONFIRMED','Estado confirmado no banco');
SELECT is((SELECT count(*)::int FROM public.public_occurrences WHERE id=(SELECT id FROM public.occurrences WHERE ai_analysis_id='00000000-0000-4000-8000-000000002201')),1,'Ocorrência confirmada aparece no mapa público');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000002103',true);
SELECT lives_ok($test$SELECT * FROM public.register_vote((SELECT id FROM public.occurrences WHERE ai_analysis_id='00000000-0000-4000-8000-000000002201'),'ADD')$test$ ,'Cidadão distinto vota em ocorrência confirmada');
SELECT is(public.count_votes((SELECT id FROM public.occurrences WHERE ai_analysis_id='00000000-0000-4000-8000-000000002201'))::int,1,'Contagem pública de votos = 1');
SELECT throws_ok($test$SELECT * FROM public.register_vote((SELECT id FROM public.occurrences WHERE ai_analysis_id='00000000-0000-4000-8000-000000002201'),'ADD')$test$ ,'23505',NULL,'Voto duplicado recusado');
SELECT lives_ok($test$SELECT * FROM public.register_vote((SELECT id FROM public.occurrences WHERE ai_analysis_id='00000000-0000-4000-8000-000000002201'),'REMOVE')$test$ ,'Cidadão remove o próprio voto');
SELECT is(public.count_votes((SELECT id FROM public.occurrences WHERE ai_analysis_id='00000000-0000-4000-8000-000000002201'))::int,0,'Contagem retorna zero após remover voto');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000002101',true);
SELECT throws_ok($test$SELECT * FROM public.register_vote((SELECT id FROM public.occurrences WHERE ai_analysis_id='00000000-0000-4000-8000-000000002201'),'ADD')$test$ ,'42501',NULL,'Autor não pode votar na própria denúncia');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000002102',true);
SELECT lives_ok($test$SELECT public.update_occurrence_priority((SELECT id FROM public.occurrences WHERE ai_analysis_id='00000000-0000-4000-8000-000000002201'),'HIGH'::public.occurrence_priority)$test$ ,'Admin atribui prioridade HIGH');
SELECT is((SELECT priority::text FROM public.occurrences WHERE id=(SELECT id FROM public.occurrences WHERE ai_analysis_id='00000000-0000-4000-8000-000000002201')),'HIGH','Prioridade persistida no banco');
SELECT lives_ok($test$SELECT * FROM public.transition_occurrence((SELECT id FROM public.occurrences WHERE ai_analysis_id='00000000-0000-4000-8000-000000002201'),'IN_SERVICE'::public.occurrence_status,NULL,NULL,'Equipe em deslocamento ao local')$test$ ,'Atendimento iniciado com ação concreta');
SELECT lives_ok($test$SELECT public.create_observation((SELECT id FROM public.occurrences WHERE ai_analysis_id='00000000-0000-4000-8000-000000002201'),'Nota operacional sigilosa','INTERNAL'::public.observation_visibility)$test$ ,'Observação interna registrada');
SELECT lives_ok($test$SELECT public.create_observation((SELECT id FROM public.occurrences WHERE ai_analysis_id='00000000-0000-4000-8000-000000002201'),'A equipe retornará ao local em breve','CITIZEN_RESPONSE'::public.observation_visibility)$test$ ,'Resposta pública registrada');
SELECT is((SELECT count(*)::int FROM public.occurrence_history WHERE occurrence_id=(SELECT id FROM public.occurrences WHERE ai_analysis_id='00000000-0000-4000-8000-000000002201') AND actor_type IS NULL),0,'Todos os eventos têm actor_type');
SELECT lives_ok($test$SELECT * FROM public.transition_occurrence((SELECT id FROM public.occurrences WHERE ai_analysis_id='00000000-0000-4000-8000-000000002201'),'RESOLVED'::public.occurrence_status)$test$ ,'Ocorrência resolvida');
SELECT ok((SELECT resolved_at IS NOT NULL FROM public.occurrences WHERE id=(SELECT id FROM public.occurrences WHERE ai_analysis_id='00000000-0000-4000-8000-000000002201')),'Resolved_at preenchido');
SELECT throws_ok($test$SELECT * FROM public.transition_occurrence((SELECT id FROM public.occurrences WHERE ai_analysis_id='00000000-0000-4000-8000-000000002201'),'CONFIRMED'::public.occurrence_status)$test$ ,'22023',NULL,'Estado RESOLVED é terminal');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000002101',true);
SELECT is((SELECT count(*)::int FROM public.notifications WHERE occurrence_id=(SELECT id FROM public.occurrences WHERE ai_analysis_id='00000000-0000-4000-8000-000000002201') AND type='OCCURRENCE_STATUS_CHANGED'),4,'Quatro transições geram quatro notificações de status');
SELECT is((SELECT count(*)::int FROM public.notifications WHERE occurrence_id=(SELECT id FROM public.occurrences WHERE ai_analysis_id='00000000-0000-4000-8000-000000002201') AND type='CITIZEN_RESPONSE'),1,'Resposta pública gera exatamente uma notificação');
SELECT is((SELECT count(*)::int FROM public.observations WHERE occurrence_id=(SELECT id FROM public.occurrences WHERE ai_analysis_id='00000000-0000-4000-8000-000000002201')),1,'Cidadão só enxerga observações públicas');
SELECT is((SELECT status::text FROM public.occurrences WHERE id=(SELECT id FROM public.occurrences WHERE ai_analysis_id='00000000-0000-4000-8000-000000002201')),'RESOLVED','Autor acompanha estado resolvido');
SELECT is((SELECT count(*)::int FROM public.public_occurrences WHERE id=(SELECT id FROM public.occurrences WHERE ai_analysis_id='00000000-0000-4000-8000-000000002201')),0,'Ocorrência resolvida sai do mapa público');

SELECT * FROM finish();
ROLLBACK;
