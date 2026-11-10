
import express, {
  type RequestHandler,
} from "express";

import request from "supertest";

import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  createMyProfileRoutes,
} from "../../src/modules/identity/presentation/my-profile.routes.js";

import type {
  AccountProfile,
} from "../../src/modules/identity/domain/entities/account-profile.entity.js";

import type {
  UserProfile,
} from "../../src/modules/identity/domain/entities/user-profile.entity.js";

import type {
  AccountProfileRepository,
} from "../../src/modules/identity/domain/repositories/profile.repository.js";

import type {
  ProfileReader,
} from "../../src/modules/identity/domain/repositories/identity.repository.js";

import {
  errorHandler,
} from "../../src/shared/middlewares/error-handler.js";

const PROFILE_URL = "/api/v1/identity/me";

const AUTH_HEADER = "Bearer test-token";

const activeIdentity: UserProfile = {
  id: "user-123",
  role: "CITIZEN",
  is_active: true,
};

const accountProfile: AccountProfile = {
  id: "user-123",
  name: "Maria Silva",
  phone: "(75) 99999-9999",
  created_at: "2026-11-01T10:00:00Z",
  updated_at: "2026-11-01T10:00:00Z",
};

interface TestOptions {
  identity?: UserProfile | null;
  profile?: AccountProfile | null;
  updatedProfile?: AccountProfile | null;
}

/**
 * Cria uma aplicação Express isolada para
 * testar os endpoints de gerenciamento de perfil.
 *
 * Os repositórios são simulados, sem acesso
 * ao banco de dados real.
 */
function createTestApp(
  options: TestOptions = {}
) {
  const identity =
    options.identity === undefined
      ? activeIdentity
      : options.identity;

  const profile =
    options.profile === undefined
      ? accountProfile
      : options.profile;

  const updatedProfile =
    options.updatedProfile === undefined
      ? accountProfile
      : options.updatedProfile;

  const findIdentity = vi
    .fn<ProfileReader["findByUserId"]>()
    .mockResolvedValue(identity);

  const findProfile = vi
    .fn<AccountProfileRepository["findByUserId"]>()
    .mockResolvedValue(profile);

  const updateProfile = vi
    .fn<AccountProfileRepository["updateByUserId"]>()
    .mockResolvedValue(updatedProfile);

  const identities: ProfileReader = {
    findByUserId: findIdentity,
  };

  const accountProfiles: AccountProfileRepository = {
    findByUserId: findProfile,
    updateByUserId: updateProfile,
  };

  // Simulação da autenticação.
  // A validação real do JWT já é coberta
  // pelos testes específicos do middleware.
  const authenticate: RequestHandler = (
    req,
    res,
    next
  ) => {
    if (
      req.headers.authorization !== AUTH_HEADER
    ) {
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Autenticação necessária.",
        },
      });

      return;
    }

    next();
  };

  const app = express();

  app.use(express.json());

  app.use(
    "/api/v1/identity",
    createMyProfileRoutes({
      authenticate,

      resolveContext: () => ({
        userId: "user-123",
        email: "maria@example.com",
        accountProfiles,
        identities,
      }),
    })
  );

  app.use(errorHandler);

  return {
    app,
    findIdentity,
    findProfile,
    updateProfile,
  };
}

// ==========================================
// GET /identity/me
// ==========================================

describe("API1-43 - GET /identity/me", () => {
  it("deve retornar os dados do usuário ativo", async () => {
    const {
      app,
      findIdentity,
      findProfile,
    } = createTestApp();

    const response = await request(app)
      .get(PROFILE_URL)
      .set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      message: "Usuário autenticado.",
      data: {
        ...accountProfile,
        email: "maria@example.com",
      },
    });

    expect(findIdentity).toHaveBeenCalledWith(
      "user-123"
    );

    expect(findProfile).toHaveBeenCalledWith(
      "user-123"
    );
  });

  it("deve retornar 401 sem autenticação", async () => {
    const { app, findProfile } =
      createTestApp();

    const response = await request(app)
      .get(PROFILE_URL);

    expect(response.status).toBe(401);

    expect(response.body.error.code).toBe(
      "UNAUTHORIZED"
    );

    expect(findProfile).not.toHaveBeenCalled();
  });

  it("deve rejeitar um token de teste inválido", async () => {
    const { app, findProfile } =
      createTestApp();

    const response = await request(app)
      .get(PROFILE_URL)
      .set(
        "Authorization",
        "Bearer token-invalido"
      );

    expect(response.status).toBe(401);

    expect(findProfile).not.toHaveBeenCalled();
  });

  it("deve bloquear conta inativa", async () => {
    const {
      app,
      findProfile,
    } = createTestApp({
      identity: {
        ...activeIdentity,
        is_active: false,
      },
    });

    const response = await request(app)
      .get(PROFILE_URL)
      .set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(403);

    expect(response.body.error.code).toBe(
      "FORBIDDEN"
    );

    expect(findProfile).not.toHaveBeenCalled();
  });

  it("deve rejeitar identidade de outro usuário", async () => {
    const { app } = createTestApp({
      identity: {
        ...activeIdentity,
        id: "other-user",
      },
    });

    const response = await request(app)
      .get(PROFILE_URL)
      .set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(403);
  });

  it("deve retornar 404 quando o perfil não existir", async () => {
    const { app } = createTestApp({
      profile: null,
    });

    const response = await request(app)
      .get(PROFILE_URL)
      .set("Authorization", AUTH_HEADER);

    expect(response.status).toBe(404);

    expect(response.body.error.code).toBe(
      "NOT_FOUND"
    );
  });
});

