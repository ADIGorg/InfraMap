-- QA-01/02/03 security corrections on top of the 43 already applied migrations.
-- Keep historical migrations IMMUTABLE; this patch can be applied to staging before prod.
-- Root cause: 20261107153937 revoked SELECT from authenticated but moderation uses
-- an authenticated PostgREST SELECT on occurrences.
--
-- SECURITY INVARIANT: authenticated can SELECT *only* OWN rows or rows as
-- an active administrator; public discovery must use public_occurrences view
-- and its SECURITY DEFINER projection (never expose original coordinates).
BEGIN;

GRANT SELECT ON TABLE public.occurrences TO authenticated;

DROP POLICY IF EXISTS occurrences_select_own_or_admin ON public.occurrences;
CREATE POLICY occurrences_select_own_or_admin
  ON public.occurrences FOR SELECT TO authenticated
  USING (
    author_id = (SELECT auth.uid())
    OR (SELECT public.is_admin())
  );

-- Do not restore anon SELECT on public.occurrences: anon can query only
-- security_invoker public_occurrences via public_occurrences_source().
REVOKE SELECT ON public.occurrences FROM anon;

-- For photos of a publicly eligible occurrence, public_visible must be TRUE.
-- This helper runs as a privileged owner for the photo RLS policy.
CREATE OR REPLACE FUNCTION public.is_occurrence_visible(p_occurrence_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.occurrences o
    WHERE o.id = p_occurrence_id AND (
      o.author_id = (SELECT auth.uid())
      OR (SELECT public.is_admin())
      OR (o.status IN ('CONFIRMED', 'IN_SERVICE') AND o.public_visible = TRUE)
    )
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_occurrence_visible(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_occurrence_visible(UUID) TO authenticated;

-- A citizen must not read INTERNAL observations, *including audit event details*.
DROP POLICY IF EXISTS occurrence_history_select_own_or_admin ON public.occurrence_history;
CREATE POLICY occurrence_history_select_own_or_admin
  ON public.occurrence_history FOR SELECT TO authenticated
  USING (
    (SELECT public.is_admin())
    OR (
      action <> 'OBSERVATION_INTERNAL_ADDED'
      AND EXISTS (
        SELECT 1 FROM public.occurrences o
        WHERE o.id = occurrence_history.occurrence_id
          AND o.author_id = (SELECT auth.uid())
      )
    )
  );

-- SECURITY DEFINER RPC must filter internal audit events independently of RLS.
CREATE OR REPLACE FUNCTION public.get_occurrence_history(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_occ public.occurrences%ROWTYPE;
  v_is_admin BOOLEAN;
  v_is_author BOOLEAN;
  v_data JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_occ FROM public.occurrences WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ocorrência não encontrada.' USING ERRCODE = 'no_data_found';
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uid AND role = 'ADMIN' AND is_active = TRUE) INTO v_is_admin;
  v_is_author := (v_occ.author_id = v_uid);

  IF NOT v_is_admin AND NOT v_is_author THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id',            h.id,
    'actor_id',      h.actor_id,
    'action',        h.action,
    'actor_type',    h.actor_type,
    'previous_data', h.previous_data,
    'new_data',      h.new_data,
    'details',       h.details,
    'created_at',    h.created_at
  ) ORDER BY h.created_at ASC), '[]'::jsonb)
  INTO v_data
  FROM public.occurrence_history h
  WHERE h.occurrence_id = p_id
    AND (v_is_admin OR h.action <> 'OBSERVATION_INTERNAL_ADDED');

  RETURN jsonb_build_object('data', v_data);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_occurrence_history(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_occurrence_history(UUID) TO authenticated;

-- PL/pgSQL RETURNS public.occurrences needs a row value, not a SELECT * subquery.
CREATE OR REPLACE FUNCTION public.update_occurrence_priority(
  p_occurrence_id UUID,
  p_priority      public.occurrence_priority
) RETURNS public.occurrences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid    UUID := (SELECT auth.uid());
  v_occ    public.occurrences%ROWTYPE;
  v_action VARCHAR(100);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores ativos.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_occ FROM public.occurrences WHERE id = p_occurrence_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ocorrência não encontrada.' USING ERRCODE = 'no_data_found';
  END IF;

  IF v_occ.status NOT IN ('CONFIRMED', 'IN_SERVICE', 'RESOLVED') THEN
    RAISE EXCEPTION 'Prioridade só pode ser definida/alterada em CONFIRMED, IN_SERVICE ou RESOLVED. Atual: %.',
      v_occ.status USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF v_occ.priority IS NOT DISTINCT FROM p_priority THEN
    RAISE EXCEPTION 'Prioridade já é %.', p_priority USING ERRCODE = 'invalid_parameter_value';
  END IF;

  v_action := CASE WHEN v_occ.priority IS NULL
                   THEN 'PRIORITY_DEFINED'
                   ELSE 'PRIORITY_UPDATED' END;

  UPDATE public.occurrences
     SET priority = p_priority, updated_at = NOW()
   WHERE id = p_occurrence_id;

  INSERT INTO public.occurrence_history
    (occurrence_id, actor_id, actor_type, action, previous_data, new_data)
  VALUES (
    p_occurrence_id, v_uid, 'USER', v_action,
    CASE WHEN v_occ.priority IS NOT NULL
         THEN jsonb_build_object('priority', v_occ.priority::text)
         ELSE NULL END,
    jsonb_build_object('priority', p_priority::text)
  );

  SELECT * INTO v_occ FROM public.occurrences WHERE id = p_occurrence_id;
  RETURN v_occ;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.update_occurrence_priority(
  UUID, public.occurrence_priority
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_occurrence_priority(
  UUID, public.occurrence_priority
) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_occurrence_public_visibility(
  p_occurrence_id UUID,
  p_visible       BOOLEAN
) RETURNS public.occurrences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_occ public.occurrences%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores ativos.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_occ FROM public.occurrences WHERE id = p_occurrence_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ocorrência não encontrada.' USING ERRCODE = 'no_data_found';
  END IF;

  IF v_occ.status NOT IN ('CONFIRMED', 'IN_SERVICE') THEN
    RAISE EXCEPTION 'Visibilidade só controlada em CONFIRMED ou IN_SERVICE (RN022). Atual: %.',
      v_occ.status USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF v_occ.public_visible = p_visible THEN
    RAISE EXCEPTION 'Visibilidade já é %.', p_visible USING ERRCODE = 'invalid_parameter_value';
  END IF;

  UPDATE public.occurrences
     SET public_visible = p_visible, updated_at = NOW()
   WHERE id = p_occurrence_id;

  INSERT INTO public.occurrence_history
    (occurrence_id, actor_id, actor_type, action, previous_data, new_data)
  VALUES (
    p_occurrence_id, v_uid, 'USER', 'PUBLIC_VISIBILITY_CHANGED',
    jsonb_build_object('public_visible', v_occ.public_visible),
    jsonb_build_object('public_visible', p_visible)
  );

  SELECT * INTO v_occ FROM public.occurrences WHERE id = p_occurrence_id;
  RETURN v_occ;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_occurrence_public_visibility(UUID, BOOLEAN)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_occurrence_public_visibility(UUID, BOOLEAN)
  TO authenticated;

-- ACL hardening: access to forwarding RPCs is limited to authenticated admins
-- (functions also check admin membership and forwarding ownership).
REVOKE EXECUTE ON FUNCTION public.create_forwarding(UUID, UUID, VARCHAR, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_forwarding(UUID, UUID, VARCHAR, TEXT)
  TO authenticated;

REVOKE EXECUTE ON FUNCTION public.record_forwarding_result(
  UUID, public.forwarding_status, VARCHAR, VARCHAR
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_forwarding_result(
  UUID, public.forwarding_status, VARCHAR, VARCHAR
) TO authenticated;

COMMIT;
