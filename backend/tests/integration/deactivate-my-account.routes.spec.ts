
import express, {
  type Request,
  type Response,
  type NextFunction,
  type RequestHandler,
  type ErrorRequestHandler,
} from "express";

import request from "supertest";

import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  createDeactivateMyAccountRouter,
} from "../../src/modules/identity/presentation/deactivate-my-account.routes.js";

/**
 * API1-44 — ID-02
 *
 * Testes de integração HTTP da rota:
 * DELETE /api/v1/identity/me
 *
 * Utiliza mocks para não modificar
 * dados reais no Supabase.
 */

function createTestApp(
  authenticated = true
) {
  const app = express();

  app.use(express.json());

  const execute = vi.fn().mockResolvedValue(
    undefined
  );

  // Middleware de autenticação simulado.
  const authentication: RequestHandler = (
    req,
    res,
    next
  ) => {
    if (!authenticated) {
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Autenticação necessária.",
        },
      });

      return;
    }

    Object.assign(req, {
      user: {
        id: "user-123",
        email: "teste@example.com",
      },
      token: "token-teste",
    });

    next();
  };

  // Registra a rota que será testada.
  app.use(
    "/api/v1",
    createDeactivateMyAccountRouter(
      authentication,
      execute
    )
  );

  // Tratador de erros específico dos testes.
  const testErrorHandler: ErrorRequestHandler = (
    error: unknown,
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    void req;
    void next;

    res.status(503).json({
      error: {
        code: "ACCOUNT_DEACTIVATED_AUTH_PENDING",
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido.",
      },
    });
  };

  app.use(testErrorHandler);

  return {
    app,
    execute,
  };
}

describe("API1-44 - DELETE /identity/me", () => {

  it("deve retornar 204 após desativação bem-sucedida", async () => {
    const { app, execute } = createTestApp();

    const response = await request(app)
      .delete("/api/v1/identity/me");

    expect(response.status).toBe(204);

    expect(response.text).toBe("");

    expect(execute).toHaveBeenCalledWith(
      "user-123",
      "token-teste"
    );
  });

  it("deve retornar 401 sem autenticação", async () => {
    const { app, execute } =
      createTestApp(false);

    const response = await request(app)
      .delete("/api/v1/identity/me");

    expect(response.status).toBe(401);

    expect(execute).not.toHaveBeenCalled();
  });

  it("deve encaminhar falhas ao tratador de erros", async () => {
    const { app, execute } = createTestApp();

    execute.mockRejectedValue(
      new Error("Falha simulada")
    );

    const response = await request(app)
      .delete("/api/v1/identity/me");

    expect(response.status).toBe(503);

    expect(response.body.error.code).toBe(
      "ACCOUNT_DEACTIVATED_AUTH_PENDING"
    );

    expect(response.body.error.message).toBe(
      "Falha simulada"
    );
  });

});