// ==========================================
// PATCH /identity/me
// ==========================================

describe("API1-43 - PATCH /identity/me", () => {
  it("deve atualizar nome e telefone", async () => {
    const updatedProfile: AccountProfile = {
      ...accountProfile,
      name: "Maria Souza",
      phone: "(75) 98888-8888",
    };

    const {
      app,
      updateProfile,
    } = createTestApp({
      updatedProfile,
    });

    const response = await request(app)
      .patch(PROFILE_URL)
      .set("Authorization", AUTH_HEADER)
      .send({
        name: "Maria Souza",
        phone: "(75) 98888-8888",
      });

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      message: "Perfil atualizado com sucesso.",
      data: {
        ...updatedProfile,
        email: "maria@example.com",
      },
    });

    expect(updateProfile).toHaveBeenCalledWith(
      "user-123",
      {
        name: "Maria Souza",
        phone: "(75) 98888-8888",
      }
    );
  });

  it("deve permitir remover o telefone", async () => {
    const {
      app,
      updateProfile,
    } = createTestApp({
      updatedProfile: {
        ...accountProfile,
        phone: null,
      },
    });

    const response = await request(app)
      .patch(PROFILE_URL)
      .set("Authorization", AUTH_HEADER)
      .send({
        phone: null,
      });

    expect(response.status).toBe(200);

    expect(updateProfile).toHaveBeenCalledWith(
      "user-123",
      {
        phone: null,
      }
    );
  });

  it("deve rejeitar nome inválido", async () => {
    const {
      app,
      updateProfile,
    } = createTestApp();

    const response = await request(app)
      .patch(PROFILE_URL)
      .set("Authorization", AUTH_HEADER)
      .send({
        name: "Ma",
      });

    expect(response.status).toBe(400);

    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("deve rejeitar telefone inválido", async () => {
    const {
      app,
      updateProfile,
    } = createTestApp();

    const response = await request(app)
      .patch(PROFILE_URL)
      .set("Authorization", AUTH_HEADER)
      .send({
        phone: "telefone-invalido",
      });

    expect(response.status).toBe(400);

    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("deve rejeitar alterações de permissões", async () => {
    const {
      app,
      updateProfile,
    } = createTestApp();

    const response = await request(app)
      .patch(PROFILE_URL)
      .set("Authorization", AUTH_HEADER)
      .send({
        name: "Maria Souza",
        role: "ADMIN",
        admin_level: "MASTER",
        is_active: true,
      });

    expect(response.status).toBe(400);

    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("deve rejeitar atualização vazia", async () => {
    const {
      app,
      updateProfile,
    } = createTestApp();

    const response = await request(app)
      .patch(PROFILE_URL)
      .set("Authorization", AUTH_HEADER)
      .send({});

    expect(response.status).toBe(400);

    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("deve bloquear atualização de conta inativa", async () => {
    const {
      app,
      updateProfile,
    } = createTestApp({
      identity: {
        ...activeIdentity,
        is_active: false,
      },
    });

    const response = await request(app)
      .patch(PROFILE_URL)
      .set("Authorization", AUTH_HEADER)
      .send({
        name: "Maria Souza",
      });

    expect(response.status).toBe(403);

    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("deve exigir autenticação para atualizar", async () => {
    const {
      app,
      updateProfile,
    } = createTestApp();

    const response = await request(app)
      .patch(PROFILE_URL)
      .send({
        name: "Maria Souza",
      });

    expect(response.status).toBe(401);

    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("deve retornar 404 quando o perfil não existir", async () => {
    const {
      app,
    } = createTestApp({
      updatedProfile: null,
    });

    const response = await request(app)
      .patch(PROFILE_URL)
      .set("Authorization", AUTH_HEADER)
      .send({
        name: "Maria Souza",
      });

    expect(response.status).toBe(404);

    expect(response.body.error.code).toBe(
      "NOT_FOUND"
    );
  });

  it("não deve expor erros internos do banco", async () => {
    const {
      app,
      updateProfile,
    } = createTestApp();

    updateProfile.mockRejectedValue(
      new Error("informacao-interna-do-banco")
    );

    const response = await request(app)
      .patch(PROFILE_URL)
      .set("Authorization", AUTH_HEADER)
      .send({
        name: "Maria Souza",
      });

    expect(response.status).toBe(500);

    expect(response.body.error.code).toBe(
      "INTERNAL_SERVER_ERROR"
    );

    expect(response.text).not.toContain(
      "informacao-interna-do-banco"
    );
  });
});
