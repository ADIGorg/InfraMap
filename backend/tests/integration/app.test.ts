import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app.js";

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
    expect(response.body).toHaveProperty("status", "error");
    expect(response.body).toHaveProperty(
      "message",
      "Rota não encontrada."
    );
  });
});