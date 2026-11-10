
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
  createCategoriesRepository,
} from "../../../../src/modules/categories/categories.repository.js";

describe("CAT-01 - Repositório de categorias", () => {
  it("deve filtrar categorias ativas e ordenar pelo código", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: "1",
          code: "CAT01",
          name: "Saneamento e Drenagem",
          description: null,
        },
      ],
      error: null,
    });

    const eq = vi.fn().mockReturnValue({
      order,
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

    const repository = createCategoriesRepository(client);

    const categories = await repository.listActive();

    expect(from).toHaveBeenCalledWith("categories");

    expect(select).toHaveBeenCalledWith(
      "id, code, name, description"
    );

    expect(eq).toHaveBeenCalledWith(
      "is_active",
      true
    );

    expect(order).toHaveBeenCalledWith(
      "code",
      { ascending: true }
    );

    expect(categories).toEqual([
      {
        id: "1",
        code: "CAT01",
        name: "Saneamento e Drenagem",
        description: null,
      },
    ]);
  });

  it("deve lançar erro quando a consulta ao Supabase falhar", async () => {
    const order = vi.fn().mockResolvedValue({
      data: null,
      error: {
        message: "Erro de conexão simulado",
      },
    });

    const eq = vi.fn().mockReturnValue({
      order,
    });

    const select = vi.fn().mockReturnValue({
      eq,
    });

    const client = {
      from: vi.fn().mockReturnValue({
        select,
      }),
    } as unknown as SupabaseClient;

    const repository = createCategoriesRepository(client);

    await expect(
      repository.listActive()
    ).rejects.toMatchObject({
      statusCode: 500,
      code: "CATEGORIES_QUERY_FAILED",
    });
  });
});
