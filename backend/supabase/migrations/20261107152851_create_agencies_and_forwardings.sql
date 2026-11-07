-- DB-11: órgãos responsáveis + encaminhamentos (P1).
-- Depende de DB-01 (ENUMs forwarding_*), DB-04 (occurrences), DB-09 (is_admin helper).
--
-- Escopo:
--   - Tabelas public.agencies e public.forwardings.
--   - Trigger updated_at em agencies (reusa set_updated_at da migration inicial).
--   - RLS mínima: admin SELECT em ambas; admin INSERT em forwardings.
--
-- Fora do escopo:
--   - Fluxo de envio (PENDING → SENT/FAILED) — aplicação, não trigger.
--   - UPDATE de status via service_role após envio (bypassa RLS por design).
--   - Módulo `forwardings` da API (P1, ticket futuro).

-- ==========================================
-- 1. agencies
-- ==========================================

CREATE TABLE public.agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NULL,
    description TEXT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.agencies IS
    'Órgãos responsáveis por atender ocorrências (P1). Desativação não apaga histórico.';

COMMENT ON COLUMN public.agencies.email IS
    'E-mail de contato do órgão. Não é o snapshot usado em forwardings — esse fica em forwardings.recipient_email.';

CREATE TRIGGER agencies_set_updated_at
BEFORE UPDATE ON public.agencies
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ==========================================
-- 2. forwardings
-- ==========================================

CREATE TABLE public.forwardings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    occurrence_id UUID NOT NULL REFERENCES public.occurrences(id),
    agency_id UUID NOT NULL REFERENCES public.agencies(id),
    admin_id UUID NOT NULL REFERENCES public.profiles(id),

    recipient_email VARCHAR(150) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    observations TEXT NULL,

    channel public.forwarding_channel NOT NULL DEFAULT 'EMAIL',
    status  public.forwarding_status  NOT NULL DEFAULT 'PENDING',

    provider_message_id VARCHAR(150) NULL,
    error_code VARCHAR(100) NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at    TIMESTAMPTZ NULL
);

COMMENT ON TABLE public.forwardings IS
    'Registro de encaminhamentos a órgãos (P1). Status da ocorrência NÃO muda por falha de envio.';

COMMENT ON COLUMN public.forwardings.recipient_email IS
    'Snapshot do e-mail usado no envio. Preservado mesmo se agencies.email mudar depois.';

COMMENT ON COLUMN public.forwardings.status IS
    'Ciclo: PENDING (antes do envio) → SENT (sucesso) | FAILED (falha). Atualizado pelo backend via service_role.';

-- ==========================================
-- 3. RLS — agencies
-- ==========================================

ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.agencies FROM anon, authenticated;
GRANT SELECT ON TABLE public.agencies TO authenticated;

CREATE POLICY agencies_select_admin
ON public.agencies FOR SELECT TO authenticated
USING (public.is_admin());

-- INSERT/UPDATE/DELETE via service_role (backend com chave secreta).
-- Master gerencia órgãos via /admin/agencies — operação administrativa de manutenção.

-- ==========================================
-- 4. RLS — forwardings
-- ==========================================

ALTER TABLE public.forwardings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.forwardings FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.forwardings TO authenticated;

CREATE POLICY forwardings_select_admin
ON public.forwardings FOR SELECT TO authenticated
USING (public.is_admin());

CREATE POLICY forwardings_insert_admin
ON public.forwardings FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin()
  AND admin_id = (SELECT auth.uid())
);

-- UPDATE de status (PENDING → SENT/FAILED) via service_role após envio.
-- Sem policy de UPDATE para authenticated — o cliente não pode forjar status.