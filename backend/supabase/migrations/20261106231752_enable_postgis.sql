-- DB-01: habilita recursos geoespaciais utilizados pelo InfraMap.
-- A extensão fica no schema extensions, conforme a especificação do banco.

CREATE EXTENSION IF NOT EXISTS postgis SCHEMA extensions;