// src/app.ts

import express, { type Express } from "express";

import { createRoutes } from "./routes/index.routes.js";
import docsRoutes from "./routes/docs.routes.js";

import { NotFoundError } from "./shared/errors/app-error.js";
import { errorHandler } from "./shared/middlewares/error-handler.js";

import { deactivateMyAccountRouter } from "./modules/identity/presentation/deactivate-my-account.routes.js";

import {
  securityHeaders,
  corsMiddleware,
  restrictHttpMethods,
  apiRateLimiter,
} from "./shared/middlewares/http-security.js";

import { requestLogger } from "./shared/middlewares/request-logger.js";

import {
  API_PREFIX,
  API_DOCS_PREFIX,
  JSON_BODY_LIMIT,
} from "./config/constants.js";

// ==========================================
// FACTORY DO APP
// ==========================================
// Sem dependências externas injetadas: os módulos criam
// os clientes Supabase por requisição. `env.ts` valida
// todas as variáveis (incluindo `SUPABASE_SECRET_KEY`) no
// import — fail-fast coberto sem precisar de client no boot.
// ==========================================
export function createApp(): Express {
  const app = express();

  // ==========================================
  // API1-12 — LOGGING
  // ==========================================
  app.use(requestLogger);

  // ==========================================
  // API1-11 — SEGURANÇA HTTP
  // ==========================================
  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(restrictHttpMethods);
  app.use(apiRateLimiter);
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  // ==========================================
  // ROTAS
  // ==========================================
  app.use(API_DOCS_PREFIX, docsRoutes);
  app.use(API_PREFIX, createRoutes());

  // ==========================================
  // ID-02 — DESATIVAÇÃO (DELETE /identity/me)
  // ==========================================
  app.use(API_PREFIX, deactivateMyAccountRouter);

  // ==========================================
  // 404
  // ==========================================
  app.use((_req, _res, next) => {
    next(new NotFoundError("Rota não encontrada."));
  });

  // ==========================================
  // ERROS
  // ==========================================
  app.use(errorHandler);

  return app;
}