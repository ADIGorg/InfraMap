
import express from "express";

import routes from "./routes/index.routes.js";
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

// ==========================================
// CONFIGURAÇÃO DO EXPRESS
// ==========================================

const app = express();

// ==========================================
// API1-12 - LOGGING DE REQUISIÇÕES
// ==========================================

// Registra as requisições HTTP.
// Deve ser configurado antes dos demais middlewares.
app.use(requestLogger);

// ==========================================
// API1-11 - PROTEÇÕES HTTP
// ==========================================

// Configura cabeçalhos HTTP de segurança.
app.use(securityHeaders);

// Configura CORS com origens autorizadas.
app.use(corsMiddleware);

// Restringe métodos HTTP não permitidos.
app.use(restrictHttpMethods);

// Limita a frequência de requisições.
app.use(apiRateLimiter);

// Parser JSON com limite de 100 KB.
app.use(express.json({ limit: "100kb" }));

// ==========================================
// ROTAS DA APLICAÇÃO
// ==========================================

// Documentação da API.
app.use("/api/docs", docsRoutes);

// Rotas principais.
// Todas utilizam o prefixo /api/v1.
app.use("/api/v1", routes);

// ==========================================
// API1-44 - ID-02
// DESATIVAÇÃO E ANONIMIZAÇÃO DA CONTA
// ==========================================

// Endpoint: DELETE /api/v1/identity/me
// Permite que um cidadão autenticado solicite
// a desativação da própria conta.
app.use("/api/v1", deactivateMyAccountRouter);

// ==========================================
// API1-10 - TRATAMENTO DE ROTAS INEXISTENTES
// ==========================================

app.use((_req, _res, next) => {
  next(new NotFoundError("Rota não encontrada."));
});

// ==========================================
// API1-10 / API1-12 - TRATAMENTO E LOGS DE ERROS
// ==========================================

app.use(errorHandler);

// ==========================================
// EXPORTAÇÃO DA APLICAÇÃO
// ==========================================

export default app;
