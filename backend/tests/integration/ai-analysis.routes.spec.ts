import express, { type RequestHandler } from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import {
  createAiAnalysisRoutes,
} from "../../src/modules/ai-analysis/presentation/ai-analysis.routes.js";
import type {
  AiAnalysisControllerDependencies,
} from "../../src/modules/ai-analysis/presentation/ai-analysis.controller.js";
import { errorHandler } from "../../src/shared/middlewares/error-handler.js";

const id = "181227d2-89d7-4ceb-8dff-85b623aeee5b";

function createApp(dependencies: AiAnalysisControllerDependencies) {
  const app = express();
  const authentication: RequestHandler = (req, _res, next) => {
    req.user = { id: "user-1" } as NonNullable<typeof req.user>;
    next();
  };
  const authorization: RequestHandler = (_req, _res, next) => next();
  app.use("/api/v1/ai-analyses", createAiAnalysisRoutes(
    dependencies, authentication, authorization
  ));
  app.use(errorHandler);
  return app;
}

function createDeps(): AiAnalysisControllerDependencies {
  return {
    create: vi.fn().mockResolvedValue({ id, status: "PENDING", photoCount: 1 }),
    start: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue({ id, status: "PENDING", photo_count: 1 }),
  };
}

describe("AI-03 — rotas de análise", () => {
  it("confirma reserva antes de responder 202", async () => {
    const deps = createDeps();
    const res = await request(createApp(deps))
      .post(`/api/v1/ai-analyses/${id}/analyze`);
    expect(res.status).toBe(202);
    expect(res.body.data.id).toBe(id);
    expect(deps.start).toHaveBeenCalledWith("user-1", id);
  });

  it("retorna 400 para UUID inválido", async () => {
    const deps = createDeps();
    const res = await request(createApp(deps))
      .get("/api/v1/ai-analyses/not-an-id");
    expect(res.status).toBe(400);
    expect(deps.get).not.toHaveBeenCalled();
  });

  it("delega consulta ao caso de uso e retorna DTO", async () => {
    const deps = createDeps();
    const res = await request(createApp(deps))
      .get(`/api/v1/ai-analyses/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(id);
    expect(deps.get).toHaveBeenCalledWith("user-1", id);
  });
});
