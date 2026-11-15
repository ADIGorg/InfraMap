-- Esquema do Anexo 2 + migrations vigentes. Somente leitura; rollback protetor.
BEGIN;
SELECT plan(105);
SELECT ok(
  has_table_privilege('authenticated', 'public.occurrences', 'SELECT'),
  'RLS só funciona para moderadores se o papel authenticated tiver GRANT SELECT em occurrences'
);

SELECT ok(to_regclass('public.profiles') IS NOT NULL, 'Tabela profiles');

SELECT ok(to_regclass('public.user_roles') IS NOT NULL, 'Tabela user_roles');

SELECT ok(to_regclass('public.categories') IS NOT NULL, 'Tabela categories');

SELECT ok(to_regclass('public.ai_analyses') IS NOT NULL, 'Tabela ai_analyses');

SELECT ok(to_regclass('public.occurrences') IS NOT NULL, 'Tabela occurrences');

SELECT ok(to_regclass('public.occurrence_photos') IS NOT NULL, 'Tabela occurrence_photos');

SELECT ok(to_regclass('public.occurrence_history') IS NOT NULL, 'Tabela occurrence_history');

SELECT ok(to_regclass('public.observations') IS NOT NULL, 'Tabela observations');

SELECT ok(to_regclass('public.votes') IS NOT NULL, 'Tabela votes');

SELECT ok(to_regclass('public.notifications') IS NOT NULL, 'Tabela notifications');

SELECT ok(to_regclass('public.agencies') IS NOT NULL, 'Tabela agencies');

SELECT ok(to_regclass('public.forwardings') IS NOT NULL, 'Tabela forwardings');

SELECT ok(to_regclass('public.account_deactivation_jobs') IS NOT NULL, 'Tabela account_deactivation_jobs');

