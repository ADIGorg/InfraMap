
import express from "express";
import request from "supertest";

import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  createCategoriesRoutes,
} from "../../src/modules/categories/categories.routes.js";

import type {
  CategoriesRepository,
} from "../../src/modules/categories/categories.repository.js";

import {
  errorHandler,
} from "../../src/shared/middlewares/error-handler.js";

function createTestApp(
  repository: CategoriesRepository
) {
  const app = express();

  app.use(
    "/api/v1/categories",
    createCategoriesRoutes(repository)
  );

  app.use(errorHandler);

  return app;
}

describe("CAT-01 - GET /categories", () => {
  it("deve permitir consulta pública e retornar categorias", async () => {
    const listActive = vi.fn().mockResolvedValue([
      {
        id: "id-1",
        code: "CAT01",
        name: "Saneamento e Drenagem",
        description: null,
      },
      {
        id: "id-2",
        code: "CAT02",
        name: "Iluminação Pública",
        description: null,
      },
    ]);

    const app = createTestApp({ listActive });

    const response = await request(app)
      .get("/api/v1/categories");

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      data: [
        {
          id: "id-1",
          code: "CAT01",
          name: "Saneamento e Drenagem",
          description: null,
        },
        {
          id: "id-2",
          code: "CAT02",
          name: "Iluminação Pública",
          description: null,
        },
      ],
    });

    expect(listActive).toHaveBeenCalledOnce();
  });

  it("deve retornar lista vazia quando não houver categorias ativas", async () => {
    const repository: CategoriesRepository = {
      listActive: vi.fn().mockResolvedValue([]),
    };

    const app = createTestApp(repository);

    const response = await request(app)
      .get("/api/v1/categories");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [],
    });
  });

  it("não deve expor detalhes internos quando o repositório falhar", async () => {
    const repository: CategoriesRepository = {
      listActive: vi.fn().mockRejectedValue(
        new Error("segredo-do-banco")
      ),
    };

    const app = createTestApp(repository);

    const response = await request(app)
      .get("/api/v1/categories");

    expect(response.status).toBe(500);

    expect(response.body.error.code).toBe(
      "INTERNAL_SERVER_ERROR"
    );

    expect(response.text).not.toContain(
      "segredo-do-banco"
    );
  });
});
