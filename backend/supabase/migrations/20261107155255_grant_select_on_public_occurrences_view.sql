-- Fix: regrant SELECT na view public_occurrences após DROP VIEW da migration
-- 20261107154759_fix_public_occurrences_view_source.
--
-- Contexto: DROP VIEW remove grants junto com a view. O CREATE VIEW
-- subsequente não herda permissões. Sem este grant, anon/authenticated não
-- conseguem consultar a view pública.
--
-- Idempotente: GRANT é no-op se já existir.

GRANT SELECT ON public.public_occurrences TO anon, authenticated;