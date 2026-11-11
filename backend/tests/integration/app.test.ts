import { describe, expect, it } from "vitest";
import request from "supertest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createApp } from "../../src/app.js";

// Cliente fake — não é usado pelos testes de /health e 404,
// apenas satisfaz o contrato de dependência.
const fakeAdminClient = {} as SupabaseClient;
const app = createApp({ adminClient: fakeAdminClient });

describe("InfraMap API", () => {
  it("deve retornar HTTP 200 no health check", async () => {
    const response = await request(app).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "ok");
    expect(response.body).toHaveProperty(
      "message",
      "InfraMap API funcionando!"
    );
    expect(response.body).toHaveProperty("timestamp");
  });

  it("deve retornar HTTP 404 para uma rota inexistente", async () => {
    const response = await request(app).get("/api/v1/rota-inexistente");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Rota não encontrada.",
      },
    });
  });
});