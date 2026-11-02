
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

import {
  type Request,
  type RequestHandler,
} from "express";

import { logger } from "../logger/logger.js";

// Obtém o padrão da rota, sem parâmetros reais ou query string.
function getRouteName(request: Request): string {
  const route = request.route?.path;

  return typeof route === "string"
    ? route
    : "UNMATCHED";
}

// Middleware de logging HTTP.
export const requestLogger: RequestHandler = (
  request,
  response,
  next
) => {
  const startedAt = performance.now();
  const requestId = randomUUID();

  // Identificador para relacionar logs da mesma requisição.
  response.locals.requestId = requestId;
  response.setHeader("X-Request-Id", requestId);

  // Evita registrar a mesma requisição duas vezes.
  let logged = false;

  function writeLog(
    outcome: "finished" | "aborted"
  ): void {
    if (logged) return;
    logged = true;

    const durationMs = Number(
      (performance.now() - startedAt).toFixed(2)
    );

    // Apenas informações técnicas permitidas.
    const logData = {
      requestId,
      method: request.method,
      route: getRouteName(request),
      statusCode: response.statusCode,
      durationMs,
      outcome,
    };

    if (
      outcome === "aborted" ||
      response.statusCode >= 500
    ) {
      logger.error(logData, "http_request_completed");
      return;
    }

    if (response.statusCode >= 400) {
      logger.warn(logData, "http_request_completed");
      return;
    }

    logger.info(logData, "http_request_completed");
  }

  // Requisição concluída normalmente.
  response.once("finish", () => {
    writeLog("finished");
  });

  // Conexão encerrada antes de concluir a resposta.
  response.once("close", () => {
    if (!response.writableFinished) {
      writeLog("aborted");
    }
  });

  next();
};
