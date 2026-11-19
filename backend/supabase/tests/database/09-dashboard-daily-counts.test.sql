-- API1-103: somente Supabase descartável, totalmente migrado; rollback obrigatório.
BEGIN;
SELECT plan(15);
SET LOCAL TIME ZONE 'UTC';
INSERT INTO auth.users(id, email, raw_user_meta_data)
VALUES ('00000000-0000-4000-8000-000000009101', 'daily-admin@example.invalid', '{"name":"Daily admin"}');
UPDATE public.user_roles SET role='ADMIN', admin_level='OPERATIONAL'
WHERE user_id='00000000-0000-4000-8000-000000009101';
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000009101', true);

SELECT is(jsonb_array_length(public.get_admin_dashboard()->'daily_counts'), 7, 'Sempre sete dias');
SELECT is((SELECT sum((day->>'count')::int)::int FROM jsonb_array_elements(public.get_admin_dashboard()->'daily_counts') day), 0, 'Base vazia tem sete zeros reais');
SELECT is(public.get_admin_dashboard()->>'daily_counts_timezone', 'America/Sao_Paulo', 'Calendário explícito');

-- Criados no limite inferior, um microssegundo antes/depois das fronteiras e hoje/futuro.
DO $fixtures$
DECLARE
  today date := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date;
  start_at timestamptz := (today - 7)::timestamp AT TIME ZONE 'America/Sao_Paulo';
  end_at timestamptz := today::timestamp AT TIME ZONE 'America/Sao_Paulo';
  created timestamptz;
  analysis uuid;
  occurrence uuid;
BEGIN
  FOREACH created IN ARRAY ARRAY[
    start_at - interval '1 microsecond', start_at, start_at + interval '1 hour',
    ((today - 4)::timestamp AT TIME ZONE 'America/Sao_Paulo') - interval '1 microsecond',
    end_at - interval '1 microsecond', end_at - interval '1 hour', end_at, end_at + interval '1 day'
  ] LOOP
    INSERT INTO public.ai_analyses(user_id, input_photo_paths, status)
    VALUES ('00000000-0000-4000-8000-000000009101', '["fixture.jpg"]', 'CONSUMED') RETURNING id INTO analysis;
    INSERT INTO public.occurrences(author_id, category_id, ai_analysis_id, description,
      category_source, description_source, location_original, location_source, created_at)
    VALUES ('00000000-0000-4000-8000-000000009101', (SELECT id FROM public.categories WHERE code='CAT01'),
      analysis, 'Fixture série diária', 'AI_CONFIRMED', 'AI_CONFIRMED',
      extensions.ST_SetSRID(extensions.ST_MakePoint(-46,-23),4326)::extensions.geography, 'MANUAL', created)
    RETURNING id INTO occurrence;
    INSERT INTO public.occurrence_photos(occurrence_id, storage_path, mime_type, size_bytes, position)
    SELECT occurrence, 'occurrences/' || occurrence || '/photo-' || n || '.jpg', 'image/jpeg', 100, n
    FROM generate_series(1,3) n;
    INSERT INTO public.occurrence_history(occurrence_id, actor_type, action)
    SELECT occurrence, 'SYSTEM', 'DAILY_TEST' FROM generate_series(1,2);
  END LOOP;
END;
$fixtures$;

CREATE TEMP TABLE daily_snapshot AS SELECT public.get_admin_dashboard() AS data;
GRANT SELECT ON daily_snapshot TO authenticated;
SET LOCAL ROLE authenticated;
SELECT is((SELECT jsonb_agg(day->'count' ORDER BY ord) FROM jsonb_array_elements(public.get_admin_dashboard()->'daily_counts') WITH ORDINALITY AS days(day,ord)),
  '[2,0,1,0,0,0,2]'::jsonb, 'Fronteiras locais corretas; fotos/histórico não multiplicam ocorrências');
SELECT is(public.get_admin_dashboard()->'daily_counts'->0->>'date',
  to_char((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date - 7, 'YYYY-MM-DD'), 'Primeiro dia incluído');
SELECT is(public.get_admin_dashboard()->'daily_counts'->6->>'date',
  to_char((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date - 1, 'YYYY-MM-DD'), 'Ontem é último dia; hoje excluído');
SELECT is((SELECT bool_and((day->>'date')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date - 8 + ord::int)
  FROM jsonb_array_elements(public.get_admin_dashboard()->'daily_counts') WITH ORDINALITY AS days(day,ord)), true, 'Datas consecutivas e crescentes');
SELECT is(public.get_admin_dashboard()->'counts_by_status'->>'RECEIVED', '8', 'Totais existentes continuam incluindo hoje e fora da janela');
SET LOCAL TIME ZONE 'Pacific/Auckland';
SELECT is(public.get_admin_dashboard(), (SELECT data FROM daily_snapshot), 'Timezone da conexão não altera calendário nem agregados');
RESET ROLE;
UPDATE public.user_roles SET admin_level='MASTER' WHERE user_id='00000000-0000-4000-8000-000000009101';
SET LOCAL ROLE authenticated;
SELECT is(public.get_admin_dashboard(), (SELECT data FROM daily_snapshot), 'MASTER e OPERATIONAL recebem a mesma série');
RESET ROLE;
UPDATE public.user_roles SET is_active=false WHERE user_id='00000000-0000-4000-8000-000000009101';
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.get_admin_dashboard()$$, '42501', NULL, 'ADMIN inativo bloqueado');
RESET ROLE;
UPDATE public.user_roles SET is_active=true, role='CITIZEN', admin_level=NULL WHERE user_id='00000000-0000-4000-8000-000000009101';
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.get_admin_dashboard()$$, '42501', NULL, 'CITIZEN bloqueado');
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT throws_ok($$SELECT public.get_admin_dashboard()$$, '42501', NULL, 'Sem identidade bloqueado');
RESET ROLE;
SELECT ok(NOT has_function_privilege('anon', 'public.get_admin_dashboard()', 'EXECUTE'), 'Anon não executa RPC');
SELECT ok(has_function_privilege('authenticated', 'public.get_admin_dashboard()', 'EXECUTE'), 'Authenticated mantém grant com validação interna');
SELECT * FROM finish();
ROLLBACK;
