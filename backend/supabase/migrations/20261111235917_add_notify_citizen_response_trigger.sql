-- RN044, RN056: notificação automática ao cidadão quando admin responde
-- Complementa create_observation (função NÃO insere em notifications — trigger faz)
-- Substitui 20261109235900 (nunca aplicada)
-- Correção: SET search_path = ''

CREATE OR REPLACE FUNCTION public.notify_citizen_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, occurrence_id, title, message, type)
  SELECT author_id, id, 'Resposta à sua ocorrência', NEW.content, 'CITIZEN_RESPONSE'
  FROM public.occurrences
  WHERE id = NEW.occurrence_id;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_citizen_response()
  IS 'RN044/RN056. Trigger AFTER INSERT em observations (visibility=CITIZEN_RESPONSE) cria notification para o autor.';

REVOKE EXECUTE ON FUNCTION public.notify_citizen_response() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notify_citizen_response ON public.observations;

CREATE TRIGGER notify_citizen_response
AFTER INSERT ON public.observations
FOR EACH ROW
WHEN (NEW.visibility = 'CITIZEN_RESPONSE')
EXECUTE FUNCTION public.notify_citizen_response();
