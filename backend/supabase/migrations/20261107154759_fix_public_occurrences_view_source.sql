-- Fix DB-13 v2: helper SECURITY DEFINER para a view public_occurrences.
--
-- Contexto: `REVOKE SELECT ON occurrences FROM anon, authenticated` fechou o
-- vazamento de colunas (author_id, location_original, priority, etc.) via
-- PostgREST direto. Mas quebrou a view `public_occurrences` — com
-- `security_invoker=true`, a view roda com privilégios do caller, que agora
-- não tem SELECT na tabela.
--
-- Solução: helper `public_occurrences_source()` (SECURITY DEFINER) lê a tabela
-- como postgres, filtra CONFIRMED/IN_SERVICE, e retorna APENAS colunas públicas
-- + localização aproximada. A view consome o helper (não a tabela) e continua
-- `security_invoker=true` (spec §10).
--
-- Segurança: o helper só retorna 6 colunas — nenhuma privada. Chamá-lo direto
-- (via GRANT EXECUTE) não expõe nada além do que a view já mostra.

CREATE OR REPLACE FUNCTION public.public_occurrences_source()
RETURNS TABLE (
  id UUID,
  category_id UUID,
  description VARCHAR(500),
  status public.occurrence_status,
  created_at TIMESTAMPTZ,
  location_approximate extensions.geography
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    o.id,
    o.category_id,
    o.description,
    o.status,
    o.created_at,
    extensions.ST_SnapToGrid(o.location_original::extensions.geometry, 0.001)::extensions.geography
  FROM public.occurrences o
  WHERE o.status IN ('CONFIRMED', 'IN_SERVICE');
$$;

COMMENT ON FUNCTION public.public_occurrences_source() IS
  'Fonte da view public_occurrences. SECURITY DEFINER porque anon/authenticated '
  'não têm SELECT em occurrences (fix DB-13). Expõe apenas campos públicos e '
  'localização aproximada.';

REVOKE EXECUTE ON FUNCTION public.public_occurrences_source() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_occurrences_source() TO anon, authenticated;

-- DROP + CREATE em vez de CREATE OR REPLACE: PostgreSQL perde o length
-- VARCHAR(500) quando o SELECT vem de uma função (o typmod existe na
-- assinatura da função, mas não na saída do SELECT ... FROM function()).
-- CREATE OR REPLACE falha com SQLSTATE 42P16 ao tentar mudar o tipo da
-- coluna "description". DROP + CREATE aceita a nova definição.

DROP VIEW IF EXISTS public.public_occurrences;

CREATE VIEW public.public_occurrences
WITH (security_invoker = true)
AS
SELECT
  o.id,
  c.code AS category_code,
  c.name AS category_name,
  o.description::VARCHAR(500) AS description,   -- cast explícito: restaura o length
  o.status,
  o.created_at,
  o.location_approximate,
  public.count_votes(o.id) AS vote_count
FROM public.public_occurrences_source() o
JOIN public.categories c ON c.id = o.category_id;

COMMENT ON VIEW public.public_occurrences IS
  'Projeção pública via helper SECURITY DEFINER. Não expõe author_id, '
  'location_original exata, priority, ai_analysis_id ou paths de Storage.';