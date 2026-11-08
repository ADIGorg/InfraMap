-- DB-04: registro central do domínio — ocorrências de infraestrutura urbana.
-- Cria `public.occurrences`. Depende de DB-01 (ENUMs + PostGIS), DB-02 (categories)
-- e DB-03 (ai_analyses).
--
-- Invariantes críticas aplicadas aqui (§6 do anexo 02):
--   I08  ai_analysis_id UNIQUE  → análise consumida por no máximo 1 ocorrência.
--   I09  descrição ≤ 500        → VARCHAR(500) + CHECK explícito.
--   I10  prioridade compatível  → CHECK priority vs status.
--   I11  location_original      → trigger de imutabilidade.
--
-- Índices (§7 do anexo 02) ficam em DB-08 (add_constraints_and_indexes.sql).
-- RLS e policies ficam em DB-09 (configure_rls_and_storage.sql).

CREATE TABLE public.occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    author_id UUID NOT NULL
        REFERENCES public.profiles(id),

    category_id UUID NOT NULL
        REFERENCES public.categories(id),

    ai_analysis_id UUID NOT NULL UNIQUE
        REFERENCES public.ai_analyses(id),

    description VARCHAR(500) NOT NULL,

    status public.occurrence_status NOT NULL DEFAULT 'RECEIVED',
    priority public.occurrence_priority,

    category_source public.field_source NOT NULL,
    description_source public.field_source NOT NULL,

    location_original extensions.geography(POINT, 4326) NOT NULL,
    location_adjusted extensions.geography(POINT, 4326),
    location_source public.location_source NOT NULL,
    location_accuracy_m NUMERIC(8,2),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,

    CONSTRAINT occurrences_description_length_check CHECK (
        char_length(description) <= 500
    ),

    CONSTRAINT occurrences_priority_status_check CHECK (
        priority IS NULL
        OR status IN ('CONFIRMED', 'IN_SERVICE', 'RESOLVED')
    )
);

COMMENT ON TABLE public.occurrences IS
    'Registro central do domínio. Localização exata nunca exposta em contexto público.';

COMMENT ON COLUMN public.occurrences.ai_analysis_id IS
    'Análise consumida por esta ocorrência. UNIQUE garante I08 (consumo no máximo 1x).';

COMMENT ON COLUMN public.occurrences.location_original IS
    'Coordenada informada pelo cidadão. IMUTÁVEL — protegida por trigger.';

COMMENT ON COLUMN public.occurrences.location_adjusted IS
    'Ajuste administrativo. Sobrepõe location_original para exibição via COALESCE.';

COMMENT ON COLUMN public.occurrences.priority IS
    'Só pode ser definida a partir de CONFIRMED. CHECK garante essa invariante.';

COMMENT ON COLUMN public.occurrences.category_source IS
    'Origem rastreável: AI_CONFIRMED | AI_EDITED | USER_MANUAL | ADMIN_CORRECTED.';

COMMENT ON COLUMN public.occurrences.description_source IS
    'Origem rastreável: AI_CONFIRMED | AI_EDITED | USER_MANUAL | ADMIN_CORRECTED.';

-- ==========================================
-- IMUTABILIDADE DE location_original (I11)
-- ==========================================
-- location_original nunca é sobrescrita. Apenas location_adjusted é atualizada
-- por ajuste administrativo (função adjust_occurrence_location em DB-10).

CREATE OR REPLACE FUNCTION public.prevent_location_original_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF NEW.location_original::text IS DISTINCT FROM OLD.location_original::text THEN
        RAISE EXCEPTION
            'location_original é imutável. Use location_adjusted para ajustes administrativos.'
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prevent_location_original_change() IS
    'Trigger de imutabilidade de occurrences.location_original (I11 do anexo 02).';

CREATE TRIGGER occurrences_prevent_location_original_change
BEFORE UPDATE ON public.occurrences
FOR EACH ROW
EXECUTE FUNCTION public.prevent_location_original_change();

-- ==========================================
-- ATUALIZAÇÃO AUTOMÁTICA DE updated_at
-- ==========================================
-- Reutiliza set_updated_at() da migration inicial de identidade.
-- Mantém consistência com a tabela profiles.

CREATE TRIGGER occurrences_set_updated_at
BEFORE UPDATE ON public.occurrences
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();