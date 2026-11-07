-- DB-09: RLS policies + hardening de Storage.
-- Depende de DB-01..DB-08.
--
-- `profiles` e `user_roles` já têm RLS desde a migration inicial
-- (20261101202618). NÃO são reconfiguradas aqui.

-- ============================================
-- 1. HELPERS
-- ============================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
      AND role = 'ADMIN' AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_master()
RETURNS BOOLEAN
LANGUAGE sql STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
      AND role = 'ADMIN' AND admin_level = 'MASTER' AND is_active = TRUE
  );
$$;

-- SECURITY DEFINER: bypassa RLS de occurrences/user_roles para verificar
-- visibilidade sem depender do que o invocador consegue ler. Necessário
-- porque a policy de occurrence_photos precisa enxergar ocorrências
-- públicas de OUTROS usuários.
CREATE OR REPLACE FUNCTION public.is_occurrence_visible(p_occurrence_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.occurrences o
    WHERE o.id = p_occurrence_id
      AND (
        o.author_id = (SELECT auth.uid())
        OR o.status IN ('CONFIRMED', 'IN_SERVICE')
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = (SELECT auth.uid())
            AND ur.role = 'ADMIN' AND ur.is_active = TRUE
        )
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin()          FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin_master()   FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_occurrence_visible(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_admin()          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_master()   TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_occurrence_visible(UUID) TO authenticated;

-- ============================================
-- 2. ENABLE RLS
-- ============================================

ALTER TABLE public.categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analyses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrences        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrence_photos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrence_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications      ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. GRANTS (mínimos, revogando grants amplos do Supabase)
-- ============================================

REVOKE ALL ON TABLE
  public.categories, public.ai_analyses, public.occurrences,
  public.occurrence_photos, public.occurrence_history,
  public.observations, public.votes, public.notifications
FROM anon, authenticated;

GRANT SELECT ON TABLE public.categories         TO anon, authenticated;
GRANT SELECT ON TABLE public.occurrences        TO anon;  -- necessário para security_invoker view (DB-10)
GRANT SELECT ON TABLE public.occurrences        TO authenticated;
GRANT SELECT ON TABLE public.ai_analyses        TO authenticated;
GRANT SELECT ON TABLE public.occurrence_photos  TO authenticated;
GRANT SELECT ON TABLE public.occurrence_history TO authenticated;
GRANT SELECT ON TABLE public.observations       TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.votes         TO authenticated;
GRANT SELECT, UPDATE         ON TABLE public.notifications TO authenticated;

-- ============================================
-- 4. POLICIES
-- ============================================

CREATE POLICY categories_select_public
ON public.categories FOR SELECT
TO anon, authenticated
USING (is_active = TRUE OR public.is_admin());

CREATE POLICY ai_analyses_select_own_or_admin
ON public.ai_analyses FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()) OR public.is_admin());

-- anon: só CONFIRMED/IN_SERVICE (para a view pública de DB-10).
CREATE POLICY occurrences_select_anon_public
ON public.occurrences FOR SELECT
TO anon
USING (status IN ('CONFIRMED', 'IN_SERVICE'));

CREATE POLICY occurrences_select_own_or_admin
ON public.occurrences FOR SELECT
TO authenticated
USING (author_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY occurrence_photos_select_visible
ON public.occurrence_photos FOR SELECT
TO authenticated
USING (public.is_occurrence_visible(occurrence_photos.occurrence_id));

-- Histórico: só das PRÓPRIAS ocorrências (+ admin). Não expõe histórico de
-- ocorrências públicas de terceiros (mais restrito que photos).
CREATE POLICY occurrence_history_select_own_or_admin
ON public.occurrence_history FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.occurrences o
    WHERE o.id = occurrence_history.occurrence_id
      AND o.author_id = (SELECT auth.uid())
  )
);

-- Observações: cidadão vê só CITIZEN_RESPONSE das próprias ocorrências;
-- admin vê tudo (INTERNAL + CITIZEN_RESPONSE de todas).
CREATE POLICY observations_select_visible
ON public.observations FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR (
    visibility = 'CITIZEN_RESPONSE'
    AND EXISTS (
      SELECT 1 FROM public.occurrences o
      WHERE o.id = observations.occurrence_id
        AND o.author_id = (SELECT auth.uid())
    )
  )
);

-- Votos: admin SELECT, cidadão INSERT/DELETE próprios.
CREATE POLICY votes_select_admin
ON public.votes FOR SELECT TO authenticated
USING (public.is_admin());

CREATE POLICY votes_insert_own
ON public.votes FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid())
      AND role = 'CITIZEN' AND is_active = TRUE
  )
);

CREATE POLICY votes_delete_own
ON public.votes FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

-- Notificações: só destinatário (admin não vê — spec §8).
CREATE POLICY notifications_select_own
ON public.notifications FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY notifications_update_own
ON public.notifications FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================
-- 5. STORAGE — proteger bucket privado
-- ============================================
-- O bucket `occurrence-photos` é privado (public=false, DB-05). Nenhuma
-- policy permissiva para anon/authenticated é criada em storage.objects.
-- RLS é deny-by-default: sem policy = sem acesso. Backend gera signed URLs
-- com service_role (que bypassa RLS), e apenas para ocorrências em
-- CONFIRMED/IN_SERVICE (regra de aplicação no módulo occurrences).
--
-- Se existir alguma policy permissiva deixada por setup anterior para este
-- bucket, o teste T12 detecta e reporta.

-- ============================================
-- 6. Realtime (opcional — Realtime é DB-12, apenas configuração preparada)
-- ============================================
-- Não configurado aqui. Vai em DB-12 (P1).