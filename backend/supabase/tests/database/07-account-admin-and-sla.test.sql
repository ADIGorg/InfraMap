-- ID-02 e ADM-02. Testa RPCs e fila de limpeza Auth em ambiente local.
BEGIN;
SELECT plan(16);
INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,raw_app_meta_data,raw_user_meta_data)
VALUES('00000000-0000-4000-8000-000000007101','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
'account-citizen@example.invalid','x','{}','{"name":"citizen original","phone":"75990000000"}');
INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,raw_app_meta_data,raw_user_meta_data)
VALUES('00000000-0000-4000-8000-000000007102','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
'account-master@example.invalid','x','{}','{"name":"master original","phone":"75990000000"}');
INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,raw_app_meta_data,raw_user_meta_data)
VALUES('00000000-0000-4000-8000-000000007103','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
'account-operator@example.invalid','x','{}','{"name":"operator original","phone":"75990000000"}');
UPDATE public.user_roles SET role='ADMIN',admin_level='MASTER' WHERE user_id='00000000-0000-4000-8000-000000007102';
UPDATE public.user_roles SET role='ADMIN',admin_level='OPERATIONAL' WHERE user_id='00000000-0000-4000-8000-000000007103';
SELECT ok(NOT has_table_privilege('authenticated','public.account_deactivation_jobs','SELECT'),'Usuário não acessa fila de limpeza Auth diretamente');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000007101',true);
SELECT lives_ok($x$SELECT public.deactivate_my_account()$x$,'Cidadão ativo consegue desativar sua conta');
SELECT throws_ok($x$SELECT public.deactivate_my_account()$x$,'42501',NULL,'Conta desativada não repete operação');
RESET ROLE;
SELECT is((SELECT name FROM public.profiles WHERE id='00000000-0000-4000-8000-000000007101'),'Usuário excluído','Nome anonimizado');
SELECT ok((SELECT phone IS NULL FROM public.profiles WHERE id='00000000-0000-4000-8000-000000007101'),'Telefone anonimizado');
SELECT ok((SELECT is_active=false FROM public.user_roles WHERE user_id='00000000-0000-4000-8000-000000007101'),'Conta ficou inativa');
SELECT is((SELECT count(*)::int FROM public.account_deactivation_jobs WHERE user_id='00000000-0000-4000-8000-000000007101'),1,'Fila de limpeza Auth possui um job');
SELECT ok((SELECT auth_cleanup_completed_at IS NULL FROM public.account_deactivation_jobs WHERE user_id='00000000-0000-4000-8000-000000007101'),'Limpeza Auth pendente até serviço externo finalizar');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000007103',true);
SELECT is(public.is_admin(),true,'Admin OPERATIONAL está ativo');
SELECT is(public.is_admin_master(),false,'Admin OPERATIONAL não tem permissão MASTER');
SELECT throws_ok($x$SELECT public.list_administrators()$x$,'42501',NULL,'OPERATIONAL não lista administradores');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000007102',true);
SELECT is(public.is_admin_master(),true,'Master reconhecido no JWT');
SELECT ok(jsonb_typeof(public.list_administrators())='array','MASTER lista administradores');
SELECT throws_ok($x$SELECT public.update_administrator('00000000-0000-4000-8000-000000007102', 'OPERATIONAL'::public.admin_level, TRUE)$x$,'23514',NULL,'Último Master não pode ser rebaixado');
SELECT lives_ok($x$SELECT public.update_administrator('00000000-0000-4000-8000-000000007103', NULL, FALSE)$x$,'Master pode inativar admin operacional');
SELECT ok((public.get_admin_dashboard() ? 'sla_breaches'),'Dashboard inclui SLA conforme migration atual');
SELECT * FROM finish();
ROLLBACK;
