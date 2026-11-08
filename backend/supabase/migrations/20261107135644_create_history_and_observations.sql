-- DB-06: histórico imutável (append-only) e observações administrativas.
-- Depende de DB-01 (ENUMs: history_actor_type, observation_visibility) e DB-04 (occurrences).
--
-- Cria:
--   1. public.occurrence_history — linha do tempo de eventos. Append-only.
--   2. public.observations — observações administrativas com visibilidade.
--   3. Índices cronológicos.
--   4. Bloqueio absoluto de UPDATE/DELETE em occurrence_history (trigger ENABLE ALWAYS).
--
-- Regras de aplicação (fora do escopo desta migration):
--   - "Somente administradores ativos criam observações" → DB-09 (RLS).
--   - "CITIZEN_RESPONSE gera notificação" → DB-10 (função) + módulo notifications.

-- ==========================================
-- 1. occurrence_history
-- ==========================================

CREATE TABLE public.occurrence_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    occurrence_id UUID NOT NULL
        REFERENCES public.occurrences(id) ON DELETE CASCADE,

    actor_id UUID
        REFERENCES public.profiles(id) ON DELETE SET NULL,

    actor_type public.history_actor_type NOT NULL,

    action VARCHAR(100) NOT NULL,

    previous_data JSONB,
    new_data JSONB,
    details JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.occurrence_history IS
    'Linha do tempo imutável de eventos. Append-only — UPDATE/DELETE bloqueados por trigger ENABLE ALWAYS.';

COMMENT ON COLUMN public.occurrence_history.actor_type IS
    'SYSTEM → actor_id IS NULL (ações automáticas do sistema); USER → actor_id preenchido (admins, autor).';

COMMENT ON COLUMN public.occurrence_history.action IS
    'Ações canônicas: OCCURRENCE_CREATED | ANALYSIS_STARTED | OCCURRENCE_CONFIRMED | OCCURRENCE_REJECTED | PRIORITY_DEFINED | PRIORITY_UPDATED | STATUS_CHANGED | OBSERVATION_ADDED | LOCATION_ADJUSTED | CLASSIFICATION_UPDATED.';

-- ==========================================
-- 2. observations
-- ==========================================

CREATE TABLE public.observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    occurrence_id UUID NOT NULL
        REFERENCES public.occurrences(id) ON DELETE CASCADE,

    admin_id UUID NOT NULL
        REFERENCES public.profiles(id),

    content TEXT NOT NULL,

    visibility public.observation_visibility NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.observations IS
    'Observações administrativas. INTERNAL → somente admins; CITIZEN_RESPONSE → admins + autor.';

COMMENT ON COLUMN public.observations.visibility IS
    'INTERNAL → somente admins. CITIZEN_RESPONSE → admins + autor da ocorrência.';

-- ==========================================
-- 3. Índices cronológicos (ticket + anexo 02 §7)
-- ==========================================

CREATE INDEX occurrence_history_occurrence_created_idx
    ON public.occurrence_history (occurrence_id, created_at DESC);

CREATE INDEX observations_occurrence_created_idx
    ON public.observations (occurrence_id, created_at DESC);

-- ==========================================
-- 4. Append-only em occurrence_history
-- ==========================================
-- Bloqueio absoluto: ENABLE ALWAYS garante disparo mesmo em
-- session_replication_role = 'replica'.
--
-- CASCADE de occurrences é permitido: durante a remoção da ocorrência,
-- o DELETE em occurrence_history roda em profundidade > 1 do stack
-- de triggers (pg_trigger_depth). Isso diferencia uma deleção direta
-- (cliente tentando apagar histórico) de uma cascata legítima.

CREATE OR REPLACE FUNCTION public.occurrence_history_prevent_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
        -- Cascata originada pela remoção da ocorrência. Permitir.
        RETURN OLD;
    END IF;

    RAISE EXCEPTION
        'occurrence_history é append-only: % não permitido.', TG_OP
        USING ERRCODE = 'insufficient_privilege';
END;
$$;

COMMENT ON FUNCTION public.occurrence_history_prevent_mutation() IS
    'Bloqueia UPDATE/DELETE diretos em occurrence_history. Permite cascata via pg_trigger_depth > 1.';

CREATE TRIGGER occurrence_history_no_update
    BEFORE UPDATE ON public.occurrence_history
    FOR EACH ROW
    EXECUTE FUNCTION public.occurrence_history_prevent_mutation();

CREATE TRIGGER occurrence_history_no_delete
    BEFORE DELETE ON public.occurrence_history
    FOR EACH ROW
    EXECUTE FUNCTION public.occurrence_history_prevent_mutation();

ALTER TABLE public.occurrence_history
    ENABLE ALWAYS TRIGGER occurrence_history_no_update;

ALTER TABLE public.occurrence_history
    ENABLE ALWAYS TRIGGER occurrence_history_no_delete;

-- ==========================================
-- 5. Revogação de UPDATE/DELETE para clientes
-- ==========================================
-- Defesa em profundidade (anexo 02 §6, I14: "Sem grants UPDATE/DELETE").
-- O trigger acima já bloqueia tudo; o REVOKE torna o invariante explícito
-- no catálogo de privilégios.

REVOKE UPDATE, DELETE ON TABLE public.occurrence_history
    FROM anon, authenticated;