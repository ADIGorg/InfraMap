-- DB-09 fix: relaxa `occurrences_select_own_or_admin` para incluir
-- CONFIRMED/IN_SERVICE de outros usuários.
--
-- Resolve conflito entre anexo 02 §8 ("cidadão → SELECT próprias") e
-- anexo 03 §5.5 (mapa: CONFIRMED/IN_SERVICE visíveis a todos). Sem essa
-- relaxação, a view `public_occurrences` com `security_invoker=true`
-- retorna vazio para usuários autenticados que não são autores — quebrando
-- o mapa público no app do cidadão.
--
-- Policies de anon e admin permanecem intactas.

DROP POLICY IF EXISTS occurrences_select_own_or_admin ON public.occurrences;

CREATE POLICY occurrences_select_own_or_admin
ON public.occurrences FOR SELECT
TO authenticated
USING (
  author_id = (SELECT auth.uid())
  OR status IN ('CONFIRMED', 'IN_SERVICE')
  OR public.is_admin()
);