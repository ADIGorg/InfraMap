import { describe, expect, it } from "vitest";
import request from "supertest";

import app from "../../src/app.js";

describe("InfraMap API", () => {
  it("deve responder corretamente à rota inicial", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      message: "InfraMap API funcionando!"
    });
  });
});