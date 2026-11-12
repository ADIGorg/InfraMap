// src/shared/middlewares/http-security.ts

import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import type { RequestHandler } from "express";

import { env } from "../../config/env.js";
import { AppError } from "../errors/app-error.js";

const ALLOWED_METHODS = [
  "GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS",
] as const;

// 1. Cabeçalhos de segurança
export const securityHeaders = helmet();

// 2. CORS
export function createCorsMiddleware(allowedOrigins: readonly string[]) {
  const origins = new Set(allowedOrigins);

  return cors({
    origin(origin, callback) {
      // Sem Origin: mobile, HTTP tools, server-to-server — permitir.
      const allowed = !origin || origins.has(origin);
      callback(null, allowed);
    },
    methods: [...ALLOWED_METHODS],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
    optionsSuccessStatus: 204,
  });
}

export const corsMiddleware = createCorsMiddleware(env.cors.allowedOrigins);

// 3. Restrição de métodos
export const restrictHttpMethods: RequestHandler = (request, response, next) => {
  if (!ALLOWED_METHODS.includes(request.method as (typeof ALLOWED_METHODS)[number])) {
    response.setHeader("Allow", ALLOWED_METHODS.join(", "));
    next(new AppError(405, "METHOD_NOT_ALLOWED", "Método HTTP não permitido."));
    return;
  }
  next();
};

// 4. Rate limit
export function createApiRateLimiter(maxRequests = 100) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: maxRequests,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      error: {
        code: "TOO_MANY_REQUESTS",
        message: "Limite de requisições excedido. Tente novamente mais tarde.",
      },
    },
  });
}

export const apiRateLimiter = createApiRateLimiter();