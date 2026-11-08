-- DB-08: auditoria de integridade + índices de performance em occurrences.
--
-- Auditoria (constraints):
--   Todas as PKs, FKs, UNIQUEs e CHECKs previstas no anexo 02 já foram
--   criadas em DB-01 a DB-07. Esta migration NÃO reescreve nenhuma delas.
--   Os testes T01–T14 confirmam a integridade existente. Se alguma das
--   migrations anteriores regredir, os testes falham e sinalizam.
--
-- Índices criados aqui (faltantes do §7):
--   occurrences.author_id, created_at DESC  — "minhas ocorrências"
--   occurrences.status, created_at DESC     — listagens públicas/administrativas
--   occurrences.category_id                 — filtro por categoria
--   occurrences.priority                    — filtro/ordenação por prioridade
--   occurrences.location_original (GIST)    — bbox no mapa público
--   occurrences.location_adjusted (GIST)    — bbox com ajuste administrativo
--
-- Índices já existentes (não recriados):
--   occurrence_photos: UNIQUE(storage_path), UNIQUE(occurrence_id, position) → DB-05
--   occurrence_history: INDEX(occurrence_id, created_at DESC)                → DB-06
--   observations: INDEX(occurrence_id, created_at DESC)                      → DB-06
--   votes: UNIQUE(occurrence_id, user_id)                                    → DB-07
--   notifications: INDEX(user_id, created_at DESC), (user_id, read_at)       → DB-07

-- ==========================================
-- 1. Índices B-tree (§7)
-- ==========================================

CREATE INDEX IF NOT EXISTS occurrences_author_created_idx
    ON public.occurrences (author_id, created_at DESC);

CREATE INDEX IF NOT EXISTS occurrences_status_created_idx
    ON public.occurrences (status, created_at DESC);

CREATE INDEX IF NOT EXISTS occurrences_category_idx
    ON public.occurrences (category_id);

CREATE INDEX IF NOT EXISTS occurrences_priority_idx
    ON public.occurrences (priority);

-- ==========================================
-- 2. Índices espaciais GiST (§7, §12)
-- ==========================================
-- Viabilizam consultas com bbox (mapas público e administrativo) e
-- proximidade. PostGIS GEOGRAPHY usa gist_geography_ops nativo; nenhum
-- operator class explícito é necessário.

CREATE INDEX IF NOT EXISTS occurrences_location_original_gist
    ON public.occurrences USING GIST (location_original);

CREATE INDEX IF NOT EXISTS occurrences_location_adjusted_gist
    ON public.occurrences USING GIST (location_adjusted);