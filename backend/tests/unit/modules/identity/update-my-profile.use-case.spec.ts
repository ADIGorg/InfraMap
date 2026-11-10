
import { describe, expect, it, vi } from "vitest";

import { UpdateMyProfileUseCase } from "../../../../src/modules/identity/application/use-cases/update-my-profile.use-case.js";

import type {
  AccountProfile,
  UpdateAccountProfileData,
} from "../../../../src/modules/identity/domain/entities/account-profile.entity.js";

import type { UserProfile } from "../../../../src/modules/identity/domain/entities/user-profile.entity.js";

import type { AccountProfileRepository } from "../../../../src/modules/identity/domain/repositories/profile.repository.js";

import type { ProfileReader } from "../../../../src/modules/identity/domain/repositories/identity.repository.js";

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

function createDependencies(options: {
  identity?: UserProfile | null;
  updateResult?: AccountProfile | null;
} = {}) {
  const identity = options.identity === undefined
    ? activeIdentity
    : options.identity;

  const updateResult = options.updateResult === undefined
    ? accountProfile
    : options.updateResult;

  const findIdentity = vi
    .fn<(userId: string) => Promise<UserProfile | null>>()
    .mockResolvedValue(identity);

  const updateProfile = vi
    .fn<(
      userId: string,
      changes: UpdateAccountProfileData
    ) => Promise<AccountProfile | null>>()
    .mockResolvedValue(updateResult);

  const profiles: AccountProfileRepository = {
    findByUserId: vi.fn(),
    updateByUserId: updateProfile,
  };

  const identities: ProfileReader = {
    findByUserId: findIdentity,
  };

  return {
    service: new UpdateMyProfileUseCase(
      profiles,
      identities
    ),
    findIdentity,
    updateProfile,
  };
}

describe("API1-43 - UpdateMyProfileUseCase", () => {
  it("deve atualizar o nome do usuário ativo", async () => {
    const { service, updateProfile } =
      createDependencies();

    await service.execute("user-123", {
      name: "Maria Souza",
    });

    expect(updateProfile).toHaveBeenCalledWith(
      "user-123",
      {
        name: "Maria Souza",
      }
    );
  });

  it("deve permitir atualizar o telefone", async () => {
    const { service, updateProfile } =
      createDependencies();

    await service.execute("user-123", {
      phone: "(75) 98888-8888",
    });

    expect(updateProfile).toHaveBeenCalledWith(
      "user-123",
      {
        phone: "(75) 98888-8888",
      }
    );
  });

  it("deve permitir remover o telefone", async () => {
    const { service, updateProfile } =
      createDependencies();

    await service.execute("user-123", {
      phone: null,
    });

    expect(updateProfile).toHaveBeenCalledWith(
      "user-123",
      {
        phone: null,
      }
    );
  });

  it("não deve encaminhar campos de autorização ao repositório", async () => {
    const { service, updateProfile } =
      createDependencies();

    const maliciousInput = {
      name: "Maria Souza",
      role: "ADMIN",
      admin_level: "MASTER",
      is_active: true,
    };

    await service.execute(
      "user-123",
      maliciousInput
    );

    expect(updateProfile).toHaveBeenCalledWith(
      "user-123",
      {
        name: "Maria Souza",
      }
    );

    const changes = updateProfile.mock.calls[0]?.[1];

    expect(changes).not.toHaveProperty("role");
    expect(changes).not.toHaveProperty("admin_level");
    expect(changes).not.toHaveProperty("is_active");
  });

  it("deve rejeitar usuário não autenticado", async () => {
    const { service, updateProfile } =
      createDependencies();

    await expect(
      service.execute(undefined, {
        name: "Maria Souza",
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "UNAUTHORIZED",
    });

    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("deve rejeitar usuário sem perfil de autorização", async () => {
    const { service, updateProfile } =
      createDependencies({
        identity: null,
      });

    await expect(
      service.execute("user-123", {
        name: "Maria Souza",
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    });

    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("deve bloquear atualização de conta inativa", async () => {
    const { service, updateProfile } =
      createDependencies({
        identity: {
          ...activeIdentity,
          is_active: false,
        },
      });

    await expect(
      service.execute("user-123", {
        name: "Maria Souza",
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    });

    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("deve rejeitar atualização sem campos", async () => {
    const { service, updateProfile } =
      createDependencies();

    await expect(
      service.execute("user-123", {})
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "BAD_REQUEST",
    });

    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("deve rejeitar resultado de atualização de outro usuário", async () => {
    const { service } = createDependencies({
      updateResult: {
        ...accountProfile,
        id: "other-user",
      },
    });

    await expect(
      service.execute("user-123", {
        name: "Maria Souza",
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
    });
  });

  it("deve retornar 404 quando o perfil não for encontrado", async () => {
    const { service } = createDependencies({
      updateResult: null,
    });

    await expect(
      service.execute("user-123", {
        name: "Maria Souza",
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
    });
  });
});
