
import { describe, expect, it, vi } from "vitest";

import { GetMyProfileUseCase } from "../../../../src/modules/identity/application/use-cases/get-my-profile.use-case.js";

import type { AccountProfile } from "../../../../src/modules/identity/domain/entities/account-profile.entity.js";

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

function createDependencies(
  identity: UserProfile | null = activeIdentity,
  profile: AccountProfile | null = accountProfile
) {
  const findIdentity = vi
    .fn<(userId: string) => Promise<UserProfile | null>>()
    .mockResolvedValue(identity);

  const findProfile = vi
    .fn<(userId: string) => Promise<AccountProfile | null>>()
    .mockResolvedValue(profile);

  const profiles: AccountProfileRepository = {
    findByUserId: findProfile,
    updateByUserId: vi.fn(),
  };

  const identities: ProfileReader = {
    findByUserId: findIdentity,
  };

  return {
    service: new GetMyProfileUseCase(
      profiles,
      identities
    ),
    findIdentity,
    findProfile,
  };
}

describe("API1-43 - GetMyProfileUseCase", () => {
  it("deve consultar o perfil do usuário ativo", async () => {
    const {
      service,
      findIdentity,
      findProfile,
    } = createDependencies();

    const result = await service.execute("user-123");

    expect(result).toEqual(accountProfile);

    expect(findIdentity).toHaveBeenCalledWith(
      "user-123"
    );

    expect(findProfile).toHaveBeenCalledWith(
      "user-123"
    );
  });

  it("deve rejeitar usuário não autenticado", async () => {
    const { service, findIdentity } =
      createDependencies();

    await expect(
      service.execute(undefined)
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "UNAUTHORIZED",
    });

    expect(findIdentity).not.toHaveBeenCalled();
  });

  it("deve rejeitar usuário sem perfil de autorização", async () => {
    const { service, findProfile } =
      createDependencies(null);

    await expect(
      service.execute("user-123")
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    });

    expect(findProfile).not.toHaveBeenCalled();
  });

  it("deve bloquear conta inativa", async () => {
    const inactiveIdentity: UserProfile = {
      ...activeIdentity,
      is_active: false,
    };

    const { service, findProfile } =
      createDependencies(inactiveIdentity);

    await expect(
      service.execute("user-123")
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    });

    expect(findProfile).not.toHaveBeenCalled();
  });

  it("deve rejeitar identidade de outro usuário", async () => {
    const otherIdentity: UserProfile = {
      ...activeIdentity,
      id: "other-user",
    };

    const { service, findProfile } =
      createDependencies(otherIdentity);

    await expect(
      service.execute("user-123")
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    });

    expect(findProfile).not.toHaveBeenCalled();
  });

  it("deve retornar 404 quando o perfil não existir", async () => {
    const { service } = createDependencies(
      activeIdentity,
      null
    );

    await expect(
      service.execute("user-123")
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
    });
  });

  it("não deve retornar dados cadastrais de outro usuário", async () => {
    const otherProfile: AccountProfile = {
      ...accountProfile,
      id: "other-user",
    };

    const { service } = createDependencies(
      activeIdentity,
      otherProfile
    );

    await expect(
      service.execute("user-123")
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
    });
  });
});
