CREATE FUNCTION public.notify_citizen_response()
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

REVOKE EXECUTE ON FUNCTION public.notify_citizen_response() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER notify_citizen_response
AFTER INSERT ON public.observations
FOR EACH ROW
WHEN (NEW.visibility = 'CITIZEN_RESPONSE')
EXECUTE FUNCTION public.notify_citizen_response();
