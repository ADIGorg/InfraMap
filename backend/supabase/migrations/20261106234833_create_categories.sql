-- DB-02: catálogo controlado de categorias de infraestrutura urbana.
-- Cria a tabela `public.categories` e carrega as sete categorias oficiais
-- (CAT01..CAT07) de forma idempotente.
--
-- RLS e políticas de acesso para esta tabela são tratadas em DB-09
-- (configure_rls_and_storage.sql), conforme anexo 02, seção 8.
-- Endpoint de listagem (GET /categories) pertence a ticket de módulo.

-- ==========================================
-- 1. TABELA DE CATEGORIAS
-- ==========================================

CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    code VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT categories_code_unique UNIQUE (code)
);

COMMENT ON TABLE public.categories IS
    'Catálogo controlado de categorias de infraestrutura urbana (CAT01..CAT07).';

COMMENT ON COLUMN public.categories.code IS
    'Código estável e único (CAT01..CAT07); referência canônica usada pela IA e pelos clientes.';

COMMENT ON COLUMN public.categories.is_active IS
    'Categorias inativas não aceitam novos registros, mas preservam histórico de ocorrências.';

-- ==========================================
-- 2. SEED IDEMPOTENTE (CAT01..CAT07)
-- ==========================================
-- ON CONFLICT DO NOTHING garante que reexecuções não dupliquem dados,
-- atendendo ao critério de idempotência do ticket DB-02.

INSERT INTO public.categories (code, name) VALUES
    ('CAT01', 'Saneamento e Drenagem'),
    ('CAT02', 'Iluminação Pública'),
    ('CAT03', 'Pavimentação e Vias'),
    ('CAT04', 'Resíduos e Limpeza Urbana'),
    ('CAT05', 'Mobilidade e Sinalização'),
    ('CAT06', 'Calçadas e Acessibilidade'),
    ('CAT07', 'Outros Problemas de Infraestrutura')
ON CONFLICT (code) DO NOTHING;