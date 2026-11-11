import type { RequestHandler } from "express";
import { createSupabaseAdminClient } from "../../../infrastructure/supabase/admin-client.js";
import { createAiProvider } from "../../../infrastructure/ai/ai-provider.factory.js";
import { logger } from "../../../shared/logger/logger.js";
import { ForbiddenError, UnauthorizedError } from "../../../shared/errors/app-error.js";
import { CreateAiAnalysisUseCase, type AiPhotoUpload } from "../application/use-cases/create-ai-analysis.use-case.js";
import { ProcessAiAnalysisUseCase } from "../application/use-cases/process-ai-analysis.use-case.js";
import { GetAiAnalysisUseCase } from "../application/use-cases/get-ai-analysis.use-case.js";
import { SupabaseAiAnalysisRepository } from "../infrastructure/repositories/supabase-ai-analysis.repository.js";
import { parseAiAnalysisId } from "./ai-analysis.schema.js";

function requireUserId(value: string | undefined): string {
  if (!value) throw new UnauthorizedError();
  return value;
}

function authorizePhoto(path: string, userId: string, analysisId: string) {
  const expected = `temporary/${userId}/${analysisId}/`;
  const filename = path.startsWith(expected) ? path.slice(expected.length) : "";
  if (!/^photo-[1-3]\.(jpg|png)$/.test(filename)) {
    throw new ForbiddenError("Fotografia não autorizada.");
  }
}

export const createAnalysis: RequestHandler = async (req, res, next) => {
  try {
    const userId = requireUserId(req.user?.id);
    const photos: AiPhotoUpload[] = Array.isArray(req.files) ? req.files : [];
    const repository = new SupabaseAiAnalysisRepository(createSupabaseAdminClient());
    const result = await new CreateAiAnalysisUseCase(repository).execute(userId, photos);
    res.status(201).json({
      data: { id: result.id, status: result.status, photo_count: result.photoCount },
    });
  } catch (error) {
    next(error);
  }
};

export const processAnalysis: RequestHandler = async (req, res, next) => {
  try {
    const userId = requireUserId(req.user?.id);
    const analysisId = parseAiAnalysisId(req.params.id);
    const client = createSupabaseAdminClient();
    const repository = new SupabaseAiAnalysisRepository(client);
    const provider = createAiProvider(
      // Compatibilidade com o provider HTTP anterior.
      async (path, ownerId) => {
        authorizePhoto(path, ownerId, analysisId);
        const { data, error } = await client.storage
          .from("occurrence-photos").createSignedUrl(path, 60);
        if (error || !data?.signedUrl) throw new Error("Fotografia indisponível.");
        return data.signedUrl;
      },
      // Gemini: dados binários privados, sem URL pública.
      async (path, ownerId) => {
        authorizePhoto(path, ownerId, analysisId);
        const { data, error } = await client.storage
          .from("occurrence-photos").download(path);
        if (error || !data) throw new Error("Fotografia indisponível.");
        const mimeType = path.endsWith(".png") ? "image/png" : "image/jpeg";
        return {
          bytes: new Uint8Array(await data.arrayBuffer()),
          mimeType,
        };
      }
    );
    const threshold = Number(process.env.AI_CONFIDENCE_THRESHOLD ?? "0.70");
    const useCase = new ProcessAiAnalysisUseCase(repository, provider, threshold);

    // Atualização condicional no banco concluída antes do aceite HTTP.
    const claimed = await useCase.start(userId, analysisId);

    void useCase.processClaimed(userId, claimed).catch(() => {
      logger.warn({ analysisId }, "Processamento da análise não concluído.");
    });
    res.status(202).json({
      data: { id: analysisId, message: "Análise recebida para processamento." },
    });
  } catch (error) {
    next(error);
  }
};

export const getAnalysis: RequestHandler = async (req, res, next) => {
  try {
    const userId = requireUserId(req.user?.id);
    const analysisId = parseAiAnalysisId(req.params.id);
    const repository = new SupabaseAiAnalysisRepository(createSupabaseAdminClient());
    const analysis = await new GetAiAnalysisUseCase(repository).execute(userId, analysisId);
    res.status(200).json({ data: analysis });
  } catch (error) {
    next(error);
  }
};
