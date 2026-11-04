
import express from "express";
import routes from "./routes/index.routes.js";

// ==========================================
// API1-10 - TRATAMENTO CENTRALIZADO DE ERROS
// ==========================================

import { NotFoundError } from "./shared/errors/app-error.js";

import { errorHandler } from "./shared/middlewares/error-handler.js";

// ==========================================
// API1-11 - SEGURANÇA HTTP
// ==========================================

import {
  securityHeaders,
  corsMiddleware,
  restrictHttpMethods,
  apiRateLimiter,
} from "./shared/middlewares/http-security.js";

// ==========================================
// API1-12 - LOGS ESTRUTURADOS
// ==========================================

import { requestLogger } from "./shared/middlewares/request-logger.js";

// ==========================================
// CONFIGURAÇÃO DO EXPRESS
// ==========================================

const app = express();

// ==========================================
// API1-12 - LOGGING DE REQUISIÇÕES
// ==========================================

// Registra as requisições HTTP.
// Deve ser configurado antes dos demais middlewares
// para acompanhar inclusive requisições rejeitadas.
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

// Todas as rotas utilizam o prefixo /api/v1.
app.use("/api/v1", routes);

// ==========================================
// API1-10 - TRATAMENTO DE ROTAS INEXISTENTES
// ==========================================

// Encaminha rotas inexistentes para o
// middleware centralizado de tratamento de erros.
app.use((_req, _res, next) => {
  next(new NotFoundError("Rota não encontrada."));
});

// ==========================================
// API1-10 / API1-12 - TRATAMENTO E LOGS DE ERROS
// ==========================================

// Trata erros conhecidos e inesperados.
// Com a API1-12, também registra falhas utilizando Pino.
// Deve permanecer após as rotas e demais middlewares.
app.use(errorHandler);

// ==========================================
// EXPORTAÇÃO DA APLICAÇÃO
// ==========================================

export default app;
