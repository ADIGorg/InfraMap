
import express from "express";
import request from "supertest";

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// Mocks da consulta ao Supabase.
const {
  createClientMock,
  fromMock,
  selectMock,
  eqMock,
  maybeSingleMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  fromMock: vi.fn(),
  selectMock: vi.fn(),
  eqMock: vi.fn(),
  maybeSingleMock: vi.fn(),
}));

vi.mock(
  "../../src/infrastructure/supabase/user-client.factory.js",
  () => ({
    createUserSupabaseClient: createClientMock,
  })
);

import { authorizeRole } from
  "../../src/shared/middlewares/authorize-role.js";

import { errorHandler } from
  "../../src/shared/middlewares/error-handler.js";

// Aplicação isolada para testar a autorização.
function createTestApp(
  authenticated = true,
  hasToken = true
) {
  const app = express();

  app.use(express.json());

  // Simula a identidade previamente validada
  // pelo middleware authenticate.
  app.use((req, _res, next) => {
    if (authenticated) {
      Object.assign(req, {
        user: { id: "usuario-123" },
      });
    }

    if (hasToken) {
      Object.assign(req, {
        token: "jwt-ficticio",
      });
    }

    next();
  });

  app.get(
    "/admin",
    authorizeRole(["ADMIN"]),
    (_req, res) => {
      res.status(200).json({
        message: "Acesso permitido",
      });
    }
  );

  app.use(errorHandler);

  return app;
}

describe("API1-14 - Autorização por perfil", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Simula a cadeia de consulta:
    // from().select().eq().maybeSingle()
    eqMock.mockReturnValue({
      maybeSingle: maybeSingleMock,
    });

    selectMock.mockReturnValue({
      eq: eqMock,
    });

    fromMock.mockReturnValue({
      select: selectMock,
    });

    createClientMock.mockReturnValue({
      from: fromMock,
    });

    // Perfil padrão: administrador ativo.
    maybeSingleMock.mockResolvedValue({
      data: {
        role: "ADMIN",
        is_active: true,
      },
      error: null,
    });
  });

  it("deve retornar 401 sem usuário autenticado", async () => {
    const response = await request(
      createTestApp(false, false)
    ).get("/admin");

    expect(response.status).toBe(401);
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("deve retornar 401 quando não houver token", async () => {
    const response = await request(
      createTestApp(true, false)
    ).get("/admin");

    expect(response.status).toBe(401);
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("deve permitir acesso ao administrador ativo", async () => {
    const response = await request(
      createTestApp()
    ).get("/admin");

    expect(response.status).toBe(200);
    expect(response.body.message).toBe(
      "Acesso permitido"
    );

    expect(createClientMock).toHaveBeenCalledWith(
      "jwt-ficticio"
    );

    expect(fromMock).toHaveBeenCalledWith(
      "user_roles"
    );

    expect(eqMock).toHaveBeenCalledWith(
      "user_id",
      "usuario-123"
    );
  });

  it("deve bloquear cidadão em rota administrativa", async () => {
    maybeSingleMock.mockResolvedValue({
      data: {
        role: "CITIZEN",
        is_active: true,
      },
      error: null,
    });

    const response = await request(
      createTestApp()
    ).get("/admin");

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe(
      "FORBIDDEN"
    );
  });

  it("deve bloquear conta inativa", async () => {
    maybeSingleMock.mockResolvedValue({
      data: {
        role: "ADMIN",
        is_active: false,
      },
      error: null,
    });

    const response = await request(
      createTestApp()
    ).get("/admin");

    expect(response.status).toBe(403);
  });

  it("deve bloquear usuário sem perfil registrado", async () => {
    maybeSingleMock.mockResolvedValue({
      data: null,
      error: null,
    });

    const response = await request(
      createTestApp()
    ).get("/admin");

    expect(response.status).toBe(403);
  });

  it("deve retornar 500 em caso de falha na consulta", async () => {
  // Simula uma falha na consulta ao banco.
  maybeSingleMock.mockResolvedValue({
    data: null,
    error: {
      message: "Falha na consulta",
    },
  });

  const response = await request(createTestApp()).get("/admin");

  // AppError 5xx preservado — o código específico chega ao cliente.
  expect(response.status).toBe(500);
  expect(response.body.error.code).toBe("ROLE_LOOKUP_FAILED");

  // Detalhes internos do banco NÃO vazam.
  expect(JSON.stringify(response.body)).not.toContain("Falha na consulta");
});

  it("não deve confiar no perfil enviado pelo frontend", async () => {
    maybeSingleMock.mockResolvedValue({
      data: {
        role: "CITIZEN",
        is_active: true,
      },
      error: null,
    });

    const response = await request(
      createTestApp()
    )
      .get("/admin?role=ADMIN")
      .set("x-role", "ADMIN");

    expect(response.status).toBe(403);
  });
});
