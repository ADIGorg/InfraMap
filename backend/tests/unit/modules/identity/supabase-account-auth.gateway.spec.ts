
import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  SupabaseAccountAuthGateway,
} from "../../../../src/modules/identity/infrastructure/supabase-account-auth.gateway.js";

const USER_ID =
  "11111111-1111-4111-8111-111111111111";

function createGateway() {
  const signOut = vi.fn().mockResolvedValue({
    error: null,
  });

  const updateUserById = vi.fn().mockResolvedValue({
    data: {
      user: {
        id: USER_ID,
      },
    },
    error: null,
  });

  const adminClient = {
    auth: {
      admin: {
        signOut,
        updateUserById,
      },
    },
  } as unknown as SupabaseClient;

  return {
    gateway: new SupabaseAccountAuthGateway(
      adminClient
    ),
    signOut,
    updateUserById,
  };
}

describe("API1-44 - SupabaseAccountAuthGateway", () => {
  it("deve revogar todas as sessões", async () => {
    const deps = createGateway();

    await deps.gateway.revokeSessions(
      "token-teste"
    );

    expect(deps.signOut).toHaveBeenCalledWith(
      "token-teste",
      "global"
    );
  });

  it("deve anonimizar e bloquear o usuário", async () => {
    const deps = createGateway();

    await deps.gateway.anonymizeAuthUser(
      USER_ID
    );

    expect(
      deps.updateUserById
    ).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({
        email:
          `deleted+${USER_ID}@example.invalid`,
        phone: "",
        ban_duration: "876000h",

        user_metadata: expect.objectContaining({
          name: "Usuário excluído",
          phone: null,
        }),
      })
    );
  });

  it("deve propagar falha de revogação", async () => {
    const deps = createGateway();

    deps.signOut.mockResolvedValue({
      error: new Error("Falha simulada"),
    });

    await expect(
      deps.gateway.revokeSessions(
        "token-teste"
      )
    ).rejects.toThrow(
      "Não foi possível revogar as sessões"
    );
  });

  it("deve propagar falha de anonimização", async () => {
    const deps = createGateway();

    deps.updateUserById.mockResolvedValue({
      data: {
        user: null,
      },
      error: new Error("Falha simulada"),
    });

    await expect(
      deps.gateway.anonymizeAuthUser(USER_ID)
    ).rejects.toThrow(
      "Não foi possível anonimizar"
    );
  });
});
