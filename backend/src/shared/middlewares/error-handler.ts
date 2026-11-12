// src/shared/middlewares/error-handler.ts

import type { ErrorRequestHandler } from "express";

import { AppError } from "../errors/app-error.js";
import { logger } from "../logger/logger.js";

// ============================================================
// Detecção de erros de middleware
// ============================================================
function isInvalidJsonError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const e = error as { type?: string; status?: number; statusCode?: number };
  const isBadRequest = e.status === 400 || e.statusCode === 400;
  return isBadRequest && (e.type === "entity.parse.failed" || error instanceof SyntaxError);
}

function isPayloadTooLarge(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const e = error as { type?: string; status?: number; statusCode?: number };
  return e.type === "entity.too.large" && (e.status === 413 || e.statusCode === 413);
}

// ============================================================
// Handler centralizado
// ============================================================
export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  next,
) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  const requestId =
    typeof response.locals.requestId === "string"
      ? response.locals.requestId
      : "unknown";

  const errorType = error instanceof Error ? error.name : typeof error;

  // ----------------------------------------------------------
  // 1. AppError — preserva code/message do contrato
  //
  //    4xx: warn  — erros esperados (validação, auth, conflito)
  //    5xx: error — erros explícitos de infra/IA/serviço
  //
  //    Mensagens de AppError 5xx são responsabilidade do dev que
  //    as instancia (devem ser safe-by-design, sem dados sensíveis).
  //    Erros NÃO-AppError caem no fallback genérico (item 4).
  // ----------------------------------------------------------
  if (error instanceof AppError) {
    const isServerError = error.statusCode >= 500;
    const log = isServerError ? logger.error : logger.warn;

    log.call(
      logger,
      {
        requestId,
        statusCode: error.statusCode,
        code: error.code,
        errorType,
      },
      "handled_api_error",
    );

    response.status(error.statusCode).json({
      error: { code: error.code, message: error.message },
    });
    return;
  }

  // 2. JSON inválido
  if (isInvalidJsonError(error)) {
    logger.warn(
      { requestId, statusCode: 400, code: "INVALID_JSON", errorType },
      "handled_api_error",
    );
    response.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "O corpo da requisição contém JSON inválido.",
      },
    });
    return;
  }

  // 3. Payload excessivo
  if (isPayloadTooLarge(error)) {
    logger.warn(
      { requestId, statusCode: 413, code: "PAYLOAD_TOO_LARGE", errorType },
      "handled_api_error",
    );
    response.status(413).json({
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "O corpo da requisição excede o limite permitido.",
      },
    });
    return;
  }

  // 4. Fallback — erros inesperados (não-AppError)
  logger.error(
    { requestId, statusCode: 500, code: "INTERNAL_SERVER_ERROR", errorType },
    "unexpected_server_error",
  );
  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Ocorreu um erro interno no servidor.",
    },
  });
};