-- Constraints do modelo relacional. Executa numa transação e reverte.
BEGIN;
SELECT plan(18);
INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,raw_app_meta_data,raw_user_meta_data)
VALUES ('00000000-0000-4000-8000-000000003101','00000000-0000-0000-0000-000000000000','authenticated','authenticated','constraints@example.invalid','x','{}','{"name":"Cidadão teste constraints"}');
INSERT INTO public.ai_analyses(id,user_id,input_photo_paths,status) VALUES('00000000-0000-4000-8000-000000003201','00000000-0000-4000-8000-000000003101','["temporary/example.jpg"]','COMPLETED');
INSERT INTO public.occurrences(id,author_id,category_id,ai_analysis_id,description,status,category_source,description_source,location_original,location_source) VALUES ('00000000-0000-4000-8000-000000003301','00000000-0000-4000-8000-000000003101',(SELECT id FROM public.categories WHERE code='CAT01'),'00000000-0000-4000-8000-000000003201','Ocorrência de teste','RECEIVED','USER_MANUAL','USER_MANUAL',extensions.ST_SetSRID(extensions.ST_MakePoint(-38.9,-12.2),4326)::extensions.geography,'MANUAL');
INSERT INTO public.occurrence_photos(occurrence_id,storage_path,mime_type,size_bytes,position)
VALUES('00000000-0000-4000-8000-000000003301','photo-1.jpg','image/jpeg',100,1);
SELECT ok((SELECT id='00000000-0000-4000-8000-000000003301'::uuid FROM public.occurrences WHERE id='00000000-0000-4000-8000-000000003301'), 'Ocorrência válida inserida');
SELECT ok((SELECT size_bytes=100 FROM public.occurrence_photos WHERE storage_path='photo-1.jpg'),'Foto JPEG válida inserida');
SELECT ok((SELECT location_source='MANUAL' FROM public.occurrences WHERE id='00000000-0000-4000-8000-000000003301'),'Fonte MANUAL válida');
SELECT ok((SELECT status='COMPLETED' FROM public.ai_analyses WHERE id='00000000-0000-4000-8000-000000003201'),'Análise permanece COMPLETED em fixture independente da RPC');
SELECT ok((SELECT count(*)=1 FROM public.occurrence_photos WHERE occurrence_id='00000000-0000-4000-8000-000000003301'),'Uma foto registrada');
SELECT throws_ok($case$INSERT INTO public.occurrence_photos(occurrence_id,storage_path,mime_type,size_bytes,position) VALUES('00000000-0000-4000-8000-000000003301','invalid-position.jpg','image/jpeg',100,0)$case$,'23514',NULL,'Posição 0 é inválida');
SELECT throws_ok($case$INSERT INTO public.occurrence_photos(occurrence_id,storage_path,mime_type,size_bytes,position) VALUES('00000000-0000-4000-8000-000000003301','invalid-position4.jpg','image/jpeg',100,4)$case$,'23514',NULL,'Posição 4 é inválida');
SELECT throws_ok($case$INSERT INTO public.occurrence_photos(occurrence_id,storage_path,mime_type,size_bytes,position) VALUES('00000000-0000-4000-8000-000000003301','size-too-large.jpg','image/jpeg',5242881,1)$case$,'23514',NULL,'Foto acima de 5 MiB é rejeitada');
SELECT throws_ok($case$INSERT INTO public.occurrence_photos(occurrence_id,storage_path,mime_type,size_bytes,position) VALUES('00000000-0000-4000-8000-000000003301','size-zero.jpg','image/jpeg',0,1)$case$,'23514',NULL,'Foto de tamanho 0 é rejeitada');
SELECT throws_ok($case$INSERT INTO public.occurrence_photos(occurrence_id,storage_path,mime_type,size_bytes,position) VALUES('00000000-0000-4000-8000-000000003301','file.gif','image/gif',100,1)$case$,'23514',NULL,'MIME image/gif é rejeitado');
SELECT throws_ok($case$INSERT INTO public.occurrence_photos(occurrence_id,storage_path,mime_type,size_bytes,position) VALUES('00000000-0000-4000-8000-000000009999','ghost.jpg','image/jpeg',100,1)$case$,'23503',NULL,'Foto sem ocorrência viola FK');
SELECT throws_ok($case$INSERT INTO public.occurrence_history(occurrence_id,action) VALUES('00000000-0000-4000-8000-000000003301','ACTION_NO_ACTOR')$case$,'23502',NULL,'Histórico exige actor_type');
SELECT throws_ok($case$INSERT INTO public.occurrence_photos(occurrence_id,storage_path,mime_type,size_bytes,position) VALUES('00000000-0000-4000-8000-000000003301','another-photo.jpg','image/jpeg',100,1)$case$,'23505',NULL,'Não admite duas fotos na mesma posição');
SELECT throws_ok($case$INSERT INTO public.occurrences(id,author_id,category_id,ai_analysis_id,description,status,category_source,description_source,location_original,location_source) VALUES ('00000000-0000-4000-8000-000000003301','00000000-0000-4000-8000-000000003101',(SELECT id FROM public.categories WHERE code='CAT01'),'00000000-0000-4000-8000-000000003201','Ocorrência de teste','RECEIVED','USER_MANUAL','USER_MANUAL',extensions.ST_SetSRID(extensions.ST_MakePoint(-38.9,-12.2),4326)::extensions.geography,'MANUAL')$case$,'23505',NULL,'Análise só pode ser vinculada a uma ocorrência');
SELECT throws_ok($case$UPDATE public.user_roles SET role='ADMIN',admin_level=NULL WHERE user_id='00000000-0000-4000-8000-000000003101'$case$,'23514',NULL,'ADMIN exige nível administrativo');
SELECT throws_ok($case$INSERT INTO public.notifications(user_id,occurRence_id,title,message,type) VALUES('00000000-0000-4000-8000-000000009999','00000000-0000-4000-8000-000000003301','Teste','Teste','CITIZEN_RESPONSE')$case$,'23503',NULL,'Notificação sem usuário viola FK');
SELECT throws_ok($case$INSERT INTO public.notifications(user_id,occurrence_id,title,message,type) VALUES('00000000-0000-4000-8000-000000003101','00000000-0000-4000-8000-000000003301','Teste','Teste','STATUS_CHANGE')$case$,'22P02',NULL,'ENUM de notificação rejeita STATUS_CHANGE legado');
SELECT throws_ok($case$UPDATE public.occurrences SET description=repeat('A',501) WHERE id='00000000-0000-4000-8000-000000003301'$case$,'22001',NULL,'Descrição acima de 500 caracteres rejeitada');
SELECT * FROM finish();
ROLLBACK;
