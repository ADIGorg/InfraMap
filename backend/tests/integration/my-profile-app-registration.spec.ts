import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { SupabaseClient } from "@supabase/supabase-js";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  roleLookup: vi.fn(),
  profileLookup: vi.fn(),
  profileUpdate: vi.fn(),
}));

vi.mock("../../src/infrastructure/supabase/auth-client.js", () => ({
  supabaseAuth: { auth: { getUser: mocks.getUser } },
}));

vi.mock("../../src/infrastructure/supabase/user-client.factory.js", () => ({
  createUserSupabaseClient: () => ({
    from: (name: string) => {
      if (name === "user_roles") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: mocks.roleLookup }),
          }),
        };
      }
      if (name === "profiles") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: mocks.profileLookup }),
          }),
          update: () => ({
            eq: () => ({
              select: () => ({ maybeSingle: mocks.profileUpdate }),
            }),
          }),
        };
      }
      throw new Error("Tabela não esperada no teste.");
    },
  }),
}));

import { createApp } from "../../src/app.js";

const userId = "018c83fd-a0c0-4807-980c-b5eb28014de6";
const profile = {
  id: userId,
  name: "Maria Silva",
  phone: null,
  created_at: "2026-11-01T10:00:00Z",
  updated_at: "2026-11-01T10:00:00Z",
};

describe("registro real das rotas de perfil em createApp", () => {
  const app = createApp({ adminClient: {} as SupabaseClient });

  it("GET /identity/me retorna perfil cadastral, não apenas ID/email", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: userId, email: "maria@example.com" } },
      error: null,
    });
    mocks.roleLookup.mockResolvedValue({
      data: { user_id: userId, role: "CITIZEN", is_active: true },
      error: null,
    });
    mocks.profileLookup.mockResolvedValue({ data: profile, error: null });

    const response = await request(app)
      .get("/api/v1/identity/me")
      .set("Authorization", "Bearer token-de-teste");
    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe("Maria Silva");
    expect(response.body.data.email).toBe("maria@example.com");
  });

  it("PATCH /identity/me está efetivamente montado", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: userId, email: "maria@example.com" } },
      error: null,
    });
    mocks.roleLookup.mockResolvedValue({
      data: { user_id: userId, role: "CITIZEN", is_active: true },
      error: null,
    });
    mocks.profileUpdate.mockResolvedValue({
      data: { ...profile, name: "Maria Souza" }, error: null,
    });

    const response = await request(app)
      .patch("/api/v1/identity/me")
      .set("Authorization", "Bearer token-de-teste")
      .send({ name: "Maria Souza" });
    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe("Maria Souza");
  });
});
