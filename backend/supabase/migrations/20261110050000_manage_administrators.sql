CREATE FUNCTION public.list_administrators()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin_master() THEN
    RAISE EXCEPTION 'Apenas Master ativo.' USING ERRCODE = '42501';
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object('id', r.user_id, 'name', p.name,
      'admin_level', r.admin_level, 'is_active', r.is_active, 'created_by', r.created_by)
      ORDER BY p.name, r.user_id)
    FROM public.user_roles r JOIN public.profiles p ON p.id = r.user_id
    WHERE r.role = 'ADMIN'
  ), '[]'::jsonb);
END;
$$;

CREATE FUNCTION public.update_administrator(p_id uuid, p_level public.admin_level, p_active boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  target public.user_roles;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(6111005);
  IF NOT public.is_admin_master() THEN
    RAISE EXCEPTION 'Apenas Master ativo.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO target FROM public.user_roles WHERE user_id = p_id AND role = 'ADMIN' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Administrador não encontrado.' USING ERRCODE = 'P0002';
  END IF;

  IF target.admin_level = 'MASTER' AND target.is_active
    AND (COALESCE(p_level, target.admin_level) <> 'MASTER' OR NOT COALESCE(p_active, target.is_active))
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE role = 'ADMIN' AND admin_level = 'MASTER' AND is_active AND user_id <> p_id
    )
  THEN
    RAISE EXCEPTION 'O último Master ativo deve ser preservado.' USING ERRCODE = '23514';
  END IF;

  UPDATE public.user_roles SET admin_level = COALESCE(p_level, target.admin_level),
    is_active = COALESCE(p_active, target.is_active)
  WHERE user_id = p_id RETURNING * INTO target;

  RETURN jsonb_build_object('id', target.user_id, 'admin_level', target.admin_level,
    'is_active', target.is_active, 'created_by', target.created_by);
END;
$$;

-- App metadata is writable only through trusted Auth administration.
-- The existing signup trigger creates the profile and CITIZEN role first.
CREATE FUNCTION public.provision_administrator()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  provision jsonb := NEW.raw_app_meta_data -> 'inframap_admin_provision';
  creator uuid := (provision ->> 'created_by')::uuid;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(6111005);
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = creator AND role = 'ADMIN' AND admin_level = 'MASTER' AND is_active
  ) THEN
    RAISE EXCEPTION 'Apenas Master ativo.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.user_roles SET role = 'ADMIN',
    admin_level = (provision ->> 'admin_level')::public.admin_level, created_by = creator
  WHERE user_id = NEW.id AND role = 'CITIZEN';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil inicial não encontrado.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER zz_provision_administrator AFTER INSERT ON auth.users
FOR EACH ROW WHEN (NEW.raw_app_meta_data ? 'inframap_admin_provision')
EXECUTE FUNCTION public.provision_administrator();

REVOKE ALL ON FUNCTION public.provision_administrator() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_administrators(), public.update_administrator(uuid, public.admin_level, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_administrators(), public.update_administrator(uuid, public.admin_level, boolean) TO authenticated;
