
import "dotenv/config";

import helmet from "helmet";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import type { RequestHandler } from "express";

import { AppError } from "../errors/app-error.js";

// Métodos HTTP aceitos pela API.
const ALLOWED_METHODS = [
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
];

// 1. Cabeçalhos de segurança.
export const securityHeaders = helmet();

// 2. Configuração de CORS.
export function createCorsMiddleware(allowedOrigins: string[]) {
  const origins = new Set(allowedOrigins);

  return cors({
    origin(origin, callback) {
      // Requisições sem Origin incluem clientes móveis,
      // ferramentas HTTP e chamadas entre servidores.
      const allowed = !origin || origins.has(origin);
      callback(null, allowed);
    },

    methods: ALLOWED_METHODS,
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
    optionsSuccessStatus: 204,
  });
}

// Lê as origens configuradas no ambiente.
const configuredOrigins = (
  process.env.CORS_ALLOWED_ORIGINS ?? ""
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const corsMiddleware =
  createCorsMiddleware(configuredOrigins);

// 3. Restringe métodos HTTP não utilizados pela API.
export const restrictHttpMethods: RequestHandler = (
  request,
  response,
  next
) => {
  if (!ALLOWED_METHODS.includes(request.method)) {
    response.setHeader(
      "Allow",
      ALLOWED_METHODS.join(", ")
    );

    next(
      new AppError(
        405,
        "METHOD_NOT_ALLOWED",
        "Método HTTP não permitido."
      )
    );
    return;
  }

  next();
};

// 4. Limita a frequência de requisições.
export function createApiRateLimiter(maxRequests = 100) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: maxRequests,

    standardHeaders: "draft-7",
    legacyHeaders: false,

    message: {
      error: {
        code: "TOO_MANY_REQUESTS",
        message:
          "Limite de requisições excedido. Tente novamente mais tarde.",
      },
    },
  });
}

export const apiRateLimiter = createApiRateLimiter();
