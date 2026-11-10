
import express, { type RequestHandler } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";


import {
  createIdentityRoutes,
} from "../../src/modules/identity/presentation/identity.routes.js";

import type {
  IdentityRole,
  UserProfile,
} from "../../src/modules/identity/domain/entities/user-profile.entity.js";

import type {
  ProfileReader,
} from "../../src/modules/identity/domain/repositories/identity.repository.js";


import {
  ForbiddenError,
  UnauthorizedError,
} from "../../src/shared/errors/app-error.js";

import { errorHandler } from "../../src/shared/middlewares/error-handler.js";

// ==========================================
// DADOS SIMULADOS PARA OS TESTES
// ==========================================

const profiles = new Map<string, UserProfile>([
  [
    "citizen-1",
    {
      id: "citizen-1",
      role: "CITIZEN",
      is_active: true,
    },
  ],
  [
    "admin-1",
    {
      id: "admin-1",
      role: "ADMIN",
      is_active: true,
    },
  ],
  [
    "inactive-1",
    {
      id: "inactive-1",
      role: "CITIZEN",
      is_active: false,
    },
  ],
]);

const tokens: Record<string, string> = {
  "test-citizen": "citizen-1",
  "test-admin": "admin-1",
  "test-inactive": "inactive-1",
};

// Simula a consulta de perfis ao banco.
const profileReader: ProfileReader = {
  async findByUserId(userId: string) {
    return profiles.get(userId) ?? null;
  },
};

// ==========================================
// MIDDLEWARE SIMULADO DE AUTENTICAÇÃO
// APENAS PARA TESTES
// ==========================================

const mockAuthenticate: RequestHandler = (
  req,
  res,
  next
) => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return next(new UnauthorizedError());
  }

  const token = authorization.slice(7);
  const userId = tokens[token];

  if (!userId) {
    return next(new UnauthorizedError());
  }

  res.locals.userId = userId;
  next();
};

// ==========================================
// MIDDLEWARE SIMULADO DE AUTORIZAÇÃO
// APENAS PARA TESTES
// ==========================================

function mockAuthorizeRole(
  requiredRole: IdentityRole
): RequestHandler {
  return (_req, res, next) => {
    const userId = res.locals.userId as string;
    const profile = profiles.get(userId);

    if (
      !profile ||
      !profile.is_active ||
      profile.role !== requiredRole
    ) {
      return next(new ForbiddenError());
    }

    next();
  };
}

// ==========================================
// APLICAÇÃO EXPRESS PARA TESTES
// ==========================================

function createTestApp() {
  const app = express();

  app.use(
    "/api/v1",
    createIdentityRoutes({
      authenticate: mockAuthenticate,
      authorizeRole: mockAuthorizeRole,

      resolveContext: (_req, res) => ({
        userId: res.locals.userId as string,
        profiles: profileReader,
      }),
    })
  );

  app.use(errorHandler);

  return app;
}

// ==========================================
// TESTES DA API1-13
// ==========================================

describe("API1-13 - Endpoints de identidade", () => {
  const app = createTestApp();

  it("deve permitir cidadão em /app/me", async () => {
    const response = await request(app)
      .get("/api/v1/app/me")
      .set("Authorization", "Bearer test-citizen");

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      id: "citizen-1",
      role: "CITIZEN",
      is_active: true,
    });
  });

  it("deve permitir administrador em /admin/me", async () => {
    const response = await request(app)
      .get("/api/v1/admin/me")
      .set("Authorization", "Bearer test-admin");

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      id: "admin-1",
      role: "ADMIN",
      is_active: true,
    });
  });

  it("deve bloquear cidadão na rota administrativa", async () => {
    const response = await request(app)
      .get("/api/v1/admin/me")
      .set("Authorization", "Bearer test-citizen");

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("deve bloquear requisição sem autenticação", async () => {
    const response = await request(app)
      .get("/api/v1/app/me");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("deve rejeitar token de teste desconhecido", async () => {
    const response = await request(app)
      .get("/api/v1/app/me")
      .set("Authorization", "Bearer invalid-test-token");

    expect(response.status).toBe(401);
  });

  it("deve impedir acesso de conta inativa", async () => {
    const response = await request(app)
      .get("/api/v1/app/me")
      .set("Authorization", "Bearer test-inactive");

    expect(response.status).toBe(403);
  });
});
