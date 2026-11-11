
import { type ErrorRequestHandler } from "express";
import { AppError } from "../errors/app-error.js";
import { logger } from "../logger/logger.js";

// ==========================================
// IDENTIFICAÇÃO DE JSON INVÁLIDO
// ==========================================

function isInvalidJsonError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const parsedError = error as {
    type?: string;
    status?: number;
    statusCode?: number;
  };

  const isBadRequest =
    parsedError.status === 400 ||
    parsedError.statusCode === 400;

  return (
    isBadRequest &&
    (
      parsedError.type === "entity.parse.failed" ||
      error instanceof SyntaxError
    )
  );
}

// ==========================================
// IDENTIFICAÇÃO DE PAYLOAD EXCESSIVO
// ==========================================

function isPayloadTooLarge(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const parsedError = error as {
    type?: string;
    status?: number;
    statusCode?: number;
  };

  return (
    parsedError.type === "entity.too.large" &&
    (
      parsedError.status === 413 ||
      parsedError.statusCode === 413
    )
  );
}

// ==========================================
// TRATAMENTO CENTRALIZADO DE ERROS
// ==========================================

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  next
) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  const requestId =
    typeof response.locals.requestId === "string"
      ? response.locals.requestId
      : "unknown";

  const errorType =
    error instanceof Error
      ? error.name
      : typeof error;

  // 1. Erros conhecidos da aplicação.
  if (
    error instanceof AppError &&
    error.statusCode >= 400 &&
    (error.statusCode < 500 || error.statusCode === 502 || error.statusCode === 503)
  ) {
    logger.warn(
      {
        requestId,
        statusCode: error.statusCode,
        code: error.code,
        errorType,
      },
      "handled_api_error"
    );

    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });

    return;
  }

  // 2. JSON inválido.
  if (isInvalidJsonError(error)) {
    logger.warn(
      {
        requestId,
        statusCode: 400,
        code: "INVALID_JSON",
        errorType,
      },
      "handled_api_error"
    );

    response.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "O corpo da requisição contém JSON inválido.",
      },
    });

    return;
  }

  // 3. Payload maior que o permitido.
  if (isPayloadTooLarge(error)) {
    logger.warn(
      {
        requestId,
        statusCode: 413,
        code: "PAYLOAD_TOO_LARGE",
        errorType,
      },
      "handled_api_error"
    );

    response.status(413).json({
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message:
          "O corpo da requisição excede o limite permitido.",
      },
    });

    return;
  }

  // 4. Erros inesperados.
  // Não registra mensagem original, stack ou dados recebidos.
  logger.error(
    {
      requestId,
      statusCode: 500,
      code: "INTERNAL_SERVER_ERROR",
      errorType,
    },
    "unexpected_server_error"
  );

  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Ocorreu um erro interno no servidor.",
    },
  });
};
