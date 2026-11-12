-- Identidade e isolamento de contas RLS (dados fictícios, rollback automático).
BEGIN;
SELECT plan(17);
INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,raw_app_meta_data,raw_user_meta_data)
VALUES ('00000000-0000-4000-8000-000000001101','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
'db-test-a@example.invalid','x','{}','{"name":"Teste a"}');
INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,raw_app_meta_data,raw_user_meta_data)
VALUES ('00000000-0000-4000-8000-000000001102','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
'db-test-b@example.invalid','x','{}','{"name":"Teste b"}');
INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,raw_app_meta_data,raw_user_meta_data)
VALUES ('00000000-0000-4000-8000-000000001103','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
'db-test-admin@example.invalid','x','{}','{"name":"Teste admin"}');
SELECT is((SELECT count(*) FROM public.profiles WHERE id IN ('00000000-0000-4000-8000-000000001101','00000000-0000-4000-8000-000000001102','00000000-0000-4000-8000-000000001103'))::integer, 3, 'Trigger cria perfis de todos os usuários');
SELECT is((SELECT count(*) FROM public.user_roles WHERE user_id IN ('00000000-0000-4000-8000-000000001101','00000000-0000-4000-8000-000000001102','00000000-0000-4000-8000-000000001103'))::integer, 3, 'Trigger cria papéis de todos os usuários');
SELECT is((SELECT role::text FROM public.user_roles WHERE user_id='00000000-0000-4000-8000-000000001101'), 'CITIZEN', 'Cadastro sempre nasce cidadão');
SELECT ok((SELECT admin_level IS NULL AND is_active FROM public.user_roles WHERE user_id='00000000-0000-4000-8000-000000001101'), 'Cidadão inicia ativo sem nível administrativo');
SELECT throws_ok($$UPDATE public.user_roles SET role='ADMIN' WHERE user_id='00000000-0000-4000-8000-000000001101'$$,'23514',NULL,'CHECK exige admin_level para ADMIN');
-- Administrador fictício preparado somente pelo executor privilegiado do teste.
UPDATE public.user_roles SET role='ADMIN',admin_level='MASTER' WHERE user_id='00000000-0000-4000-8000-000000001103';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000001101',true);
SELECT is((SELECT count(*) FROM public.profiles)::integer, 1, 'RLS cidadão só lê o próprio perfil');
SELECT is((SELECT count(*) FROM public.user_roles)::integer, 1, 'RLS cidadão só lê o próprio papel');
SELECT is((SELECT name FROM public.profiles), 'Teste a', 'RLS exibe perfil correto');
SELECT lives_ok($$UPDATE public.profiles SET phone='75999999999' WHERE id='00000000-0000-4000-8000-000000001101'$$, 'Cidadão pode alterar telefone próprio');
SELECT is((SELECT phone FROM public.profiles WHERE id='00000000-0000-4000-8000-000000001101'), '75999999999','Telefone do próprio perfil atualizado');
SELECT throws_ok($$UPDATE public.user_roles SET role='ADMIN' WHERE user_id='00000000-0000-4000-8000-000000001101'$$,'42501',NULL,'Cidadão não pode promover seu papel');
SELECT throws_ok($$DELETE FROM public.profiles WHERE id='00000000-0000-4000-8000-000000001101'$$,'42501',NULL,'Cidadão não pode apagar perfil por DELETE');
SELECT is(public.is_admin(),false,'Cidadão não é administrador');

SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000001102',true);
SELECT is((SELECT count(*) FROM public.profiles WHERE id='00000000-0000-4000-8000-000000001101')::integer,0,'Outro cidadão não lê perfil alheio');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000001103',true);
SELECT is(public.is_admin(),true,'Admin ativo reconhecido no banco');
SELECT is(public.is_admin_master(),true,'Master ativo reconhecido no banco');
SELECT set_config('request.jwt.claim.sub','',true);
SELECT is(public.is_admin(),false,'Sem JWT não é admin');

SELECT * FROM finish();
ROLLBACK;