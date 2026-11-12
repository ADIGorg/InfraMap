// src/shared/logger/logger.ts

import pino from "pino";

import { env } from "../../config/env.js";

/**
 * Logger centralizado.
 *
 * `env.ts` já validou `LOG_LEVEL` (enum) e definiu default coerente com
 * `NODE_ENV` (info em prod, debug em dev/test).
 */
export const logger = pino({
  name: "inframap-api",
  level: env.log.level,
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "password",
      "token",
      "accessToken",
      "refreshToken",
      "authorization",
      "cookie",
      "apiKey",
      "ai.apiKey",
      "email.apiKey",
      "headers.authorization",
      "headers.cookie",
      "req.headers.authorization",
      "req.headers.cookie",
      "body.password",
      "body.token",
      "body.access_token",
      "body.refresh_token",
    ],
    censor: "[REDACTED]",
  },
});