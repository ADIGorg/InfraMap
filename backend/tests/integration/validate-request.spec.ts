
import express, {
  type Request,
  type Response,
} from "express";

import request from "supertest";
import { z } from "zod";

import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { validateRequest } from
  "../../src/shared/middlewares/validate-request.js";

import { errorHandler } from
  "../../src/shared/middlewares/error-handler.js";

// ======================================
// SCHEMAS DE TESTE
// ======================================

const bodySchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
});

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const querySchema = z.object({
  page: z.coerce.number().int().min(1),
});

// ======================================
// APLICAÇÃO EXPRESS ISOLADA
// ======================================

function createTestApp() {
  const app = express();

  app.use(express.json());

  // Validação do body.
  app.post(
    "/body",
    validateRequest({ body: bodySchema }),
    (req, res) => {
      res.status(200).json({
        validated: req.validated?.body,
      });
    }
  );

  // Validação dos parâmetros da rota.
  app.get(
    "/items/:id",
    validateRequest({ params: paramsSchema }),
    (req, res) => {
      res.status(200).json({
        validated: req.validated?.params,
      });
    }
  );

  // Validação e transformação da query.
  app.get(
    "/search",
    validateRequest({ query: querySchema }),
    (req, res) => {
      res.status(200).json({
        validated: req.validated?.query,
      });
    }
  );

  app.use(errorHandler);

  return app;
}

// ======================================
// TESTES DA API1-14
// ======================================

describe("API1-14 - Validação de dados com Zod", () => {

  it("deve aceitar um body válido", async () => {
    const response = await request(createTestApp())
      .post("/body")
      .send({
        name: "Maria",
        email: "maria@example.com",
      });

    expect(response.status).toBe(200);

    expect(response.body.validated).toEqual({
      name: "Maria",
      email: "maria@example.com",
    });
  });

  it("deve retornar 400 para campo obrigatório ausente", async () => {
    const response = await request(createTestApp())
      .post("/body")
      .send({
        name: "Maria",
      });

    expect(response.status).toBe(400);

    expect(response.body.error.code).toBe(
      "BAD_REQUEST"
    );

    expect(response.body.error.message)
      .toContain("email");
  });

  it("deve retornar 400 para email inválido", async () => {
    const response = await request(createTestApp())
      .post("/body")
      .send({
        name: "Maria",
        email: "email-invalido",
      });

    expect(response.status).toBe(400);

    expect(response.body.error.message)
      .toContain("email");
  });

  it("deve validar parâmetros da URL", async () => {
    const response = await request(createTestApp())
      .get("/items/123");

    expect(response.status).toBe(200);

    expect(response.body.validated).toEqual({
      id: 123,
    });
  });

  it("deve rejeitar parâmetro inválido", async () => {
    const response = await request(createTestApp())
      .get("/items/abc");

    expect(response.status).toBe(400);

    expect(response.body.error.code).toBe(
      "BAD_REQUEST"
    );
  });

  it("deve transformar e disponibilizar query válida", async () => {
    const response = await request(createTestApp())
      .get("/search?page=2");

    expect(response.status).toBe(200);

    // O valor transformado deve estar em
    // req.validated.query, não em req.query.
    expect(response.body.validated).toEqual({
      page: 2,
    });
  });

  it("deve retornar 400 para query inválida", async () => {
    const response = await request(createTestApp())
      .get("/search?page=abc");

    expect(response.status).toBe(400);

    expect(response.body.error.code).toBe(
      "BAD_REQUEST"
    );
  });

  it("não deve executar o controller com dados inválidos", async () => {
    const app = express();

    app.use(express.json());

    const controller = vi.fn(
      (_req: Request, res: Response) => {
        res.status(200).json({
          success: true,
        });
      }
    );

    app.post(
      "/protected",
      validateRequest({ body: bodySchema }),
      controller
    );

    app.use(errorHandler);

    const response = await request(app)
      .post("/protected")
      .send({
        name: "Jo",
        email: "invalido",
      });

    expect(response.status).toBe(400);

    expect(controller).not.toHaveBeenCalled();
  });

});
