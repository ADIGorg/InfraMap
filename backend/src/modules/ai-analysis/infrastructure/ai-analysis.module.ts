import type { SupabaseClient } from "@supabase/supabase-js";
import { createAiProvider } from "../../../infrastructure/ai/ai-provider.factory.js";
import { logger } from "../../../shared/logger/logger.js";
import { ForbiddenError } from "../../../shared/errors/app-error.js";
import { CreateAiAnalysisUseCase } from "../application/use-cases/create-ai-analysis.use-case.js";
import { ProcessAiAnalysisUseCase } from "../application/use-cases/process-ai-analysis.use-case.js";
import { GetAiAnalysisUseCase } from "../application/use-cases/get-ai-analysis.use-case.js";
import { SupabaseAiAnalysisRepository } from "./repositories/supabase-ai-analysis.repository.js";
import type { AiAnalysisActions } from "../application/ports/ai-analysis.actions.js";

/** Composition root local: camada de apresentação não precisa conhecer Supabase. */
export function createAiAnalysisDependencies(
  adminClient: SupabaseClient
): AiAnalysisActions {
  const repository = new SupabaseAiAnalysisRepository(adminClient);

  function authorizePhoto(path: string, userId: string, analysisId: string): void {
    const prefix = `temporary/${userId}/${analysisId}/`;
    const filename = path.startsWith(prefix) ? path.slice(prefix.length) : "";
    if (!/^photo-[1-3]\.(jpg|png)$/.test(filename)) {
      throw new ForbiddenError("Fotografia não autorizada.");
    }
  }

  return {
    async create(userId, photos) {
      return new CreateAiAnalysisUseCase(repository).execute(userId, photos);
    },
    async get(userId, analysisId) {
      return new GetAiAnalysisUseCase(repository).execute(userId, analysisId);
    },
    async start(userId, analysisId) {
      // Resolução do Storage sob demanda: criação do app não exige bucket
      // real e testes HTTP podem injetar apenas as dependências usadas.
      const bucket = adminClient.storage.from("occurrence-photos");
      const provider = createAiProvider(
        // Compatibilidade com o provider HTTP legado.
        async (path, ownerId) => {
          authorizePhoto(path, ownerId, analysisId);
          const { data, error } = await bucket.createSignedUrl(path, 60);
          if (error || !data?.signedUrl) throw new Error("Fotografia indisponível.");
          return data.signedUrl;
        },
        // Gemini: fotos privadas obtidas no backend.
        async (path, ownerId) => {
          authorizePhoto(path, ownerId, analysisId);
          const { data, error } = await bucket.download(path);
          if (error || !data) throw new Error("Fotografia indisponível.");
          return {
            bytes: new Uint8Array(await data.arrayBuffer()),
            mimeType: path.endsWith(".png") ? "image/png" : "image/jpeg",
          };
        }
      );
      const threshold = Number(process.env.AI_CONFIDENCE_THRESHOLD ?? "0.70");
      const useCase = new ProcessAiAnalysisUseCase(repository, provider, threshold);
      const claimed = await useCase.start(userId, analysisId);

      // Sem fila externa: o status já foi persistido quando o handler devolver 202.
      void useCase.processClaimed(userId, claimed).catch(() => {
        logger.warn({ analysisId }, "Processamento da análise não concluído.");
      });
    },
  };
}
