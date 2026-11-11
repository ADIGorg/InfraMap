import type { AnalysisDraft, AiProcessingRepository } from "../ports/ai-analysis.repository.js";
export type { AnalysisDraft, AiProcessingRepository } from "../ports/ai-analysis.repository.js";
import { z } from "zod";
import {
  AppError, ConflictError, NotFoundError, UnauthorizedError,
} from "../../../../shared/errors/app-error.js";
import { canProcessAiAnalysis } from "../../domain/entities/ai-analysis.entity.js";
import type { AiAnalysisProvider } from "../../application/ports/ai-analysis.provider.js";

const categories = ["CAT01", "CAT02", "CAT03", "CAT04", "CAT05", "CAT06", "CAT07"] as const;
const resultSchema = z.object({
  categoryCode: z.enum(categories),
  description: z.string().trim().min(3).max(500),
  confidence: z.number().min(0).max(1),
  modelName: z.string().min(1).max(100),
  promptVersion: z.string().min(1).max(30),
});

export interface AnalysisResult {
  id: string;
  status: "COMPLETED";
  categoryCode: string;
  description: string;
  confidence: number;
  modelName: string;
  promptVersion: string;
}
/** Reserva o trabalho no banco ANTES de devolver HTTP 202. */
export class ProcessAiAnalysisUseCase {
  constructor(
    private readonly repository: AiProcessingRepository,
    private readonly provider: AiAnalysisProvider,
    private readonly threshold = 0.70
  ) {
    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
      throw new Error("Limiar de confiança inválido.");
    }
  }

  async start(userId: string | undefined, analysisId: string): Promise<AnalysisDraft> {
    if (!userId) throw new UnauthorizedError();
    const analysis = await this.repository.findOwn(userId, analysisId);
    if (!analysis) throw new NotFoundError("Análise não encontrada.");
    if (!canProcessAiAnalysis(analysis.status)) {
      throw new ConflictError("Esta análise não pode ser processada.");
    }
    if (
      !Array.isArray(analysis.photoPaths) ||
      analysis.photoPaths.length < 1 ||
      analysis.photoPaths.length > 3
    ) {
      throw new ConflictError("A análise não possui fotografias válidas.");
    }
    const started = await this.repository.startProcessing(userId, analysisId);
    if (!started) throw new ConflictError("A análise já está sendo processada.");
    return analysis;
  }

  async processClaimed(userId: string, analysis: AnalysisDraft): Promise<AnalysisResult> {
    const analysisId = analysis.id;
    try {
      const response = await this.provider.analyzeOccurrence({
        photoPaths: analysis.photoPaths,
        userContext: { id: userId },
      });
      const parsed = resultSchema.safeParse(response);
      if (!parsed.success) {
        throw new AppError(502, "AI_INVALID_RESPONSE", "A IA retornou um resultado inválido.");
      }
      const result = parsed.data;
      const categoryCode = result.confidence < this.threshold
        ? "CAT07" : result.categoryCode;
      const categoryId = await this.repository.findActiveCategoryId(categoryCode);
      if (!categoryId) {
        throw new AppError(503, "AI_CATEGORY_UNAVAILABLE", "Categoria de análise indisponível.");
      }
      await this.repository.saveCompleted(userId, analysisId, {
        categoryId,
        description: result.description,
        confidence: result.confidence,
        modelName: result.modelName,
        promptVersion: result.promptVersion,
      });
      return {
        id: analysisId, status: "COMPLETED", categoryCode,
        description: result.description,
        confidence: result.confidence,
        modelName: result.modelName,
        promptVersion: result.promptVersion,
      };
    } catch (error) {
      // Não persiste resposta do fornecedor nem credenciais.
      const errorCode = error instanceof AppError && error.code.startsWith("AI_")
        ? error.code : "AI_PROCESSING_FAILED";
      try {
        await this.repository.markFailed(userId, analysisId, errorCode);
      } catch {
        throw new AppError(503, "AI_STATUS_UPDATE_FAILED", "Não foi possível registrar a falha da análise.");
      }
      if (error instanceof AppError) throw error;
      throw new AppError(503, "AI_PROCESSING_FAILED", "Não foi possível processar a análise.");
    }
  }

  /** Compatibilidade com consumidores síncronos e testes da AI-03. */
  async execute(userId: string | undefined, analysisId: string): Promise<AnalysisResult> {
    const analysis = await this.start(userId, analysisId);
    return this.processClaimed(userId!, analysis);
  }
}
