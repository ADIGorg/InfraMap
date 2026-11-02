// RENOMEAR ESTE ARQUIVO DEPOIS PARA authenticate.spec.ts


import express from "express";
import request from "supertest";

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// Mock criado antes do carregamento do módulo.
const { getUserMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
}));

// Substitui o cliente Supabase somente nos testes.
vi.mock(
  "../../src/infrastructure/supabase/auth-client.js",
  () => ({
    supabase: {
      auth: {
        getUser: getUserMock,
      },
    },
  })
);

import { authenticate } from "../../src/shared/middlewares/authenticate.js";
import { errorHandler } from "../../src/shared/middlewares/error-handler.js";

// Aplicação Express isolada para testes.
function createTestApp() {
  const app = express();

  app.get(
    "/protected",
    authenticate,
    (req, res) => {
      res.status(200).json({
        id: req.user?.id,
      });
    }
  );

  app.use(errorHandler);

  return app;
}

describe("API1-14 - Middleware de autenticação", () => {

  beforeEach(() => {
    getUserMock.mockReset();
  });

  it("deve retornar 401 quando o token estiver ausente", async () => {
    const app = createTestApp();

    const response = await request(app)
      .get("/protected");

    expect(response.status).toBe(401);

    expect(getUserMock)
      .not.toHaveBeenCalled();
  });

  it("deve retornar 401 para formato de token inválido", async () => {
    const app = createTestApp();

    const response = await request(app)
      .get("/protected")
      .set("Authorization", "Basic token-ficticio");

    expect(response.status).toBe(401);

    expect(getUserMock)
      .not.toHaveBeenCalled();
  });

  it("deve retornar 401 para token inválido", async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid JWT" },
    });

    const app = createTestApp();

    const response = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer token-invalido");

    expect(response.status).toBe(401);

    expect(getUserMock)
      .toHaveBeenCalledWith("token-invalido");
  });

  it("deve retornar 401 para token expirado", async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: { message: "JWT expired" },
    });

    const app = createTestApp();

    const response = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer token-expirado");

    expect(response.status).toBe(401);
  });

  it("deve permitir acesso com token válido", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "usuario-123",
        },
      },
      error: null,
    });

    const app = createTestApp();

    const response = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer token-valido");

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      id: "usuario-123",
    });

    expect(getUserMock)
      .toHaveBeenCalledWith("token-valido");
  });

});
