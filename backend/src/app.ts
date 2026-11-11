// src/app.ts

import express, { type Express } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";

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
// DEPENDÊNCIAS DA APLICAÇÃO
// ==========================================

/**
 * Dependências externas que o app precisa para funcionar.
 *
 * O cliente admin é criado em `server.ts` (composition root) e
 * injetado aqui — isso permite importar `createApp` em testes
 * sem exigir credenciais reais.
 */
export interface AppDependencies {
  adminClient: SupabaseClient;
}

// ==========================================
// FACTORY DO APP
// ==========================================

export function createApp(deps: AppDependencies): Express {
  const app = express();

  // ==========================================
  // API1-12 — LOGGING DE REQUISIÇÕES
  // ==========================================
  app.use(requestLogger);

  // ==========================================
  // API1-11 — PROTEÇÕES HTTP
  // ==========================================
  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(restrictHttpMethods);
  app.use(apiRateLimiter);
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  // ==========================================
  // ROTAS DA APLICAÇÃO
  // ==========================================
  app.use(API_DOCS_PREFIX, docsRoutes);
  app.use(API_PREFIX, createRoutes(deps));

  // ==========================================
  // API1-44 — ID-02
  // DESATIVAÇÃO E ANONIMIZAÇÃO DA CONTA
  // ==========================================
  app.use(API_PREFIX, deactivateMyAccountRouter);

  // ==========================================
  // API1-10 — ROTAS INEXISTENTES
  // ==========================================
  app.use((_req, _res, next) => {
    next(new NotFoundError("Rota não encontrada."));
  });

  // ==========================================
  // API1-10 / API1-12 — TRATAMENTO DE ERROS
  // ==========================================
  app.use(errorHandler);

  return app;
}