-- DB-04 fix: corrige a comparação em prevent_location_original_change().
-- O cast `geography::text` sob `SET search_path = ''` não diferenciava
-- coordenadas distintas de forma confiável, permitindo UPDATE em
-- location_original. Substituído por ST_AsEWKB (bytea, exato).
--
-- CREATE OR REPLACE preserva o OID da função; o trigger existente
-- `occurrences_prevent_location_original_change` continua referenciando-a
-- e passa a executar a versão corrigida automaticamente.

CREATE OR REPLACE FUNCTION public.prevent_location_original_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF extensions.ST_AsEWKB(NEW.location_original::extensions.geometry)
       IS DISTINCT FROM extensions.ST_AsEWKB(OLD.location_original::extensions.geometry) THEN
        RAISE EXCEPTION
            'location_original é imutável. Use location_adjusted para ajustes administrativos.'
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prevent_location_original_change() IS
    'Trigger de imutabilidade de occurrences.location_original (I11 do anexo 02). Compara via ST_AsEWKB.';