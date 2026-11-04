
import express, {
  type Request,
  type Response,
} from "express";

import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import {
  securityHeaders,
  createCorsMiddleware,
  restrictHttpMethods,
  createApiRateLimiter,
} from "../../src/shared/middlewares/http-security.js";

import { errorHandler } from "../../src/shared/middlewares/error-handler.js";

import { NotFoundError } from "../../src/shared/errors/app-error.js";

// ==========================================
// CONFIGURAÇÃO DA APLICAÇÃO DE TESTES
// ==========================================

function createTestApp(maxRequests = 100) {
  const app = express();

  // 1. Configura cabeçalhos de segurança.
  app.use(securityHeaders);

  // 2. Configura uma origem autorizada para testes.
  app.use(
    createCorsMiddleware(["http://localhost:5173"])
  );

  // 3. Restringe métodos HTTP.
  app.use(restrictHttpMethods);

  // 4. Configura o limite de requisições.
  app.use(createApiRateLimiter(maxRequests));

  // 5. Limita os payloads JSON a 100 KB.
  app.use(express.json({ limit: "100kb" }));

  // Rota GET utilizada nos testes.
  app.get("/test", (_req, res) => {
    res.status(200).json({
      success: true,
    });
  });

  // Rota POST utilizada para testar payloads.
  app.post("/test", (_req, res) => {
    res.status(200).json({
      success: true,
    });
  });

  // Tratamento de rotas inexistentes.
  app.use((_req, _res, next) => {
    next(new NotFoundError("Rota não encontrada."));
  });

  // Middleware centralizado da API1-10.
  app.use(errorHandler);

  return app;
}

// ==========================================
// TESTES DE SEGURANÇA HTTP - API1-11
// ==========================================

describe("API1-11 - Segurança HTTP", () => {

  // TESTE 1 - HELMET
  it("deve configurar cabeçalhos HTTP de segurança", async () => {
    const app = createTestApp();

    const response = await request(app).get("/test");

    expect(response.status).toBe(200);

    expect(
      response.headers["x-content-type-options"]
    ).toBe("nosniff");

    expect(
      response.headers["x-frame-options"]
    ).toBe("SAMEORIGIN");
  });

  // TESTE 2 - CORS PERMITIDO
  it("deve permitir uma origem autorizada", async () => {
    const app = createTestApp();

    const response = await request(app)
      .get("/test")
      .set("Origin", "http://localhost:5173");

    expect(response.status).toBe(200);

    expect(
      response.headers["access-control-allow-origin"]
    ).toBe("http://localhost:5173");
  });

  // TESTE 3 - CORS NÃO PERMITIDO
  it("não deve autorizar CORS para uma origem desconhecida", async () => {
    const app = createTestApp();

    const response = await request(app)
      .get("/test")
      .set("Origin", "http://site-nao-autorizado.com");

    expect(
      response.headers["access-control-allow-origin"]
    ).toBeUndefined();
  });

  // TESTE 4 - PREFLIGHT CORS
  it("deve responder ao preflight de origem permitida", async () => {
    const app = createTestApp();

    const response = await request(app)
      .options("/test")
      .set("Origin", "http://localhost:5173")
      .set("Access-Control-Request-Method", "POST")
      .set(
        "Access-Control-Request-Headers",
        "Content-Type"
      );

    expect(response.status).toBe(204);

    expect(
      response.headers["access-control-allow-origin"]
    ).toBe("http://localhost:5173");

    expect(
      response.headers["access-control-allow-methods"]
    ).toContain("POST");

    expect(
      response.headers["access-control-allow-credentials"]
    ).toBeUndefined();
  });

  // TESTE 5 - MÉTODO HTTP NÃO PERMITIDO
  it("deve rejeitar método HTTP não permitido", () => {
    const next = vi.fn();
    const setHeader = vi.fn();

    // Simula um método HTTP não permitido.
    const fakeRequest = {
      method: "TRACE",
    } as Request;

    const fakeResponse = {
      setHeader,
    } as unknown as Response;

    restrictHttpMethods(
      fakeRequest,
      fakeResponse,
      next
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 405,
        code: "METHOD_NOT_ALLOWED",
      })
    );

    expect(setHeader).toHaveBeenCalledWith(
      "Allow",
      expect.stringContaining("GET")
    );
  });

  // TESTE 6 - RATE LIMITING
  it("deve retornar 429 quando o limite for excedido", async () => {
    // Limite reduzido para 2 requisições neste teste.
    const app = createTestApp(2);

    const response1 = await request(app).get("/test");
    const response2 = await request(app).get("/test");
    const response3 = await request(app).get("/test");

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);

    expect(response3.status).toBe(429);

    expect(response3.body.error.code).toBe(
      "TOO_MANY_REQUESTS"
    );
  });

  // TESTE 7 - PAYLOAD EXCESSIVO
  it("deve retornar 413 para JSON acima de 100 KB", async () => {
    const app = createTestApp();

    // Cria um conteúdo maior que 100 KB.
    const largePayload = {
      description: "A".repeat(110 * 1024),
    };

    const response = await request(app)
      .post("/test")
      .send(largePayload);

    expect(response.status).toBe(413);

    expect(response.body.error).toEqual({
      code: "PAYLOAD_TOO_LARGE",
      message:
        "O corpo da requisição excede o limite permitido.",
    });
  });
});
