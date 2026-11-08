-- DB-03: rascunhos e resultados de análises multimodais.
-- Cria a tabela `public.ai_analyses`. Depende de DB-01 (ENUMs) e DB-02 (categories).
--
-- A garantia "análise consumida por no máximo uma ocorrência" (I08 do anexo 02)
-- será aplicada em DB-04, via constraint UNIQUE em `public.occurrences.ai_analysis_id`.
-- RLS e policies ficam para DB-09 (configure_rls_and_storage.sql).

CREATE TABLE public.ai_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES public.profiles(id),

    suggested_category_id UUID
        REFERENCES public.categories(id),

    suggested_description VARCHAR(500),
    confidence NUMERIC(5,4),
    model_name VARCHAR(100),
    prompt_version VARCHAR(30),

    input_photo_paths JSONB NOT NULL DEFAULT '[]',

    status public.ai_analysis_status NOT NULL,
    error_code VARCHAR(100),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    consumed_at TIMESTAMPTZ,

    CONSTRAINT ai_analyses_confidence_range_check CHECK (
        confidence IS NULL OR (confidence BETWEEN 0 AND 1)
    ),

    CONSTRAINT ai_analyses_input_photo_paths_count_check CHECK (
        jsonb_array_length(input_photo_paths) BETWEEN 1 AND 3
    )
);

COMMENT ON TABLE public.ai_analyses IS
    'Rascunhos e resultados de análises multimodais. Cada análise pode originar no máximo uma ocorrência (garantia aplicada em DB-04).';

COMMENT ON COLUMN public.ai_analyses.input_photo_paths IS
    'Caminhos no bucket temporário. 1 a 3 entradas.';

COMMENT ON COLUMN public.ai_analyses.error_code IS
    'Código curto do erro do provedor de IA. Nunca armazena tokens, chaves ou segredos.';

COMMENT ON COLUMN public.ai_analyses.status IS
    'Ciclo: UPLOADING → PENDING → PROCESSING → COMPLETED → CONSUMED; desvios FAILED / CANCELLED.';

COMMENT ON COLUMN public.ai_analyses.consumed_at IS
    'Preenchido quando a análise é consumida por uma ocorrência (DB-04, via finalize_occurrence).';