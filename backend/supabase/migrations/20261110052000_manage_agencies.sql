ALTER TABLE public.agencies
  ADD CONSTRAINT agencies_name_not_blank CHECK (name ~ '[^[:space:]]') NOT VALID,
  ADD CONSTRAINT agencies_email_format CHECK (email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$') NOT VALID;

GRANT INSERT (name, email, phone, description, is_active),
      UPDATE (name, email, phone, description, is_active)
ON public.agencies TO authenticated;

CREATE POLICY agencies_insert_master ON public.agencies
FOR INSERT TO authenticated WITH CHECK (public.is_admin_master());

CREATE POLICY agencies_update_master ON public.agencies
FOR UPDATE TO authenticated
USING (public.is_admin_master()) WITH CHECK (public.is_admin_master());

-- Serialize a new forwarding with updates to its agency's active flag.
CREATE FUNCTION public.require_active_forwarding_agency()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  PERFORM 1 FROM public.agencies
  WHERE id = NEW.agency_id AND is_active
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'O órgão do encaminhamento deve estar ativo.'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.require_active_forwarding_agency() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER forwardings_require_active_agency
BEFORE INSERT OR UPDATE OF agency_id ON public.forwardings
FOR EACH ROW EXECUTE FUNCTION public.require_active_forwarding_agency();