SELECT ok(EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' AND t.typname='app_role' AND e.enumlabel='CITIZEN'), 'ENUM app_role.CITIZEN');

SELECT ok(EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' AND t.typname='app_role' AND e.enumlabel='ADMIN'), 'ENUM app_role.ADMIN');

SELECT ok(EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' AND t.typname='admin_level' AND e.enumlabel='MASTER'), 'ENUM admin_level.MASTER');

SELECT ok(EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' AND t.typname='admin_level' AND e.enumlabel='OPERATIONAL'), 'ENUM admin_level.OPERATIONAL');

SELECT ok(EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' AND t.typname='occurrence_status' AND e.enumlabel='RECEIVED'), 'ENUM occurrence_status.RECEIVED');

SELECT ok(EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' AND t.typname='occurrence_status' AND e.enumlabel='UNDER_ANALYSIS'), 'ENUM occurrence_status.UNDER_ANALYSIS');

SELECT ok(EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' AND t.typname='occurrence_status' AND e.enumlabel='CONFIRMED'), 'ENUM occurrence_status.CONFIRMED');

SELECT ok(EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' AND t.typname='occurrence_status' AND e.enumlabel='IN_SERVICE'), 'ENUM occurrence_status.IN_SERVICE');

SELECT ok(EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' AND t.typname='occurrence_status' AND e.enumlabel='RESOLVED'), 'ENUM occurrence_status.RESOLVED');

SELECT ok(EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' AND t.typname='occurrence_status' AND e.enumlabel='REJECTED'), 'ENUM occurrence_status.REJECTED');

SELECT ok(EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' AND t.typname='occurrence_priority' AND e.enumlabel='LOW'), 'ENUM occurrence_priority.LOW');

SELECT ok(EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' AND t.typname='occurrence_priority' AND e.enumlabel='MEDIUM'), 'ENUM occurrence_priority.MEDIUM');

SELECT ok(EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' AND t.typname='occurrence_priority' AND e.enumlabel='HIGH'), 'ENUM occurrence_priority.HIGH');

SELECT ok(EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' AND t.typname='field_source' AND e.enumlabel='AI_CONFIRMED'), 'ENUM field_source.AI_CONFIRMED');

SELECT ok(EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' AND t.typname='field_source' AND e.enumlabel='AI_EDITED'), 'ENUM field_source.AI_EDITED');

SELECT ok(EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' AND t.typname='field_source' AND e.enumlabel='USER_MANUAL'), 'ENUM field_source.USER_MANUAL');

SELECT ok(EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' AND t.typname='field_source' AND e.enumlabel='ADMIN_CORRECTED'), 'ENUM field_source.ADMIN_CORRECTED');

SELECT ok(EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' AND t.typname='location_source' AND e.enumlabel='GPS'), 'ENUM location_source.GPS');

SELECT ok(EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' AND t.typname='location_source' AND e.enumlabel='MANUAL'), 'ENUM location_source.MANUAL');

SELECT ok(EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' AND t.typname='observation_visibility' AND e.enumlabel='INTERNAL'), 'ENUM observation_visibility.INTERNAL');

SELECT ok(EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' AND t.typname='observation_visibility' AND e.enumlabel='CITIZEN_RESPONSE'), 'ENUM observation_visibility.CITIZEN_RESPONSE');

SELECT ok(EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' AND t.typname='notification_type' AND e.enumlabel='OCCURRENCE_STATUS_CHANGED'), 'ENUM notification_type.OCCURRENCE_STATUS_CHANGED');

SELECT ok(EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' AND t.typname='notification_type' AND e.enumlabel='CITIZEN_RESPONSE'), 'ENUM notification_type.CITIZEN_RESPONSE');

SELECT ok(EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' AND t.typname='forwarding_status' AND e.enumlabel='PENDING'), 'ENUM forwarding_status.PENDING');

SELECT ok(EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' AND t.typname='forwarding_status' AND e.enumlabel='SENT'), 'ENUM forwarding_status.SENT');

SELECT ok(EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' AND t.typname='forwarding_status' AND e.enumlabel='FAILED'), 'ENUM forwarding_status.FAILED');

SELECT ok(EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' AND t.typname='forwarding_channel' AND e.enumlabel='EMAIL'), 'ENUM forwarding_channel.EMAIL');

SELECT ok(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_roles' AND column_name='role'), 'Coluna user_roles.role');

SELECT ok(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_roles' AND column_name='is_active'), 'Coluna user_roles.is_active');

SELECT ok(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='occurrences' AND column_name='location_original'), 'Coluna occurrences.location_original');

SELECT ok(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='occurrences' AND column_name='location_source'), 'Coluna occurrences.location_source');

SELECT ok(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='occurrences' AND column_name='public_visible'), 'Coluna occurrences.public_visible');

SELECT ok(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='occurrence_history' AND column_name='actor_type'), 'Coluna occurrence_history.actor_type');

SELECT ok(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='occurrence_photos' AND column_name='position'), 'Coluna occurrence_photos.position');

SELECT ok(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='forwardings' AND column_name='status'), 'Coluna forwardings.status');

SELECT ok(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ai_analyses' AND column_name='consumed_at'), 'Coluna ai_analyses.consumed_at');

SELECT ok(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='account_deactivation_jobs' AND column_name='auth_cleanup_completed_at'), 'Coluna account_deactivation_jobs.auth_cleanup_completed_at');

SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='public.profiles'::regclass), 'RLS habilitado em profiles');

SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='public.user_roles'::regclass), 'RLS habilitado em user_roles');

SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='public.categories'::regclass), 'RLS habilitado em categories');

SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='public.ai_analyses'::regclass), 'RLS habilitado em ai_analyses');

SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='public.occurrences'::regclass), 'RLS habilitado em occurrences');

SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='public.occurrence_photos'::regclass), 'RLS habilitado em occurrence_photos');

SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='public.occurrence_history'::regclass), 'RLS habilitado em occurrence_history');

SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='public.observations'::regclass), 'RLS habilitado em observations');

SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='public.votes'::regclass), 'RLS habilitado em votes');

SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='public.notifications'::regclass), 'RLS habilitado em notifications');

SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='public.agencies'::regclass), 'RLS habilitado em agencies');

SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='public.forwardings'::regclass), 'RLS habilitado em forwardings');

SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='public.account_deactivation_jobs'::regclass), 'RLS habilitado em account_deactivation_jobs');

