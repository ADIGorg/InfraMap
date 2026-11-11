-- MOD-02: Prioridade, IN_SERVICE e RESOLVED
-- Dependências: MOD-01

-- Garante que o enum possui os status necessários
-- (ajuste o nome do tipo se o enum for outro)
DO $$ BEGIN
  ALTER TYPE occurrence_status ADD VALUE IF NOT EXISTS 'IN_SERVICE';
EXCEPTION WHEN undefined_object THEN
  RAISE NOTICE 'Enum occurrence_status não encontrado. Verifique a migration 20261106231820_create_domain_enums.sql';
END $$;

-- ==========================================================
-- 1. Definir prioridade (CONFIRMED → CONFIRMED)
-- ==========================================================
CREATE OR REPLACE FUNCTION set_occurrence_priority(
  p_occurrence_id UUID,
  p_admin_id UUID,
  p_priority VARCHAR
) RETURNS UUID AS $$
DECLARE
  v_current_status VARCHAR;
  v_admin_role VARCHAR;
  v_admin_active BOOLEAN;
  v_previous_priority VARCHAR;
BEGIN
  IF p_priority NOT IN ('LOW', 'MEDIUM', 'HIGH') THEN
    RAISE EXCEPTION 'BAD_REQUEST: Prioridade inválida. Use LOW, MEDIUM ou HIGH (RN034).';
  END IF;

  SELECT role, is_active INTO v_admin_role, v_admin_active FROM user_roles WHERE user_id = p_admin_id;
  IF v_admin_role IS NULL OR v_admin_role != 'ADMIN' OR NOT COALESCE(v_admin_active, false) THEN
    RAISE EXCEPTION 'FORBIDDEN: Apenas administradores ativos podem definir prioridade.';
  END IF;

  SELECT status, priority INTO v_current_status, v_previous_priority
    FROM occurrences WHERE id = p_occurrence_id FOR UPDATE;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: Ocorrência não encontrada.';
  END IF;
  IF v_current_status != 'CONFIRMED' THEN
    RAISE EXCEPTION 'CONFLICT: Somente ocorrências CONFIRMED podem receber prioridade. Status atual: %.', v_current_status;
  END IF;

  UPDATE occurrences SET priority = p_priority, updated_at = NOW() WHERE id = p_occurrence_id;

  INSERT INTO occurrence_history (occurrence_id, actor_id, action, previous_data, new_data)
    VALUES (
      p_occurrence_id, p_admin_id, 'PRIORITY_SET',
      CASE WHEN v_previous_priority IS NOT NULL THEN jsonb_build_object('priority', v_previous_priority) ELSE NULL END,
      jsonb_build_object('priority', p_priority)
    );

  RETURN p_occurrence_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================================
-- 2. Iniciar atendimento (CONFIRMED → IN_SERVICE)
-- ==========================================================
CREATE OR REPLACE FUNCTION start_occurrence_service(
  p_occurrence_id UUID,
  p_admin_id UUID,
  p_action_notes TEXT
) RETURNS UUID AS $$
DECLARE
  v_current_status VARCHAR;
  v_priority VARCHAR;
  v_author_id UUID;
  v_admin_role VARCHAR;
  v_admin_active BOOLEAN;
BEGIN
  IF p_action_notes IS NULL OR trim(p_action_notes) = '' THEN
    RAISE EXCEPTION 'BAD_REQUEST: É obrigatório registrar a ação concreta que caracteriza o início do atendimento (RN061).';
  END IF;

  SELECT role, is_active INTO v_admin_role, v_admin_active FROM user_roles WHERE user_id = p_admin_id;
  IF v_admin_role IS NULL OR v_admin_role != 'ADMIN' OR NOT COALESCE(v_admin_active, false) THEN
    RAISE EXCEPTION 'FORBIDDEN: Apenas administradores ativos podem iniciar atendimento.';
  END IF;

  SELECT status, priority, author_id INTO v_current_status, v_priority, v_author_id
    FROM occurrences WHERE id = p_occurrence_id FOR UPDATE;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: Ocorrência não encontrada.';
  END IF;
  IF v_current_status != 'CONFIRMED' THEN
    RAISE EXCEPTION 'CONFLICT: Somente ocorrências CONFIRMED podem ir para IN_SERVICE. Status atual: %.', v_current_status;
  END IF;
  IF v_priority IS NULL THEN
    RAISE EXCEPTION 'CONFLICT: É obrigatório definir a prioridade antes de iniciar o atendimento (RN061).';
  END IF;

  UPDATE occurrences SET status = 'IN_SERVICE', updated_at = NOW() WHERE id = p_occurrence_id;

  INSERT INTO occurrence_history (occurrence_id, actor_id, action, previous_data, new_data, details)
    VALUES (
      p_occurrence_id, p_admin_id, 'SERVICE_STARTED',
      jsonb_build_object('status', v_current_status),
      jsonb_build_object('status', 'IN_SERVICE'),
      jsonb_build_object('actionNotes', p_action_notes)
    );

  INSERT INTO notifications (user_id, occurrence_id, title, message, type)
    VALUES (v_author_id, p_occurrence_id, 'Atualização no status da sua ocorrência',
            'Sua ocorrência entrou em atendimento.', 'STATUS_CHANGE');

  RETURN p_occurrence_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================================
-- 3. Resolver (IN_SERVICE → RESOLVED)
-- ==========================================================
CREATE OR REPLACE FUNCTION resolve_occurrence(
  p_occurrence_id UUID,
  p_admin_id UUID,
  p_resolution_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_current_status VARCHAR;
  v_author_id UUID;
  v_admin_role VARCHAR;
  v_admin_active BOOLEAN;
  v_details JSONB;
BEGIN
  SELECT role, is_active INTO v_admin_role, v_admin_active FROM user_roles WHERE user_id = p_admin_id;
  IF v_admin_role IS NULL OR v_admin_role != 'ADMIN' OR NOT COALESCE(v_admin_active, false) THEN
    RAISE EXCEPTION 'FORBIDDEN: Apenas administradores ativos podem resolver ocorrências.';
  END IF;

  SELECT status, author_id INTO v_current_status, v_author_id
    FROM occurrences WHERE id = p_occurrence_id FOR UPDATE;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: Ocorrência não encontrada.';
  END IF;
  IF v_current_status != 'IN_SERVICE' THEN
    RAISE EXCEPTION 'CONFLICT: Somente ocorrências IN_SERVICE podem ser RESOLVED. Status atual: %.', v_current_status;
  END IF;

  UPDATE occurrences
     SET status = 'RESOLVED', updated_at = NOW(), resolved_at = NOW()
   WHERE id = p_occurrence_id;

  v_details := CASE
    WHEN p_resolution_notes IS NOT NULL AND trim(p_resolution_notes) != ''
      THEN jsonb_build_object('resolutionNotes', p_resolution_notes)
    ELSE NULL
  END;

  INSERT INTO occurrence_history (occurrence_id, actor_id, action, previous_data, new_data, details)
    VALUES (
      p_occurrence_id, p_admin_id, 'OCCURRENCE_RESOLVED',
      jsonb_build_object('status', v_current_status),
      jsonb_build_object('status', 'RESOLVED'),
      v_details
    );

  INSERT INTO notifications (user_id, occurrence_id, title, message, type)
    VALUES (v_author_id, p_occurrence_id, 'Ocorrência resolvida',
            'Sua ocorrência foi resolvida.', 'STATUS_CHANGE');

  RETURN p_occurrence_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;