
-- ==========================================
-- 1. ENUM DE PAPÉIS
-- ==========================================

CREATE TYPE public.app_role AS ENUM (
    'CITIZEN',
    'ADMIN'
);

CREATE TYPE public.admin_level AS ENUM (
    'MASTER',
    'OPERATIONAL'
);

-- ==========================================
-- 2. TABELA DE PERFIS
-- ==========================================

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY
        REFERENCES auth.users(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    phone TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 3. TABELA DE PAPÉIS E SITUAÇÃO DA CONTA
-- ==========================================

CREATE TABLE public.user_roles (
    user_id UUID PRIMARY KEY
        REFERENCES auth.users(id) ON DELETE CASCADE,

    role public.app_role NOT NULL DEFAULT 'CITIZEN',

    admin_level public.admin_level,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_by UUID
        REFERENCES public.profiles(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT user_roles_role_level_check CHECK (
        (role = 'CITIZEN' AND admin_level IS NULL)
        OR
        (role = 'ADMIN' AND admin_level IS NOT NULL)
    )
);

-- ==========================================
-- 4. ATUALIZAÇÃO AUTOMÁTICA DE updated_at
-- ==========================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ==========================================
-- 5. CRIAÇÃO AUTOMÁTICA DO PERFIL E PAPEL
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    profile_name TEXT;
    profile_phone TEXT;
BEGIN
    profile_name :=
        NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'name', '')), '');

    profile_phone :=
        NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'phone', '')), '');

    IF profile_name IS NULL THEN
        RAISE EXCEPTION 'O nome do usuário é obrigatório.';
    END IF;

    INSERT INTO public.profiles (
        id,
        name,
        phone
    )
    VALUES (
        NEW.id,
        profile_name,
        profile_phone
    );

    -- Todo cadastro público começa como cidadão.
    -- Nunca utilizar um role recebido do cliente.
    INSERT INTO public.user_roles (
        user_id,
        role,
        is_active
    )
    VALUES (
        NEW.id,
        'CITIZEN',
        TRUE
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 6. HABILITAR RLS
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 7. PRIVILÉGIOS
-- ==========================================

REVOKE ALL ON TABLE public.profiles
FROM anon, authenticated;

REVOKE ALL ON TABLE public.user_roles
FROM anon, authenticated;

-- O usuário autenticado consulta seu próprio perfil.
GRANT SELECT ON TABLE public.profiles TO authenticated;

-- Só pode alterar os dados cadastrais permitidos.
GRANT UPDATE (name, phone)
ON TABLE public.profiles
TO authenticated;

-- Pode consultar seu próprio papel e situação.
-- Não recebe INSERT, UPDATE ou DELETE.
GRANT SELECT ON TABLE public.user_roles TO authenticated;

-- Acesso administrativo fica restrito ao backend confiável.
GRANT ALL ON TABLE public.profiles, public.user_roles
TO service_role;

-- ==========================================
-- 8. POLÍTICAS RLS - PROFILES
-- ==========================================

CREATE POLICY profiles_select_own
ON public.profiles
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = id);

CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = id)
WITH CHECK ((SELECT auth.uid()) = id);

-- ==========================================
-- 9. POLÍTICAS RLS - USER_ROLES
-- ==========================================

CREATE POLICY user_roles_select_own
ON public.user_roles
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Não criar políticas de INSERT, UPDATE ou DELETE
-- para authenticated em user_roles.
-- ==========================================
-- 10. RESTRIÇÃO DE EXECUÇÃO DAS FUNÇÕES
-- ==========================================

REVOKE EXECUTE ON FUNCTION public.handle_new_user()
FROM PUBLIC, anon, authenticated;