// src/config/constants.ts

// ==========================================
// API — versão e prefixos de rota
// ==========================================
export const API_PREFIX = "/api/v1";
export const API_DOCS_PREFIX = "/api/docs";
export const API_VERSION = "1.0.0";

/**
 * Limite do corpo JSON em requisições.
 * Valores maiores são rejeitados com 413.
 */
export const JSON_BODY_LIMIT = "100kb";

// ==========================================
// Paginação — consultas de listagem
// ==========================================
// (Não especificado nos requisitos — defaults do projeto.)
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ==========================================
// Ocorrências — RF06, RF08, RF10
// ==========================================

/** RF08 — limite máximo de caracteres da descrição. */
export const OCCURRENCE_DESCRIPTION_MAX_LENGTH = 500;

/** RF10 — mínimo de evidências fotográficas obrigatórias. */
export const OCCURRENCE_PHOTOS_MIN = 1;

/** RF10 — máximo de evidências fotográficas por ocorrência. */
export const OCCURRENCE_PHOTOS_MAX = 3;

/** RF10 — formatos aceitos (apenas JPG). */
export const OCCURRENCE_PHOTO_MIME_TYPES = ["image/jpeg"] as const;

// ==========================================
// Fotos — armazenamento e acesso (RF27)
// ==========================================

/**
 * Nome do bucket privado no Supabase Storage.
 * Confirmar com a migration `20261107134350_fix_bucket_allowed_mime_types.sql`.
 */
export const STORAGE_BUCKET_NAME = "occurrence-photos";

/**
 * Tamanho máximo por arquivo.
 *
 * ⚠️ Não especificado nos requisitos. Sugestão de 5 MB como default
 * razoável para fotos de celular. Confirmar com o limite configurado
 * no bucket do Supabase.
 */
export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Tempo de expiração da URL assinada de foto (RF27).
 *
 * Não especificado nos requisitos — 5 min é curto o suficiente para
 * evitar link compartilhado e longo o suficiente para o app carregar.
 */
export const PHOTO_URL_EXPIRATION_SECONDS = 300; // 5 min

// ==========================================
// Privacidade — RF27, RN022
// ==========================================

/**
 * Casas decimais do arredondamento da coordenada para exibição pública.
 *
 * 3 casas ≈ 110 m (quadra/bairro) — RN022.
 * 2 casas ≈ 1.1 km (bairro amplo) — ver RF27 ("ex: bairro").
 *
 * ⚠️ RF27 cita "bairro" como exemplo, mas RN022 (implementada no código
 * atual como "quadra/bairro") usa 3 casas. Confirmar qual granularidade
 * é a oficial antes de mudar — afeta todos os mapas públicos.
 */
export const PUBLIC_LOCATION_DECIMALS = 3;

// ==========================================
// Requisitos não-funcionais (documentação)
// ==========================================
//
// Os valores abaixo NÃO são aplicados diretamente pelo código — são
// parâmetros de infraestrutura/SLA documentados aqui para referência
// e uso em dashboards, testes de carga, docs e configuração de CI/ops.
// Detalhamento pertence a docs/architecture.md e docs/database.md.

/** RNF03 — 95% das requisições abaixo deste tempo (ms). */
export const SLA_P95_RESPONSE_MS = 2000;

/** RNF04 — disponibilidade mínima mensal (0–1). */
export const SLA_MONTHLY_UPTIME = 0.99;

/** RNF15 — intervalo máximo de backup (horas). */
export const BACKUP_INTERVAL_HOURS = 24;

/** RNF15 — tempo máximo de recuperação após desastre (horas). */
export const RECOVERY_TIME_OBJECTIVE_HOURS = 4;

/** RNF17 — retenção mínima dos logs de auditoria (meses). */
export const AUDIT_LOG_RETENTION_MONTHS = 6;