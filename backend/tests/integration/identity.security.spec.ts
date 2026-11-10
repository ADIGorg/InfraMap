
import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";

import request from "supertest";
import { describe, expect, it, vi } from "vitest";

// Simula a autenticação exclusivamente neste teste.
// A autenticação real já possui testes próprios.
vi.mock(
  "../../src/shared/middlewares/authenticate.js",
  () => ({
    authenticate: (
      _req: Request,
      _res: Response,
      next: NextFunction
    ) => next(),
  })
);

// Simula um administrador autorizado.
// Não altera o middleware real da aplicação.
vi.mock(
  "../../src/shared/middlewares/authorize-role.js",
  () => ({
    authorizeRole: () => (
      _req: Request,
      _res: Response,
      next: NextFunction
    ) => next(),
  })
);

import {
  identityRouter,
} from "../../src/modules/identity/presentation/identity.routes.js";

import {
  errorHandler,
} from "../../src/shared/middlewares/error-handler.js";

function createTestApp() {
  const app = express();

  app.use(express.json());

  app.use("/api/v1/identity", identityRouter);

  app.use(errorHandler);

  return app;
}

describe("ARC-01 - Segurança da rota provisória de usuários", () => {
  it("não deve devolver senha nem dados de cadastro na resposta", async () => {
    const password = "SenhaTeste123!";

    const response = await request(createTestApp())
      .post("/api/v1/identity/users")
      .send({
        name: "Maria Silva",
        email: "maria@example.com",
        password,
        role: "CITIZEN",
      });

    expect(response.status).toBe(201);

    expect(response.body).toEqual({
      message: "Dados validados. Nenhum usuário foi criado.",
    });

    expect(response.body).not.toHaveProperty("data");

    expect(response.text).not.toContain(password);
  });

  it("deve continuar rejeitando dados inválidos com HTTP 400", async () => {
    const response = await request(createTestApp())
      .post("/api/v1/identity/users")
      .send({
        name: "Ma",
        email: "email-invalido",
        password: "123",
      });

    expect(response.status).toBe(400);

    expect(response.body.error.code).toBe("BAD_REQUEST");
  });
});
