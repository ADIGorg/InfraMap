import { Router } from "express";
import { z } from "zod";

import { env } from "../../../config/env.js";
import { STORAGE_BUCKET_NAME } from "../../../config/constants.js";

import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../../../shared/errors/app-error.js";

import { authenticate } from "../../../shared/middlewares/authenticate.js";
import { authorizeRole } from "../../../shared/middlewares/authorize-role.js";
import { logger } from "../../../shared/logger/logger.js";

import { createSupabaseAdminClient } from "../../../infrastructure/supabase/admin-client.js";
import { createAiProvider } from "../../../infrastructure/ai/ai-provider.factory.js";

import { ProcessAiAnalysisUseCase } from "../application/use-cases/process-ai-analysis.use-case.js";
import { SupabaseAiProcessingRepository } from "../infrastructure/supabase-ai-processing.repository.js";

const router = Router();

const protectedRoutes = [authenticate, authorizeRole(["CITIZEN"])];

function validateId(value: unknown): string {
  const result = z.string().uuid().safeParse(value);
  if (!result.success) {
    throw new BadRequestError("Identificador da análise inválido.");
  }
  return result.data;
}

// ============================================================
// POST /ai-analyses/:id/analyze
// ============================================================
router.post("/:id/analyze", ...protectedRoutes, async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError();

    const analysisId = validateId(req.params.id);
    const client = createSupabaseAdminClient();
    const repository = new SupabaseAiProcessingRepository(client);

    const analysis = await repository.findOwn(userId, analysisId);
    if (!analysis) throw new NotFoundError("Análise não encontrada.");

    if (analysis.status !== "PENDING" && analysis.status !== "FAILED") {
      throw new ConflictError("Esta análise não pode ser processada.");
    }

    const provider = createAiProvider(async (path, ownerId) => {
      const expectedPrefix = `temporary/${ownerId}/${analysisId}/`;
      if (!path.startsWith(expectedPrefix) || path.includes("..")) {
        throw new ForbiddenError("Fotografia não autorizada.");
      }

      const { data, error } = await client.storage
        .from(STORAGE_BUCKET_NAME)
        .createSignedUrl(path, 60);

      if (error || !data?.signedUrl) {
        throw new Error("Fotografia indisponível.");
      }
      return data.signedUrl;
    });

    const useCase = new ProcessAiAnalysisUseCase(
      repository,
      provider,
      env.ai.confidenceThreshold,
    );

    void useCase.execute(userId, analysisId).catch(() => {
      logger.warn({ analysisId }, "Processamento da análise não concluído.");
    });

    return res.status(202).json({
      data: { id: analysisId, message: "Análise recebida para processamento." },
    });
  } catch (error) {
    return next(error);
  }
});

// ============================================================
// GET /ai-analyses/:id
// ============================================================
router.get("/:id", ...protectedRoutes, async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError();

    const analysisId = validateId(req.params.id);
    const repository = new SupabaseAiProcessingRepository(
      createSupabaseAdminClient(),
    );

    const analysis = await repository.getOwnDetails(userId, analysisId);
    if (!analysis) throw new NotFoundError("Análise não encontrada.");

    return res.status(200).json({ data: analysis });
  } catch (error) {
    return next(error);
  }
});

export const aiProcessingRoutes = router;