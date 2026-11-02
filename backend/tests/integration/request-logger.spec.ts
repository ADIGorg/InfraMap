
import express from "express";
import request from "supertest";

import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { logger } from "../../src/shared/logger/logger.js";

import { requestLogger } from "../../src/shared/middlewares/request-logger.js";

import { errorHandler } from "../../src/shared/middlewares/error-handler.js";

import { NotFoundError } from "../../src/shared/errors/app-error.js";

// Aplicação Express isolada para os testes.
function createTestApp() {
  const app = express();

  app.use(requestLogger);
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
    });
  });

  app.post("/echo", (_req, res) => {
    res.status(200).json({
      success: true,
    });
  });

  app.get("/unexpected", () => {
    throw new Error("INTERNAL_SECRET_EXAMPLE");
  });

  app.use((_req, _res, next) => {
    next(new NotFoundError("Rota não encontrada."));
  });

  app.use(errorHandler);

  return app;
}

describe("API1-12 - Logs estruturados", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // TESTE 1 - REGISTRO DE REQUISIÇÕES
  it("deve registrar requisições com informações estruturadas", async () => {
    const infoSpy = vi
      .spyOn(logger, "info")
      .mockImplementation(() => {});

    const app = createTestApp();

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);

    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        route: "/health",
        statusCode: 200,
        durationMs: expect.any(Number),
        requestId: expect.any(String),
      }),
      "http_request_completed"
    );
  });

  // TESTE 2 - IDENTIFICADOR DA REQUISIÇÃO
  it("deve gerar um identificador único para cada requisição", async () => {
    const app = createTestApp();

    const response1 = await request(app).get("/health");
    const response2 = await request(app).get("/health");

    const id1 = response1.headers["x-request-id"];
    const id2 = response2.headers["x-request-id"];

    expect(id1).toBeDefined();
    expect(id2).toBeDefined();

    expect(id1).not.toBe(id2);
  });

  // TESTE 3 - REGISTRO DE ERROS HTTP
  it("deve registrar avisos para erros HTTP 404", async () => {
    const warnSpy = vi
      .spyOn(logger, "warn")
      .mockImplementation(() => {});

    const app = createTestApp();

    const response = await request(app).get("/inexistente");

    expect(response.status).toBe(404);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        requestId: expect.any(String),
      }),
      "http_request_completed"
    );
  });

  // TESTE 4 - ERROS INTERNOS
  it("deve registrar erros internos sem expor detalhes", async () => {
    const errorSpy = vi
      .spyOn(logger, "error")
      .mockImplementation(() => {});

    const app = createTestApp();

    const response = await request(app).get("/unexpected");

    expect(response.status).toBe(500);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        errorType: "Error",
        requestId: expect.any(String),
      }),
      "unexpected_server_error"
    );

    const logs = JSON.stringify(errorSpy.mock.calls);

    expect(logs).not.toContain("INTERNAL_SECRET_EXAMPLE");
  });

  // TESTE 5 - PROTEÇÃO DE DADOS SENSÍVEIS
  it("não deve registrar tokens, senhas ou query strings", async () => {
    const infoSpy = vi
      .spyOn(logger, "info")
      .mockImplementation(() => {});

    const app = createTestApp();

    const response = await request(app)
      .post("/echo?token=QUERY_SECRET")
      .set("Authorization", "Bearer HEADER_SECRET")
      .send({
        password: "BODY_SECRET",
      });

    expect(response.status).toBe(200);

    expect(infoSpy).toHaveBeenCalled();

    const logs = JSON.stringify(infoSpy.mock.calls);

    expect(logs).not.toContain("QUERY_SECRET");
    expect(logs).not.toContain("HEADER_SECRET");
    expect(logs).not.toContain("BODY_SECRET");
  });
});
