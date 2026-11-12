-- Seed local — aplicado em `supabase db reset`.
-- NÃO afeta remoto. Categorias já são seedadas pela migration
-- 20261106234833_create_categories.sql, mas usamos ON CONFLICT
-- para garantir idempotência caso o reset rode múltiplas vezes.

INSERT INTO public.categories (code, name, description) VALUES
    ('CAT01', 'Saneamento e Drenagem', 'Esgoto, abastecimento de água, vazamentos, alagamentos, bueiros.'),
    ('CAT02', 'Iluminação Pública', 'Postes apagados, lâmpadas queimadas, fiação exposta.'),
    ('CAT03', 'Pavimentação e Vias', 'Buracos, ruas sem asfalto, vias danificadas.'),
    ('CAT04', 'Resíduos e Limpeza Urbana', 'Lixo acumulado, entulho, descarte irregular.'),
    ('CAT05', 'Mobilidade e Sinalização', 'Semáforos, placas, faixas apagadas.'),
    ('CAT06', 'Calçadas e Acessibilidade', 'Calçadas danificadas, rampas inexistentes.'),
    ('CAT07', 'Outros Problemas de Infraestrutura', 'Problemas fora das categorias anteriores.')
ON CONFLICT (code) DO NOTHING;
