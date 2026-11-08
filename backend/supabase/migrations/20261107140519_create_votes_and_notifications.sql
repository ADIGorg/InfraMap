-- DB-07: votos comunitários e notificações direcionadas.
-- Depende de DB-01 (ENUM notification_type), DB-04 (occurrences) e profiles.
--
-- Cria:
--   1. public.votes — 1 voto por cidadão por ocorrência (I13).
--   2. public.notifications — notificações persistentes (I15).
--   3. Índices de notificações para consultas por usuário e data (§7).
--
-- Regras de aplicação (fora do escopo desta migration):
--   - Só CITIZEN ativo vota → RLS (DB-09) + register_vote (DB-10).
--   - Sem auto-voto, só CONFIRMED/IN_SERVICE → register_vote (DB-10).
--   - Notificações criadas na mesma transação da mudança de status
--     → transition_occurrence (DB-10).

-- ==========================================
-- 1. votes
-- ==========================================

CREATE TABLE public.votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    occurrence_id UUID NOT NULL
        REFERENCES public.occurrences(id) ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(id),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT votes_occurrence_user_unique
        UNIQUE (occurrence_id, user_id)
);

COMMENT ON TABLE public.votes IS
    'Votos comunitários. 1 por cidadão por ocorrência (I13). Sem auto-voto e só em CONFIRMED/IN_SERVICE — regras de aplicação (register_vote).';

COMMENT ON COLUMN public.votes.user_id IS
    'CITIZEN ativo. FK RESTRICT (default) — profiles são anonimizados, nunca deletados.';

-- ==========================================
-- 2. notifications
-- ==========================================

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES public.profiles(id),

    occurrence_id UUID
        REFERENCES public.occurrences(id) ON DELETE SET NULL,

    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,

    type public.notification_type NOT NULL,

    read_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.notifications IS
    'Notificações persistidas. REST é fonte de verdade; Realtime é canal opcional (§7 do anexo 07).';

COMMENT ON COLUMN public.notifications.occurrence_id IS
    'Opcional. ON DELETE SET NULL — notificação sobrevive à remoção da ocorrência, perdendo o vínculo.';

COMMENT ON COLUMN public.notifications.read_at IS
    'NULL = não lida. Timestamp = lida nesta data.';

COMMENT ON COLUMN public.notifications.type IS
    'OCCURRENCE_STATUS_CHANGED (mudança de status) | CITIZEN_RESPONSE (observação CITIZEN_RESPONSE).';

-- ==========================================
-- 3. Índices (§7 do anexo 02)
-- ==========================================
-- UNIQUE(occurrence_id, user_id) em votes já cria o índice de cobertura
-- para busca e unicidade. Nenhum índice adicional é previsto pela spec.

CREATE INDEX notifications_user_created_idx
    ON public.notifications (user_id, created_at DESC);

CREATE INDEX notifications_user_read_idx
    ON public.notifications (user_id, read_at);