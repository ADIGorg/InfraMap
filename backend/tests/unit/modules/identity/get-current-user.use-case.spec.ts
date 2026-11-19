
import {
  describe,
  expect,
  it,
  vi,
} from "vitest";



import {
  GetCurrentUserUseCase,
} from "../../../../src/modules/identity/application/use-cases/get-current-user.use-case.js";

import type {
  UserProfile,
} from "../../../../src/modules/identity/domain/entities/user-profile.entity.js";

import type {
  ProfileReader,
} from "../../../../src/modules/identity/domain/repositories/identity.repository.js";



function createRepository(
  profile: UserProfile | null
): ProfileReader {
  return {
    findByUserId: vi.fn().mockResolvedValue(profile),
  };
}

describe("API1-13 - Identificação do usuário", () => {

  it("deve identificar um cidadão ativo", async () => {
    const repository = createRepository({
      id: "user-123",
      role: "CITIZEN",
      is_active: true,
    });

    const service = new GetCurrentUserUseCase(repository);

    const identity = await service.execute(
      "user-123",
      "CITIZEN"
    );

    expect(identity).toEqual({
      id: "user-123",
      role: "CITIZEN",
      is_active: true,
    });
  });

  it("deve identificar um administrador ativo", async () => {
    const repository = createRepository({
      id: "admin-123",
      role: "ADMIN",
      is_active: true,
      admin_level: "MASTER",
    });

    const service = new GetCurrentUserUseCase(repository);

    const identity = await service.execute(
      "admin-123",
      "ADMIN"
    );

    expect(identity.role).toBe("ADMIN");
    expect(identity.is_active).toBe(true);
    expect(identity).toHaveProperty("admin_level", "MASTER");
  });

  it("deve retornar OPERATIONAL do banco em /admin/me", async () => {
    const service = new GetCurrentUserUseCase(createRepository({
      id: "op-123", role: "ADMIN", is_active: true,
      admin_level: "OPERATIONAL",
    }));
    await expect(service.execute("op-123", "ADMIN")).resolves.toEqual({
      id: "op-123", role: "ADMIN", is_active: true,
      admin_level: "OPERATIONAL",
    });
  });

  it("deve negar ADMIN sem nível confiável (fail-closed)", async () => {
    const service = new GetCurrentUserUseCase(createRepository({
      id: "admin-123", role: "ADMIN", is_active: true,
      admin_level: null,
    }));
    await expect(service.execute("admin-123", "ADMIN"))
      .rejects.toMatchObject({ statusCode: 403, code: "FORBIDDEN" });
  });

  it("deve negar ADMIN inativo mesmo que tenha nível MASTER", async () => {
    const service = new GetCurrentUserUseCase(createRepository({
      id: "admin-123", role: "ADMIN", is_active: false,
      admin_level: "MASTER",
    }));
    await expect(service.execute("admin-123", "ADMIN"))
      .rejects.toMatchObject({ statusCode: 403, code: "FORBIDDEN" });
  });

  it("deve impedir cidadão no contexto administrativo", async () => {
    const repository = createRepository({
      id: "user-123",
      role: "CITIZEN",
      is_active: true,
    });

    const service = new GetCurrentUserUseCase(repository);

    await expect(
      service.execute("user-123", "ADMIN")
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    });
  });

  it("deve impedir acesso de conta inativa", async () => {
    const repository = createRepository({
      id: "user-123",
      role: "CITIZEN",
      is_active: false,
    });

    const service = new GetCurrentUserUseCase(repository);

    await expect(
      service.execute("user-123", "CITIZEN")
    ).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("deve rejeitar identidade ausente", async () => {
    const repository = createRepository(null);
    const service = new GetCurrentUserUseCase(repository);

    await expect(
      service.execute(undefined, "CITIZEN")
    ).rejects.toMatchObject({
      statusCode: 401,
    });

    expect(repository.findByUserId)
      .not.toHaveBeenCalled();
  });

  it("não deve aceitar perfil pertencente a outro usuário", async () => {
    const repository = createRepository({
      id: "outro-usuario",
      role: "CITIZEN",
      is_active: true,
    });

    const service = new GetCurrentUserUseCase(repository);

    await expect(
      service.execute("user-123", "CITIZEN")
    ).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("deve rejeitar usuário sem perfil cadastrado", async () => {
    const repository = createRepository(null);

    const useCase = new GetCurrentUserUseCase(repository);

    await expect(
      useCase.execute("user-123", "CITIZEN")
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    });

    expect(repository.findByUserId).toHaveBeenCalledWith(
      "user-123"
    );
  });

  it("deve propagar falha do repositório", async () => {
    const repository: ProfileReader = {
      findByUserId: vi.fn().mockRejectedValue(
        new Error("Falha simulada no repositório")
      ),
    };

    const useCase = new GetCurrentUserUseCase(repository);

    await expect(
      useCase.execute("user-123", "CITIZEN")
    ).rejects.toThrow("Falha simulada no repositório");
  });


});
