
import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  DeactivateMyAccountUseCase,
} from "../../../../src/modules/identity/application/use-cases/deactivate-my-account.use-case.js";

import type {
  UserProfile,
} from "../../../../src/modules/identity/domain/entities/user-profile.entity.js";

import type {
  ProfileReader,
} from "../../../../src/modules/identity/domain/repositories/identity.repository.js";

import type {
  AccountDeactivationRepository,
  AccountAuthGateway,
} from "../../../../src/modules/identity/domain/repositories/account-deactivation.repository.js";

// ==========================================
// API1-44 - DADOS SIMULADOS
// ==========================================

const citizen: UserProfile = {
  id: "user-123",
  role: "CITIZEN",
  is_active: true,
};

// ==========================================
// DEPENDÊNCIAS SIMULADAS
// ==========================================

function createDependencies(
  identity: UserProfile | null = citizen
) {
  const findByUserId = vi
    .fn<ProfileReader["findByUserId"]>()
    .mockResolvedValue(identity);

  const deactivateAndAnonymize = vi
    .fn<AccountDeactivationRepository["deactivateAndAnonymize"]>()
    .mockResolvedValue(undefined);

  const markAuthCleanupCompleted = vi
    .fn<AccountDeactivationRepository["markAuthCleanupCompleted"]>()
    .mockResolvedValue(undefined);

  const anonymizeAuthUser = vi
    .fn<AccountAuthGateway["anonymizeAuthUser"]>()
    .mockResolvedValue(undefined);

  const revokeSessions = vi
    .fn<AccountAuthGateway["revokeSessions"]>()
    .mockResolvedValue(undefined);

  const identities: ProfileReader = {
    findByUserId,
  };

  const accounts: AccountDeactivationRepository = {
    deactivateAndAnonymize,
    markAuthCleanupCompleted,
  };

  const auth: AccountAuthGateway = {
    anonymizeAuthUser,
    revokeSessions,
  };

  return {
    service: new DeactivateMyAccountUseCase(
      identities,
      accounts,
      auth
    ),
    findByUserId,
    deactivateAndAnonymize,
    markAuthCleanupCompleted,
    anonymizeAuthUser,
    revokeSessions,
  };
}

// ==========================================
// API1-44 - ID-02
// TESTES DO CASO DE USO
// ==========================================

