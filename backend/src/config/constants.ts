// src/config/constants.ts

// ============================================================
// API
// ============================================================
export const API_PREFIX = "/api/v1" as const;
export const API_DOCS_PREFIX = "/api/docs" as const;
export const API_VERSION = "1.0.0" as const;
export const JSON_BODY_LIMIT = "100kb" as const;

// ============================================================
// Paginação
// ============================================================
export const DEFAULT_PAGE_SIZE = 20 as const;
export const MAX_PAGE_SIZE = 100 as const;

// ============================================================
// Ocorrências — limites (espelham CHECKs do DB)
// ============================================================
export const OCCURRENCE_DESCRIPTION_MAX_LENGTH = 500 as const;
export const OCCURRENCE_PHOTOS_MIN = 1 as const;
export const OCCURRENCE_PHOTOS_MAX = 3 as const;

// ============================================================
// Enums de domínio — espelham os ENUMs do banco
// ============================================================
export const OCCURRENCE_STATUSES = [
  "RECEIVED",
  "UNDER_ANALYSIS",
  "CONFIRMED",
  "IN_SERVICE",
  "RESOLVED",
  "REJECTED",
] as const;
export type OccurrenceStatus = (typeof OCCURRENCE_STATUSES)[number];

export const OCCURRENCE_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type OccurrencePriority = (typeof OCCURRENCE_PRIORITIES)[number];

export const DATA_SOURCES = [
  "AI_CONFIRMED",
  "AI_EDITED",
  "USER_MANUAL",
] as const;
export type DataSource = (typeof DATA_SOURCES)[number];

export const LOCATION_SOURCES = ["GPS", "MANUAL"] as const;
export type LocationSource = (typeof LOCATION_SOURCES)[number];

export const OBSERVATION_VISIBILITIES = [
  "INTERNAL",
  "CITIZEN_RESPONSE",
] as const;
export type ObservationVisibility = (typeof OBSERVATION_VISIBILITIES)[number];

// ============================================================
// Fotos — storage, tamanho, MIME
// ============================================================
export const STORAGE_BUCKET_NAME = "occurrence-photos" as const;
export const MAX_PHOTO_SIZE_BYTES = 5_242_880 as const;
export const PHOTO_URL_EXPIRATION_SECONDS = 300 as const;

/**
 * MIME types aceitos para evidência fotográfica.
 *
 * ⚠️ Deve casar com 4 fontes:
 *   1. Bucket `occurrence-photos` (storage.buckets.allowed_mime_types)
 *   2. CHECK `occurrence_photos_mime_type_check` (public.occurrence_photos)
 *   3. Zod `photoSchema` (src/modules/occurrences/presentation/occurrence.schema.ts)
 *   4. `create-ai-analysis.detectMime` (magic bytes)
 *
 * Estado atual no banco: ['image/jpeg', 'image/png']
 *
 * Nota: `image/jpg` NÃO é MIME válido — o MIME correto para .jpg é `image/jpeg`.
 * A versão anterior desta constante e o Zod schema tinham `image/jpg` (bug).
 */
export const OCCURRENCE_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
] as const;
export type OccurrencePhotoMime = (typeof OCCURRENCE_PHOTO_MIME_TYPES)[number];

export const OCCURRENCE_PHOTO_EXTENSION_BY_MIME: Record<
  OccurrencePhotoMime,
  string
> = {
  "image/jpeg": "jpg",
  "image/png": "png",
};

// ============================================================
// Categorias — códigos canônicos (RN008)
// ============================================================
export const OCCURRENCE_CATEGORY_CODES = [
  "CAT01", "CAT02", "CAT03", "CAT04",
  "CAT05", "CAT06", "CAT07",
] as const;
export type OccurrenceCategoryCode = (typeof OCCURRENCE_CATEGORY_CODES)[number];

export const FALLBACK_CATEGORY_CODE: OccurrenceCategoryCode = "CAT07";

// ============================================================
// IA — provider HTTP
// ============================================================
/** Timeout do provider HTTP (20s) — suficiente para visão multimodal. */
export const AI_PROVIDER_TIMEOUT_MS = 20_000 as const;

/** Tamanho mínimo da descrição retornada pela IA. */
export const AI_DESCRIPTION_MIN_LENGTH = 3 as const;

// ============================================================
// E-mail — provider HTTP
// ============================================================
/** Timeout do provider de e-mail HTTP (15s). */
export const EMAIL_PROVIDER_TIMEOUT_MS = 15_000 as const;

/** Assunto máximo (espelha `forwardings.subject VARCHAR(200)`). */
export const EMAIL_SUBJECT_MAX_LENGTH = 200 as const;

/** Corpo máximo (text + html combinados). */
export const EMAIL_BODY_MAX_LENGTH = 100_000 as const;

// ============================================================
// Geolocalização
// ============================================================
/**
 * Casas decimais para arredondamento da localização no mapa público.
 * 3 casas ≈ 110m (quadra/bairro) — RN022.
 *
 * O snap é feito no banco (`public_occurrences_source` via ST_SnapToGrid).
 * Este valor é documental — a fonte de verdade é o SQL da função.
 */
export const PUBLIC_LOCATION_DECIMALS = 3 as const;