import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { createProfileReader } from "../../../../src/modules/identity/infrastructure/repositories/supabase-identity.repository.js";

function readerFor(data: unknown, error: unknown = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  const client = { from } as unknown as SupabaseClient;
  return { reader: createProfileReader(client), from, select, eq };
}

describe("SupabaseIdentityRepository admin_level / API1-100", () => {
  it.each(["MASTER", "OPERATIONAL"] as const)(
    "lê %s do próprio papel persistido no banco (não JWT)",
    async (level) => {
      const { reader, from, select, eq } = readerFor({
        user_id: "uid-123", role: "ADMIN", is_active: true, admin_level: level,
      });
      await expect(reader.findByUserId("uid-123")).resolves.toEqual({
        id: "uid-123", role: "ADMIN", is_active: true, admin_level: level,
      });
      expect(from).toHaveBeenCalledWith("user_roles");
      expect(select).toHaveBeenCalledWith("user_id, role, is_active, admin_level");
      expect(eq).toHaveBeenCalledWith("user_id", "uid-123");
    },
  );

  it("não devolve nível administrativo para CITIZEN", async () => {
    const { reader } = readerFor({
      user_id: "uid-123", role: "CITIZEN", is_active: true, admin_level: null,
    });
    await expect(reader.findByUserId("uid-123")).resolves.toEqual({
      id: "uid-123", role: "CITIZEN", is_active: true,
    });
  });

  it.each([null, "SUPERADMIN", undefined])(
    "rejeita ADMIN com nível inválido (%s)",
    async (level) => {
      const { reader } = readerFor({
        user_id: "uid-123", role: "ADMIN", is_active: true, admin_level: level,
      });
      await expect(reader.findByUserId("uid-123")).rejects.toMatchObject({
        statusCode: 500, code: "INVALID_ADMIN_LEVEL_DATA",
      });
    },
  );

  it("rejeita nível administrativo anexado a CITIZEN", async () => {
    const { reader } = readerFor({
      user_id: "uid-123", role: "CITIZEN", is_active: true, admin_level: "MASTER",
    });
    await expect(reader.findByUserId("uid-123")).rejects.toMatchObject({
      statusCode: 500, code: "INVALID_ADMIN_LEVEL_DATA",
    });
  });

  it("não cria identidade quando a linha não é visível", async () => {
    const { reader } = readerFor(null);
    await expect(reader.findByUserId("uid-123")).resolves.toBeNull();
  });

  it("rejeita erro de leitura sem revelar dados internos", async () => {
    const { reader } = readerFor(null, { code: "42501", message: "private" });
    await expect(reader.findByUserId("uid-123")).rejects.toMatchObject({
      statusCode: 500, code: "IDENTITY_ROLE_QUERY_FAILED",
    });
  });
});
