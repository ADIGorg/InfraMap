-- DB-05: metadados de fotos + bucket privado occurrence-photos.
-- Depende de DB-04 (occurrences).
--
-- Cria:
--   1. Tabela public.occurrence_photos (metadados das fotos).
--   2. Bucket privado occurrence-photos no Supabase Storage.
--
-- Escopo DB-05:
--   - Estrutura da tabela + integridade (FK, UNIQUE, CHECK).
--   - Propriedade `public = false` do bucket (leitura direta bloqueada).
--   - Limite de 5 MB e MIME JPEG/PNG no bucket.
--
-- Fora do escopo desta migration:
--   - RLS / policies de storage.objects → DB-09.
--   - Validação "≥ 1 foto por ocorrência" (I12 mínimo) → finalize_occurrence (DB-10).
--     O máximo (≤ 3) já é garantido aqui por UNIQUE + CHECK.
--   - Transferência de temporary/ para occurrences/ → camada de aplicação.

-- ==========================================
-- 1. TABELA DE METADADOS
-- ==========================================

CREATE TABLE public.occurrence_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    occurrence_id UUID NOT NULL
        REFERENCES public.occurrences(id) ON DELETE CASCADE,

    storage_path TEXT NOT NULL,

    mime_type VARCHAR(50) NOT NULL,
    size_bytes BIGINT NOT NULL,
    position SMALLINT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- storage_path é único globalmente no bucket.
    CONSTRAINT occurrence_photos_storage_path_unique
        UNIQUE (storage_path),

    -- Cada posição (1, 2, 3) só pode ocorrer uma vez por ocorrência.
    CONSTRAINT occurrence_photos_occurrence_position_unique
        UNIQUE (occurrence_id, position),

    -- Apenas JPEG e PNG (anexo 02 §4.6).
    CONSTRAINT occurrence_photos_mime_type_check CHECK (
        mime_type IN ('image/jpeg', 'image/png')
    ),

    -- Até 5 MB por arquivo (anexo 02 §4.6, D09).
    CONSTRAINT occurrence_photos_size_check CHECK (
        size_bytes > 0 AND size_bytes <= 5 * 1024 * 1024
    ),

    -- 1 a 3 fotos por ocorrência (I12 máximo).
    CONSTRAINT occurrence_photos_position_check CHECK (
        position BETWEEN 1 AND 3
    )
);

COMMENT ON TABLE public.occurrence_photos IS
    'Metadados das fotos originais no bucket occurrence-photos. 1 a 3 por ocorrência.';

COMMENT ON COLUMN public.occurrence_photos.storage_path IS
    'Caminho no bucket: occurrences/{occurrence_id}/photo-{position}.{ext}. UNIQUE garante unicidade global.';

COMMENT ON COLUMN public.occurrence_photos.position IS
    '1..3. UNIQUE(occurrence_id, position) garante unicidade por ocorrência.';

-- ==========================================
-- 2. BUCKET PRIVADO
-- ==========================================
-- Criado via INSERT em storage.buckets (forma canônica em migração SQL).
-- ON CONFLICT DO NOTHING garante idempotência em ambientes resetados
-- (supabase db reset) sem quebrar caso o bucket já exista.
--
-- Convenção de caminhos (não imposta por CHECK, apenas documentada):
--   Temporary:  temporary/{user_id}/{analysis_id}/photo-{n}.{ext}
--   Definitivo: occurrences/{occurrence_id}/photo-{position}.{ext}
--
--   A transferência temporary → definitivo é feita pela aplicação
--   quando finalize_occurrence cria a linha em occurrence_photos.
--
-- public = false  → leitura pública direta bloqueada (URLs não assinadas falham).
-- file_size_limit = 5 * 1024 * 1024 bytes (5 MB).
-- allowed_mime_types = JPEG + PNG apenas.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'occurrence-photos',
    'occurrence-photos',
    false,
    5 * 1024 * 1024,
    ARRAY['image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;