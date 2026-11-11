import type { RequestHandler } from "express";
import { UnauthorizedError } from "../../../shared/errors/app-error.js";
import type { AiAnalysisActions } from "../application/ports/ai-analysis.actions.js";
import { parseAiAnalysisId } from "./ai-analysis.schema.js";

export type AiAnalysisControllerDependencies = AiAnalysisActions;

function userIdFromRequest(id: string | undefined): string {
  if (!id) throw new UnauthorizedError();
  return id;
}

/** Responsável apenas por HTTP e DTOs; nenhum cliente Supabase aqui. */
export function createAiAnalysisController(deps: AiAnalysisControllerDependencies) {
  const create: RequestHandler = async (req, res, next) => {
    try {
      const userId = userIdFromRequest(req.user?.id);
      const photos: AiPhotoUpload[] = Array.isArray(req.files) ? req.files : [];
      const result = await deps.create(userId, photos);
      res.status(201).json({
        data: { id: result.id, status: result.status, photo_count: result.photoCount },
      });
    } catch (error) {
      next(error);
    }
  };

  const analyze: RequestHandler = async (req, res, next) => {
    try {
      const userId = userIdFromRequest(req.user?.id);
      const analysisId = parseAiAnalysisId(req.params.id);
      await deps.start(userId, analysisId);
      res.status(202).json({
        data: { id: analysisId, message: "Análise recebida para processamento." },
      });
    } catch (error) {
      next(error);
    }
  };

  const get: RequestHandler = async (req, res, next) => {
    try {
      const userId = userIdFromRequest(req.user?.id);
      const analysisId = parseAiAnalysisId(req.params.id);
      const result = await deps.get(userId, analysisId);
      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  return { create, analyze, get };
}
