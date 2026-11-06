-- DB-01: cria os ENUMs compartilhados pelo domínio do InfraMap.
-- app_role e admin_level pertencem à migration inicial de identidade e
-- não devem ser recriados ou modificados aqui.

CREATE TYPE public.occurrence_status AS ENUM (
    'RECEIVED',
    'UNDER_ANALYSIS',
    'CONFIRMED',
    'IN_SERVICE',
    'RESOLVED',
    'REJECTED'
);

CREATE TYPE public.occurrence_priority AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH'
);

CREATE TYPE public.field_source AS ENUM (
    'AI_CONFIRMED',
    'AI_EDITED',
    'USER_MANUAL',
    'ADMIN_CORRECTED'
);

CREATE TYPE public.ai_analysis_status AS ENUM (
    'UPLOADING',
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
    'CONSUMED'
);

CREATE TYPE public.observation_visibility AS ENUM (
    'INTERNAL',
    'CITIZEN_RESPONSE'
);

CREATE TYPE public.location_source AS ENUM (
    'GPS',
    'MANUAL'
);

CREATE TYPE public.history_actor_type AS ENUM (
    'USER',
    'SYSTEM'
);

CREATE TYPE public.notification_type AS ENUM (
    'OCCURRENCE_STATUS_CHANGED',
    'CITIZEN_RESPONSE'
);

-- Embora relacionados ao recurso P1 de encaminhamentos, estes dois ENUMs
-- foram explicitamente incluídos no escopo do ticket DB-01.
CREATE TYPE public.forwarding_channel AS ENUM (
    'EMAIL'
);

CREATE TYPE public.forwarding_status AS ENUM (
    'PENDING',
    'SENT',
    'FAILED'
);