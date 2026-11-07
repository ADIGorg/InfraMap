-- DB-04 fix #2: garante que o trigger de imutabilidade de location_original
-- dispare mesmo quando session_replication_role = 'replica'.
--
-- Triggers no modo padrão (ENABLE) NÃO disparam em replica mode — apenas
-- CHECK/UNIQUE/NOT NULL são mantidos. Como I11 (location_original imutável)
-- é uma invariante de negócio, o trigger deve disparar sempre.
--
-- Idempotente: ENABLE ALWAYS sobre trigger já-ENABLE só promove o estado.

ALTER TABLE public.occurrences
  ENABLE ALWAYS TRIGGER occurrences_prevent_location_original_change;

COMMENT ON TRIGGER occurrences_prevent_location_original_change
  ON public.occurrences IS
  'Imutabilidade de location_original (I11). ENABLE ALWAYS garante disparo mesmo em replica mode.';