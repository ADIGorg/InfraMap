-- Migration: Transição de status por administrador (MOD-01)
-- Garante atomicidade: update de status + histórico + notificação na mesma transação.

CREATE OR REPLACE FUNCTION transition_occurrence_status(
  IN p_occurrence_id UUID,
  p_admin_id UUID,
  p_new_status VARCHAR,
  p_justification TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_current_status VARCHAR;
  v_author_id UUID;
  v_admin_active BOOLEAN;
  v_admin_role VARCHAR;
  v_action VARCHAR;
  v_previous_data JSONB;
  v_new_data JSONB;
  v_details JSONB;
  v_message TEXT;
BEGIN
  -- 1. Validar se o usuário é ADMIN ativo (Defesa em profundidade)
  SELECT role, is_active
    INTO v_admin_role, v_admin_active
    FROM user_roles
   WHERE user_id = p_admin_id;

  IF v_admin_role IS NULL OR v_admin_role != 'ADMIN' OR NOT COALESCE(v_admin_active, false) THEN
    RAISE EXCEPTION 'FORBIDDEN: Apenas administradores ativos podem executar transições.';
  END IF;

  -- 2. Lock pessimista da ocorrência
  SELECT status, author_id
    INTO v_current_status, v_author_id
    FROM occurrences
   WHERE id = p_occurrence_id
     FOR UPDATE;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: Ocorrência não encontrada.';
  END IF;

  -- 3. Validar transições permitidas (RN030) + justificativa (RN037)
  IF p_new_status = 'UNDER_ANALYSIS' THEN
    IF v_current_status != 'RECEIVED' THEN
      RAISE EXCEPTION 'CONFLICT: Somente ocorrências RECEIVED podem ir para UNDER_ANALYSIS. Status atual: %.', v_current_status;
    END IF;
    v_action := 'ANALYSIS_STARTED';
    v_message := 'Sua ocorrência entrou em análise.';

  ELSIF p_new_status = 'CONFIRMED' THEN
    IF v_current_status != 'UNDER_ANALYSIS' THEN
      RAISE EXCEPTION 'CONFLICT: Somente ocorrências UNDER_ANALYSIS podem ser CONFIRMED. Status atual: %.', v_current_status;
    END IF;
    v_action := 'OCCURRENCE_CONFIRMED';
    v_message := 'Sua ocorrência foi confirmada.';

  ELSIF p_new_status = 'REJECTED' THEN
    IF v_current_status != 'UNDER_ANALYSIS' THEN
      RAISE EXCEPTION 'CONFLICT: Somente ocorrências UNDER_ANALYSIS podem ser REJECTED. Status atual: %.', v_current_status;
    END IF;
    IF p_justification IS NULL OR trim(p_justification) = '' THEN
      RAISE EXCEPTION 'BAD_REQUEST: Rejeição exige justificativa (RN037).';
    END IF;
    v_action := 'OCCURRENCE_REJECTED';
    v_message := 'Sua ocorrência foi rejeitada. Motivo: ' || p_justification;

  ELSE
    RAISE EXCEPTION 'BAD_REQUEST: Status de destino não suportado nesta operação: %.', p_new_status;
  END IF;

  -- 4. Atualizar status da ocorrência
  UPDATE occurrences
     SET status = p_new_status,
         updated_at = NOW()
   WHERE id = p_occurrence_id;

  -- 5. Registrar no histórico (RN039, RN040, RN041)
  v_previous_data := jsonb_build_object('status', v_current_status);
  v_new_data := jsonb_build_object('status', p_new_status);
  v_details := CASE
    WHEN p_justification IS NOT NULL THEN jsonb_build_object('justification', p_justification)
    ELSE NULL
  END;

  INSERT INTO occurrence_history (
    occurrence_id, actor_id, action, previous_data, new_data, details
  ) VALUES (
    p_occurrence_id, p_admin_id, v_action, v_previous_data, v_new_data, v_details
  );

  -- 6. Notificar o cidadão autor (RN056)
  INSERT INTO notifications (
    user_id, occurrence_id, title, message, type
  ) VALUES (
    v_author_id, p_occurrence_id, 'Atualização no status da sua ocorrência', v_message, 'STATUS_CHANGE'
  );

  RETURN p_occurrence_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;