SELECT ok(EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.profiles'::regclass AND contype='f' AND true), 'FK profiles.id');

SELECT ok(EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.user_roles'::regclass AND contype='f' AND pg_get_constraintdef(oid) LIKE '%(user_id)%'), 'FK user_roles.user_id');

SELECT ok(EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.occurrences'::regclass AND contype='f' AND pg_get_constraintdef(oid) LIKE '%(author_id)%'), 'FK occurrences.author_id');

SELECT ok(EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.occurrences'::regclass AND contype='f' AND pg_get_constraintdef(oid) LIKE '%(ai_analysis_id)%'), 'FK occurrences.ai_analysis_id');

SELECT ok(EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.occurrence_photos'::regclass AND contype='f' AND pg_get_constraintdef(oid) LIKE '%(occurrence_id)%'), 'FK occurrence_photos.occurrence_id');

SELECT ok(EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.occurrence_history'::regclass AND contype='f' AND pg_get_constraintdef(oid) LIKE '%(occurrence_id)%'), 'FK occurrence_history.occurrence_id');

SELECT ok(EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.votes'::regclass AND contype='f' AND pg_get_constraintdef(oid) LIKE '%(user_id)%'), 'FK votes.user_id');

SELECT ok(EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.forwardings'::regclass AND contype='f' AND pg_get_constraintdef(oid) LIKE '%(agency_id)%'), 'FK forwardings.agency_id');

SELECT ok(EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.forwardings'::regclass AND contype='f' AND pg_get_constraintdef(oid) LIKE '%(admin_id)%'), 'FK forwardings.admin_id');

SELECT ok(EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.occurrence_photos'::regclass AND contype='u' AND pg_get_constraintdef(oid) LIKE '%(occurrence_id, "position")%' ), 'Unicidade occurrence_photos (occurrence_id, "position")');

SELECT ok(EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.votes'::regclass AND contype='u' AND pg_get_constraintdef(oid) LIKE '%(occurrence_id, user_id)%' ), 'Unicidade votes (occurrence_id, user_id)');

SELECT ok(EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.occurrences'::regclass AND contype='u' AND pg_get_constraintdef(oid) LIKE '%(ai_analysis_id)%' ), 'Unicidade occurrences (ai_analysis_id)');

SELECT ok(to_regclass('public.occurrences_author_created_idx') IS NOT NULL, 'Índice occurrences.occurrences_author_created_idx');

SELECT ok(to_regclass('public.occurrences_status_created_idx') IS NOT NULL, 'Índice occurrences.occurrences_status_created_idx');

SELECT ok(to_regclass('public.occurrences_location_original_gist') IS NOT NULL, 'Índice occurrences.occurrences_location_original_gist');

SELECT ok(to_regclass('public.occurrences_location_adjusted_gist') IS NOT NULL, 'Índice occurrences.occurrences_location_adjusted_gist');

SELECT ok(EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='finalize_occurrence'), 'RPC finalize_occurrence');

SELECT ok(EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='transition_occurrence'), 'RPC transition_occurrence');

SELECT ok(EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='register_vote'), 'RPC register_vote');

SELECT ok(EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='adjust_occurrence_location'), 'RPC adjust_occurrence_location');

SELECT ok(EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_admin_dashboard'), 'RPC get_admin_dashboard');

SELECT ok(EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_my_occurrences'), 'RPC get_my_occurrences');

SELECT ok(EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_occurrence_detail'), 'RPC get_occurrence_detail');

SELECT ok(EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_occurrence_history'), 'RPC get_occurrence_history');

SELECT ok(EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='admin_list_occurrences'), 'RPC admin_list_occurrences');

SELECT ok(EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='create_observation'), 'RPC create_observation');

SELECT ok(EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='create_forwarding'), 'RPC create_forwarding');

SELECT ok(EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='record_forwarding_result'), 'RPC record_forwarding_result');

SELECT ok(EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='set_occurrence_public_visibility'), 'RPC set_occurrence_public_visibility');

SELECT ok(EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='deactivate_my_account'), 'RPC deactivate_my_account');

SELECT ok(EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_select_own'), 'Policy profiles_select_own');

SELECT ok(EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_roles' AND policyname='user_roles_select_own'), 'Policy user_roles_select_own');

SELECT ok(EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='occurrences' AND policyname='occurrences_select_own_or_admin'), 'Policy occurrences_select_own_or_admin');

SELECT ok(EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='notifications_select_own'), 'Policy notifications_select_own');

SELECT ok(EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='observations' AND policyname='observations_select_visible'), 'Policy observations_select_visible');

SELECT ok(EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='forwardings' AND policyname='forwardings_select_admin'), 'Policy forwardings_select_admin');

SELECT ok(EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='agencies' AND policyname='agencies_select_admin'), 'Policy agencies_select_admin');

SELECT ok(NOT has_function_privilege('anon','public.create_forwarding(uuid,uuid,character varying,text)'::regprocedure,'EXECUTE'), 'Anon não executa create_forwarding');

SELECT ok(NOT has_function_privilege('anon','public.record_forwarding_result(uuid,public.forwarding_status,character varying,character varying)'::regprocedure,'EXECUTE'), 'Anon não executa record_forwarding_result');

SELECT ok(NOT has_function_privilege('anon','public.deactivate_my_account()'::regprocedure,'EXECUTE'), 'Anon não executa deactivate_my_account');

SELECT ok(EXISTS(SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='occurrence_photos' AND indexdef ILIKE '%occurrence_id%'), 'Índice consulta fotos');

SELECT * FROM finish();
ROLLBACK;
