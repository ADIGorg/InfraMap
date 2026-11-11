-- MOD-03: Observações administrativas e histórico
-- Dependências: MOD-01, MOD-02

-- Garante que o enum de visibilidade existe
DO $$ BEGIN
  CREATE TYPE observation_visibility AS ENUM ('INTERNAL', 'CITIZEN_RESPONSE');
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Enum observation_visibility já existe.';
END $$;

-- ============================================================
-- 1. Inserir observação administrativa (transacional)
--    Insere em observations + occurrence_history + (opcional) notifications
-- ============================================================
CREATE OR REPLACE FUNCTION create_occurrence_observation(
  p_occurrence_id UUID,
  p_admin_id UUID,
  p_content TEXT,
  p_visibility VARCHAR
) RETURNS UUID AS $$
DECLARE
  v_observation_id UUID;
  v_admin_role VARCHAR;
  v_admin_active BOOLEAN;
  v_author_id UUID;
  v_action VARCHAR;
BEGIN
  -- 1. Validação do conteúdo
  IF p_content IS NULL OR trim(p_content) = '' THEN
    RAISE EXCEPTION 'BAD_REQUEST: O conteúdo da observação não pode ser vazio.';
  END IF;

  -- 2. Validação da visibilidade
  IF p_visibility NOT IN ('INTERNAL', 'CITIZEN_RESPONSE') THEN
    RAISE EXCEPTION 'BAD_REQUEST: Visibilidade inválida. Use INTERNAL ou CITIZEN_RESPONSE (RN044).';
  END IF;

  -- 3. Validar admin ativo
  SELECT role, is_active INTO v_admin_role, v_admin_active
    FROM user_roles WHERE user_id = p_admin_id;
  IF v_admin_role IS NULL OR v_admin_role != 'ADMIN' OR NOT COALESCE(v_admin_active, false) THEN
    RAISE EXCEPTION 'FORBIDDEN: Apenas administradores ativos podem registrar observações.';
  END IF;

  -- 4. Ocorrência existe?
  SELECT author_id INTO v_author_id FROM occurrences WHERE id = p_occurrence_id;
  IF v_author_id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: Ocorrência não encontrada.';
  END IF;

  -- 5. Inserir observação
  INSERT INTO observations (occurrence_id, admin_id, content, visibility)
    VALUES (p_occurrence_id, p_admin_id, p_content, p_visibility::observation_visibility)
    RETURNING id INTO v_observation_id;

  -- 6. Registrar no histórico (RN039, RN040, RN041)
  v_action := CASE
    WHEN p_visibility = 'INTERNAL' THEN 'OBSERVATION_INTERNAL_ADDED'
    ELSE 'OBSERVATION_CITIZEN_REPLY_ADDED'
  END;

  INSERT INTO occurrence_history (occurrence_id, actor_id, action, details)
    VALUES (
      p_occurrence_id,
      p_admin_id,
      v_action,
      jsonb_build_object(
        'observationId', v_observation_id,
        'visibility', p_visibility,
        -- Conteúdo só aparece no histórico público; para INTERNAL o conteúdo
        -- fica em observations e é filtrado na consulta.
        'content', CASE WHEN p_visibility = 'CITIZEN_RESPONSE' THEN p_content ELSE NULL END
      )
    );

  -- 7. Notificação quando for resposta ao cidadão (RN056, RN044)
  IF p_visibility = 'CITIZEN_RESPONSE' THEN
    INSERT INTO notifications (user_id, occurrence_id, title, message, type)
      VALUES (
        v_author_id,
        p_occurrence_id,
        'Nova resposta na sua ocorrência',
        'Administração respondeu à sua ocorrência.',
        'OBSERVATION_REPLY'
      );
  END IF;

  RETURN v_observation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;