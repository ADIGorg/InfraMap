-- DB-05 fix: alinha allowed_mime_types do bucket occurrence-photos ao spec.
--
-- O bucket foi criado com {image/jpeg} (estado residual de uma execução
-- anterior de db push durante o conflito de migrations de DB-04).
-- O INSERT ... ON CONFLICT DO NOTHING da migration original preservou o
-- valor existente. Correção via UPDATE idempotente.
--
-- Spec: anexo 02 §4.6, §11 + D09 — apenas image/jpeg e image/png.

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png']::text[]
WHERE id = 'occurrence-photos';