
import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from "../../src/shared/errors/app-error.js";

import { errorHandler } from "../../src/shared/middlewares/error-handler.js";

// Cria uma aplicação Express isolada para os testes.
function createTestApp() {
  const app = express();

  // Habilita o processamento de JSON.
  app.use(express.json());

  // Simula um erro HTTP 400.
  app.get("/bad-request", (_req, _res, next) => {
    next(new BadRequestError("Requisição inválida."));
  });

  // Simula um erro HTTP 401.
  app.get("/unauthorized", (_req, _res, next) => {
    next(new UnauthorizedError("Autenticação necessária."));
  });

  // Simula um erro HTTP 403.
  app.get("/forbidden", (_req, _res, next) => {
    next(new ForbiddenError("Acesso negado."));
  });

  // Simula um erro HTTP 409.
  app.get("/conflict", (_req, _res, next) => {
    next(new ConflictError("Conflito na operação."));
  });

  // Simula uma falha inesperada do servidor.
  app.get("/unexpected", () => {
    throw new Error("INTERNAL_SECRET_EXAMPLE");
  });

  // Rota utilizada para testar JSON inválido.
  app.post("/json", (_req, res) => {
    res.status(200).json({ success: true });
  });

  // Encaminha rotas inexistentes para o tratamento.
  app.use((_req, _res, next) => {
    next(new NotFoundError("Rota não encontrada."));
  });

  // Middleware centralizado de tratamento de erros.
  app.use(errorHandler);

  return app;
}

describe("API1-10 - Tratamento centralizado de erros", () => {
  const app = createTestApp();

  // TESTE 1 - HTTP 400
  it("deve retornar 400 para requisição inválida", async () => {
    const response = await request(app).get("/bad-request");

    expect(response.status).toBe(400);

    expect(response.body.error).toEqual({
      code: "BAD_REQUEST",
      message: "Requisição inválida.",
    });
  });

  // TESTE 2 - HTTP 401
  it("deve retornar 401 para usuário não autenticado", async () => {
    const response = await request(app).get("/unauthorized");

    expect(response.status).toBe(401);

    expect(response.body.error).toEqual({
      code: "UNAUTHORIZED",
      message: "Autenticação necessária.",
    });
  });

  // TESTE 3 - HTTP 403
  it("deve retornar 403 para acesso não autorizado", async () => {
    const response = await request(app).get("/forbidden");

    expect(response.status).toBe(403);

    expect(response.body.error).toEqual({
      code: "FORBIDDEN",
      message: "Acesso negado.",
    });
  });

  // TESTE 4 - HTTP 404
  it("deve retornar 404 para rota inexistente", async () => {
    const response = await request(app).get("/inexistente");

    expect(response.status).toBe(404);

    expect(response.body.error).toEqual({
      code: "NOT_FOUND",
      message: "Rota não encontrada.",
    });
  });

  // TESTE 5 - HTTP 409
  it("deve retornar 409 para conflito na operação", async () => {
    const response = await request(app).get("/conflict");

    expect(response.status).toBe(409);

    expect(response.body.error).toEqual({
      code: "CONFLICT",
      message: "Conflito na operação.",
    });
  });

  // TESTE 6 - JSON inválido
  it("deve retornar 400 para JSON malformado", async () => {
    const response = await request(app)
      .post("/json")
      .set("Content-Type", "application/json")
      .send('{"invalid":');

    expect(response.status).toBe(400);

    expect(response.body.error).toEqual({
      code: "INVALID_JSON",
      message: "O corpo da requisição contém JSON inválido.",
    });
  });

  // TESTE 7 - HTTP 500
  it("deve retornar 500 para erro inesperado", async () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      const response = await request(app).get("/unexpected");

      expect(response.status).toBe(500);

      expect(response.body.error).toEqual({
        code: "INTERNAL_SERVER_ERROR",
        message: "Ocorreu um erro interno no servidor.",
      });

      // Não deve expor informações internas.
      expect(JSON.stringify(response.body))
        .not.toContain("INTERNAL_SECRET_EXAMPLE");

      // Não deve retornar stack trace.
      expect(response.body).not.toHaveProperty("stack");
      expect(response.body.error).not.toHaveProperty("stack");
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
