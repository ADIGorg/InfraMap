
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  updateProfileBodySchema,
} from "../../../../src/modules/identity/presentation/update-profile.schema.js";

describe("API1-43 - Validação de atualização do perfil", () => {
  it("deve permitir nome e telefone válidos", () => {
    const result = updateProfileBodySchema.safeParse({
      name: "Maria Silva",
      phone: "(75) 99999-9999",
    });

    expect(result.success).toBe(true);
  });

  it("deve permitir remover o telefone", () => {
    const result = updateProfileBodySchema.safeParse({
      phone: null,
    });

    expect(result.success).toBe(true);
  });

  it("deve rejeitar nome muito curto", () => {
    const result = updateProfileBodySchema.safeParse({
      name: "Ma",
    });

    expect(result.success).toBe(false);
  });

  it("deve rejeitar telefone inválido", () => {
    const result = updateProfileBodySchema.safeParse({
      phone: "telefone-invalido",
    });

    expect(result.success).toBe(false);
  });

  it("deve rejeitar alteração de permissões", () => {
    const result = updateProfileBodySchema.safeParse({
      name: "Maria Silva",
      role: "ADMIN",
      admin_level: "MASTER",
      is_active: true,
    });

    expect(result.success).toBe(false);
  });

  it("deve rejeitar alteração do ID e e-mail", () => {
    const result = updateProfileBodySchema.safeParse({
      id: "outro-usuario",
      email: "outro@example.com",
    });

    expect(result.success).toBe(false);
  });

  it("deve rejeitar atualização vazia", () => {
    const result = updateProfileBodySchema.safeParse({});

    expect(result.success).toBe(false);
  });
});
