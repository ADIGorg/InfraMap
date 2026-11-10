
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  createAccountProfileRepository,
} from "../../../../src/modules/identity/infrastructure/repositories/supabase-account-profile.repository.js";

import type {
  AccountProfile,
} from "../../../../src/modules/identity/domain/entities/account-profile.entity.js";

// ==========================================
// DADOS SIMULADOS
// ==========================================

const accountProfile: AccountProfile = {
  id: "user-123",
  name: "Maria Silva",
  phone: "(75) 99999-9999",
  created_at: "2026-11-01T10:00:00Z",
  updated_at: "2026-11-01T10:00:00Z",
};

type MockQueryResult = {
  data: AccountProfile | null;
  error: { message: string } | null;
};

// ==========================================
// MOCK DA CONSULTA SELECT
// ==========================================

function createReadClient(
  result: MockQueryResult
) {
  const maybeSingle = vi.fn().mockResolvedValue(
    result
  );

  const eq = vi.fn().mockReturnValue({
    maybeSingle,
  });

  const select = vi.fn().mockReturnValue({
    eq,
  });

  const from = vi.fn().mockReturnValue({
    select,
  });

  const client = {
    from,
  } as unknown as SupabaseClient;

  return {
    client,
    from,
    select,
    eq,
    maybeSingle,
  };
}

// ==========================================
// MOCK DA CONSULTA UPDATE
// ==========================================

function createUpdateClient(
  result: MockQueryResult
) {
  const maybeSingle = vi.fn().mockResolvedValue(
    result
  );

  const select = vi.fn().mockReturnValue({
    maybeSingle,
  });

  const eq = vi.fn().mockReturnValue({
    select,
  });

  const update = vi.fn().mockReturnValue({
    eq,
  });

  const from = vi.fn().mockReturnValue({
    update,
  });

  const client = {
    from,
  } as unknown as SupabaseClient;

  return {
    client,
    from,
    update,
    eq,
    select,
    maybeSingle,
  };
}

// ==========================================
// TESTES DE CONSULTA
// ==========================================

describe("API1-43 - SupabaseAccountProfileRepository - Consulta", () => {
  it("deve consultar somente o perfil do usuário informado", async () => {
    const {
      client,
      from,
      select,
      eq,
    } = createReadClient({
      data: accountProfile,
      error: null,
    });

    const repository =
      createAccountProfileRepository(client);

    const result =
      await repository.findByUserId("user-123");

    expect(from).toHaveBeenCalledWith(
      "profiles"
    );

    expect(select).toHaveBeenCalledWith(
      "id, name, phone, created_at, updated_at"
    );

    expect(eq).toHaveBeenCalledWith(
      "id",
      "user-123"
    );

    expect(result).toEqual(accountProfile);
  });

  it("deve retornar null quando o perfil não existir", async () => {
    const { client } = createReadClient({
      data: null,
      error: null,
    });

    const repository =
      createAccountProfileRepository(client);

    const result =
      await repository.findByUserId("user-123");

    expect(result).toBeNull();
  });

  it("deve tratar erro na consulta ao Supabase", async () => {
    const { client } = createReadClient({
      data: null,
      error: {
        message: "Erro de consulta simulado",
      },
    });

    const repository =
      createAccountProfileRepository(client);

    await expect(
      repository.findByUserId("user-123")
    ).rejects.toMatchObject({
      statusCode: 500,
      code: "PROFILE_QUERY_FAILED",
    });
  });
});

// ==========================================
// TESTES DE ATUALIZAÇÃO
// ==========================================

describe("API1-43 - SupabaseAccountProfileRepository - Atualização", () => {
  it("deve atualizar somente o nome permitido", async () => {
    const updatedProfile: AccountProfile = {
      ...accountProfile,
      name: "Maria Souza",
    };

    const {
      client,
      from,
      update,
      eq,
      select,
    } = createUpdateClient({
      data: updatedProfile,
      error: null,
    });

    const repository =
      createAccountProfileRepository(client);

    const result =
      await repository.updateByUserId(
        "user-123",
        {
          name: "Maria Souza",
        }
      );

    expect(from).toHaveBeenCalledWith(
      "profiles"
    );

    expect(update).toHaveBeenCalledWith({
      name: "Maria Souza",
    });

    expect(eq).toHaveBeenCalledWith(
      "id",
      "user-123"
    );

    expect(select).toHaveBeenCalledWith(
      "id, name, phone, created_at, updated_at"
    );

    expect(result).toEqual(updatedProfile);
  });

  it("deve permitir remover o telefone", async () => {
    const { client, update } =
      createUpdateClient({
        data: {
          ...accountProfile,
          phone: null,
        },
        error: null,
      });

    const repository =
      createAccountProfileRepository(client);

    await repository.updateByUserId(
      "user-123",
      {
        phone: null,
      }
    );

    expect(update).toHaveBeenCalledWith({
      phone: null,
    });
  });

  it("não deve enviar campos administrativos ao Supabase", async () => {
    const { client, update } =
      createUpdateClient({
        data: {
          ...accountProfile,
          name: "Maria Souza",
        },
        error: null,
      });

    const repository =
      createAccountProfileRepository(client);

    // Simula um objeto com campos adicionais.
    const maliciousInput = {
      name: "Maria Souza",
      role: "ADMIN",
      admin_level: "MASTER",
      is_active: true,
    };

    await repository.updateByUserId(
      "user-123",
      maliciousInput
    );

    expect(update).toHaveBeenCalledWith({
      name: "Maria Souza",
    });

    const changes = update.mock.calls[0]?.[0];

    expect(changes).not.toHaveProperty("role");
    expect(changes).not.toHaveProperty("admin_level");
    expect(changes).not.toHaveProperty("is_active");
  });

  it("deve retornar null quando a atualização não encontrar o perfil", async () => {
    const { client } = createUpdateClient({
      data: null,
      error: null,
    });

    const repository =
      createAccountProfileRepository(client);

    const result =
      await repository.updateByUserId(
        "user-123",
        {
          name: "Maria Souza",
        }
      );

    expect(result).toBeNull();
  });

  it("deve tratar erro na atualização do Supabase", async () => {
    const { client } = createUpdateClient({
      data: null,
      error: {
        message: "Erro de atualização simulado",
      },
    });

    const repository =
      createAccountProfileRepository(client);

    await expect(
      repository.updateByUserId(
        "user-123",
        {
          name: "Maria Souza",
        }
      )
    ).rejects.toMatchObject({
      statusCode: 500,
      code: "PROFILE_UPDATE_FAILED",
    });
  });
});
