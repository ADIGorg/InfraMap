// src/config/env.ts

import "dotenv/config";
import { z } from "zod";

// ============================================================
// Enums de ambiente
// ============================================================
const NODE_ENVS = ["development", "test", "production"] as const;
const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;
const AI_PROVIDERS = ["mock", "http", "gemini"] as const;
const EMAIL_PROVIDERS = ["mock", "http", "smtp"] as const;

// ============================================================
// Schema
// ============================================================
const envSchema = z.object({
  NODE_ENV: z.enum(NODE_ENVS).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  // Supabase — sempre obrigatórias
  SUPABASE_URL: z.string().url("SUPABASE_URL deve ser uma URL válida."),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1, "SUPABASE_PUBLISHABLE_KEY é obrigatória."),
  SUPABASE_SECRET_KEY: z.string().min(1, "SUPABASE_SECRET_KEY é obrigatória."),

  // CORS e logging
  CORS_ALLOWED_ORIGINS: z.string().default(""),
  LOG_LEVEL: z.enum(LOG_LEVELS).default("info"),

  // IA
  AI_PROVIDER: z.enum(AI_PROVIDERS).default("mock"),
  AI_API_URL: z.string().url().optional(),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.enum(["gemini-3.5-flash-lite", "gemini-2.5-flash-lite"]).default("gemini-3.5-flash-lite"),
  AI_PROMPT_VERSION: z.string().default("v1"),
  AI_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.7),

  // E-mail (FWD-01)
 // E-mail (FWD-01)
  EMAIL_PROVIDER: z.enum(EMAIL_PROVIDERS).default("mock"),

  EMAIL_API_URL: z.string().url().optional(),
  EMAIL_API_KEY: z.string().optional(),
  EMAIL_FROM: z.email().optional(),

  // SMTP - Gmail
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(465),
  SMTP_SECURE: z.enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  SMTP_USER: z.email().optional(),
  SMTP_APP_PASSWORD: z.string().optional(), 
  // Forwarding (FWD-02)
  FORWARDING_PUBLIC_URL_TEMPLATE: z.string()
    .min(1, "FORWARDING_PUBLIC_URL_TEMPLATE é obrigatória.")
    .refine((s) => s.includes("{id}"), "FORWARDING_PUBLIC_URL_TEMPLATE deve conter {id}")
    .default("http://localhost:5173/occurrences/{id}"),
});

type RawEnv = z.infer<typeof envSchema>;

// ============================================================
// Parse + regras cross-field (fail-fast)
// ============================================================
function parseEnv(): RawEnv {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Configuração de ambiente inválida:\n${issues}`);
  }



  const data = result.data;

  // AI_PROVIDER=http exige URL, API key e model
  if (data.AI_PROVIDER === "http") {
    const missing: string[] = [];
    if (!data.AI_API_URL) missing.push("AI_API_URL");
    if (!data.AI_API_KEY) missing.push("AI_API_KEY");
    if (!data.AI_MODEL) missing.push("AI_MODEL");
    if (missing.length > 0) {
      throw new Error(
        `AI_PROVIDER=http exige as variáveis: ${missing.join(", ")}.`
      );
    }
  }

  if (data.AI_PROVIDER === "gemini" && !data.GEMINI_API_KEY) {
    throw new Error("AI_PROVIDER=gemini exige GEMINI_API_KEY.");
  }

  // AI_API_URL deve ser HTTPS
  if (data.AI_API_URL && !data.AI_API_URL.startsWith("https://")) {
    throw new Error("AI_API_URL deve usar HTTPS.");
  }

  // EMAIL_PROVIDER=http exige URL, API key e from
  if (data.EMAIL_PROVIDER === "http") {
    const missing: string[] = [];
    if (!data.EMAIL_API_URL) missing.push("EMAIL_API_URL");
    if (!data.EMAIL_API_KEY) missing.push("EMAIL_API_KEY");
    if (!data.EMAIL_FROM) missing.push("EMAIL_FROM");
    if (missing.length > 0) {
      throw new Error(
        `EMAIL_PROVIDER=http exige as variáveis: ${missing.join(", ")}.`
      );
    }
  }

  // EMAIL_API_URL deve ser HTTPS
  if (data.EMAIL_API_URL && !data.EMAIL_API_URL.startsWith("https://")) {
    throw new Error("EMAIL_API_URL deve usar HTTPS.");
  }

  // Production: CORS obrigatório e não vazio
  if (data.NODE_ENV === "production" && !data.CORS_ALLOWED_ORIGINS.trim()) {
    throw new Error(
      "CORS_ALLOWED_ORIGINS é obrigatório em NODE_ENV=production."
    );
  }

  // EMAIL_PROVIDER=smtp exige configuração SMTP
  if (data.EMAIL_PROVIDER === "smtp") {
    const missing: string[] = [];

    if (!data.SMTP_HOST) missing.push("SMTP_HOST");
    if (!data.SMTP_USER) missing.push("SMTP_USER");
    if (!data.SMTP_APP_PASSWORD) missing.push("SMTP_APP_PASSWORD");
    if (!data.EMAIL_FROM) missing.push("EMAIL_FROM");

    if (missing.length > 0) {
      throw new Error(
        `EMAIL_PROVIDER=smtp exige as variáveis: ${missing.join(", ")}.`
      );
    }
  }

  return data;
}

const raw = parseEnv();

// ============================================================
// Export
// ============================================================
export const env = {
  nodeEnv: raw.NODE_ENV,
  isDev: raw.NODE_ENV === "development",
  isTest: raw.NODE_ENV === "test",
  isProd: raw.NODE_ENV === "production",

  port: raw.PORT,

  supabase: {
    url: raw.SUPABASE_URL,
    publishableKey: raw.SUPABASE_PUBLISHABLE_KEY,
    secretKey: raw.SUPABASE_SECRET_KEY,
  },

  cors: {
    allowedOrigins: raw.CORS_ALLOWED_ORIGINS
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
  },

  log: {
    level: raw.LOG_LEVEL,
  },

  ai: {
    provider: raw.AI_PROVIDER,
    apiUrl: raw.AI_API_URL,
    apiKey: raw.AI_API_KEY,
    model: raw.AI_MODEL,
    geminiApiKey: raw.GEMINI_API_KEY,
    geminiModel: raw.GEMINI_MODEL,
    promptVersion: raw.AI_PROMPT_VERSION,
    confidenceThreshold: raw.AI_CONFIDENCE_THRESHOLD,
  },

  email: {
    provider: raw.EMAIL_PROVIDER,
    apiUrl: raw.EMAIL_API_URL,
    apiKey: raw.EMAIL_API_KEY,
    from: raw.EMAIL_FROM,

    smtp: {
      host: raw.SMTP_HOST,
      port: raw.SMTP_PORT,
      secure: raw.SMTP_SECURE,
      user: raw.SMTP_USER,
      appPassword: raw.SMTP_APP_PASSWORD,
    },
  },

  forwarding: {
    publicUrlTemplate: raw.FORWARDING_PUBLIC_URL_TEMPLATE,
  },
} as const;

export type AppEnv = typeof env;