describe("API1-44 - DeactivateMyAccountUseCase", () => {

  // ========================================
  // 1. DESATIVAÇÃO BEM-SUCEDIDA
  // ========================================

  it("deve desativar a própria conta do cidadão", async () => {
    const deps = createDependencies();

    await deps.service.execute(
      "user-123",
      "token-teste"
    );

    // Verifica a revogação das sessões.
    expect(
      deps.revokeSessions
    ).toHaveBeenCalledWith("token-teste");

    // Verifica a desativação no banco.
    expect(
      deps.deactivateAndAnonymize
    ).toHaveBeenCalledWith(
      "user-123",
      "token-teste"
    );

    // Verifica a anonimização no Auth.
    expect(
      deps.anonymizeAuthUser
    ).toHaveBeenCalledWith("user-123");

    // Verifica a conclusão da limpeza.
    expect(
      deps.markAuthCleanupCompleted
    ).toHaveBeenCalledWith("user-123");

    // Confirma a ordem das operações:
    // 1. Revogar sessões
    // 2. Desativar no banco
    // 3. Anonimizar no Auth
    // 4. Registrar conclusão

    const revokeOrder =
      deps.revokeSessions.mock.invocationCallOrder[0]!;

    const deactivateOrder =
      deps.deactivateAndAnonymize.mock.invocationCallOrder[0]!;

    const anonymizeOrder =
      deps.anonymizeAuthUser.mock.invocationCallOrder[0]!;

    const completeOrder =
      deps.markAuthCleanupCompleted.mock.invocationCallOrder[0]!;

    expect(revokeOrder).toBeLessThan(
      deactivateOrder
    );

    expect(deactivateOrder).toBeLessThan(
      anonymizeOrder
    );

    expect(anonymizeOrder).toBeLessThan(
      completeOrder
    );
  });

  // ========================================
  // 2. AUTENTICAÇÃO OBRIGATÓRIA
  // ========================================

  it("deve exigir autenticação", async () => {
    const deps = createDependencies();

    await expect(
      deps.service.execute(
        undefined,
        undefined
      )
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "UNAUTHORIZED",
    });

    expect(
      deps.revokeSessions
    ).not.toHaveBeenCalled();

    expect(
      deps.deactivateAndAnonymize
    ).not.toHaveBeenCalled();
  });

  // ========================================
  // 3. IDENTIDADE INEXISTENTE
  // ========================================

  it("deve rejeitar usuário sem identidade", async () => {
    const deps = createDependencies(null);

    await expect(
      deps.service.execute(
        "user-123",
        "token-teste"
      )
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    });

    expect(
      deps.revokeSessions
    ).not.toHaveBeenCalled();

    expect(
      deps.deactivateAndAnonymize
    ).not.toHaveBeenCalled();
  });

  // ========================================
  // 4. BLOQUEIO DE ADMINISTRADORES
  // ========================================

  it("não deve desativar administradores", async () => {
    const deps = createDependencies({
      ...citizen,
      role: "ADMIN",
    });

    await expect(
      deps.service.execute(
        "user-123",
        "token-teste"
      )
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    });

    expect(
      deps.revokeSessions
    ).not.toHaveBeenCalled();

    expect(
      deps.deactivateAndAnonymize
    ).not.toHaveBeenCalled();
  });

  // ========================================
  // 5. BLOQUEIO DE CONTAS INATIVAS
  // ========================================

  it("deve bloquear contas inativas", async () => {
    const deps = createDependencies({
      ...citizen,
      is_active: false,
    });

    await expect(
      deps.service.execute(
        "user-123",
        "token-teste"
      )
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    });

    expect(
      deps.revokeSessions
    ).not.toHaveBeenCalled();

    expect(
      deps.deactivateAndAnonymize
    ).not.toHaveBeenCalled();
  });

  // ========================================
  // 6. PROTEÇÃO CONTRA OUTROS USUÁRIOS
  // ========================================

  it("deve rejeitar identidade de outro usuário", async () => {
    const deps = createDependencies({
      ...citizen,
      id: "outro-usuario",
    });

    await expect(
      deps.service.execute(
        "user-123",
        "token-teste"
      )
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    });

    expect(
      deps.revokeSessions
    ).not.toHaveBeenCalled();

    expect(
      deps.deactivateAndAnonymize
    ).not.toHaveBeenCalled();
  });

  // ========================================
  // 7. FALHA NA OPERAÇÃO DO BANCO
  // ========================================

  it("não deve continuar se o banco falhar", async () => {
    const deps = createDependencies();

    deps.deactivateAndAnonymize.mockRejectedValue(
      new Error("Falha simulada no banco")
    );

    await expect(
      deps.service.execute(
        "user-123",
        "token-teste"
      )
    ).rejects.toThrow(
      "Falha simulada no banco"
    );

    // A revogação acontece antes do banco.
    expect(
      deps.revokeSessions
    ).toHaveBeenCalledWith("token-teste");

    expect(
      deps.deactivateAndAnonymize
    ).toHaveBeenCalledWith(
      "user-123",
      "token-teste"
    );

    // Nenhuma limpeza posterior deve ocorrer.
    expect(
      deps.anonymizeAuthUser
    ).not.toHaveBeenCalled();

    expect(
      deps.markAuthCleanupCompleted
    ).not.toHaveBeenCalled();
  });

  // ========================================
  // 8. FALHA NA ANONIMIZAÇÃO DO AUTH
  // ========================================

  it("deve manter pendência se a anonimização Auth falhar", async () => {
    const deps = createDependencies();

    deps.anonymizeAuthUser.mockRejectedValue(
      new Error("Falha simulada no Auth")
    );

    await expect(
      deps.service.execute(
        "user-123",
        "token-teste"
      )
    ).rejects.toMatchObject({
      statusCode: 503,
      code: "ACCOUNT_DEACTIVATED_AUTH_PENDING",
    });

    // As sessões já foram revogadas.
    expect(
      deps.revokeSessions
    ).toHaveBeenCalledWith("token-teste");

    // A conta já foi desativada no banco.
    expect(
      deps.deactivateAndAnonymize
    ).toHaveBeenCalledWith(
      "user-123",
      "token-teste"
    );

    // A anonimização foi tentada.
    expect(
      deps.anonymizeAuthUser
    ).toHaveBeenCalledWith("user-123");

    // Não registra a limpeza como concluída.
    expect(
      deps.markAuthCleanupCompleted
    ).not.toHaveBeenCalled();
  });

  // ========================================
  // 9. FALHA NA REVOGAÇÃO DAS SESSÕES
  // ========================================

  it("não deve desativar a conta se a revogação falhar", async () => {
    const deps = createDependencies();

    deps.revokeSessions.mockRejectedValue(
      new Error("Falha simulada na revogação")
    );

    await expect(
      deps.service.execute(
        "user-123",
        "token-teste"
      )
    ).rejects.toMatchObject({
      statusCode: 503,
      code: "SESSION_REVOCATION_FAILED",
    });

    // A revogação foi tentada.
    expect(
      deps.revokeSessions
    ).toHaveBeenCalledWith("token-teste");

    // O banco não pode ser alterado.
    expect(
      deps.deactivateAndAnonymize
    ).not.toHaveBeenCalled();

    // A anonimização não deve acontecer.
    expect(
      deps.anonymizeAuthUser
    ).not.toHaveBeenCalled();

    // Nenhuma conclusão pode ser registrada.
    expect(
      deps.markAuthCleanupCompleted
    ).not.toHaveBeenCalled();
  });
});
