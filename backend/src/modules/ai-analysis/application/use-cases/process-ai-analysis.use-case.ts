import { z } from "zod";

import {
  AI_DESCRIPTION_MIN_LENGTH,
  FALLBACK_CATEGORY_CODE,
  OCCURRENCE_CATEGORY_CODES,
  OCCURRENCE_DESCRIPTION_MAX_LENGTH,
  OCCURRENCE_PHOTOS_MAX,
  OCCURRENCE_PHOTOS_MIN,
} from "../../../../config/constants.js";

import {
  AppError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "../../../../shared/errors/app-error.js";

import type { AiAnalysisProvider } from "../../domain/providers/ai-analysis.provider.js";

// ==========================================
// API1-48 - AI-03
// ==========================================

const resultSchema = z.object({
  categoryCode: z.enum(OCCURRENCE_CATEGORY_CODES),
  description: z
    .string()
    .trim()
    .min(AI_DESCRIPTION_MIN_LENGTH)
    .max(OCCURRENCE_DESCRIPTION_MAX_LENGTH),
  confidence: z.number().min(0).max(1),
  modelName: z.string().min(1).max(100),
  promptVersion: z.string().min(1).max(30),
});

export interface AnalysisDraft {
  id: string;
  status: string;
  photoPaths: string[];
}

export interface AnalysisResult {
  id: string;
  status: "COMPLETED";
  categoryCode: string;
  description: string;
  confidence: number;
  modelName: string;
  promptVersion: string;
}

export interface AiProcessingRepository {
  findOwn(userId: string, analysisId: string): Promise<AnalysisDraft | null>;
  startProcessing(userId: string, analysisId: string): Promise<boolean>;
  findActiveCategoryId(code: string): Promise<string | null>;
  saveCompleted(
    userId: string,
    analysisId: string,
    data: {
      categoryId: string;
      description: string;
      confidence: number;
      modelName: string;
      promptVersion: string;
    },
  ): Promise<void>;
  markFailed(userId: string, analysisId: string, errorCode: string): Promise<void>;
}

export class ProcessAiAnalysisUseCase {
  constructor(
    private readonly repository: AiProcessingRepository,
    private readonly provider: AiAnalysisProvider,
    private readonly threshold = 0.7,
  ) {
    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
      throw new Error("Limiar de confiança inválido.");
    }
  }

  async execute(
    userId: string | undefined,
    analysisId: string,
  ): Promise<AnalysisResult> {
    if (!userId) throw new UnauthorizedError();

    const analysis = await this.repository.findOwn(userId, analysisId);
    if (!analysis) throw new NotFoundError("Análise não encontrada.");

    if (analysis.status !== "PENDING" && analysis.status !== "FAILED") {
      throw new ConflictError("Esta análise não pode ser processada.");
    }

    if (
      !Array.isArray(analysis.photoPaths) ||
      analysis.photoPaths.length < OCCURRENCE_PHOTOS_MIN ||
      analysis.photoPaths.length > OCCURRENCE_PHOTOS_MAX
    ) {
      throw new ConflictError("A análise não possui fotografias válidas.");
    }

    const started = await this.repository.startProcessing(userId, analysisId);
    if (!started) {
      throw new ConflictError("A análise já está sendo processada.");
    }

    try {
      const response = await this.provider.analyzeOccurrence({
        photoPaths: analysis.photoPaths,
        userContext: { id: userId },
      });

      const parsed = resultSchema.safeParse(response);
      if (!parsed.success) {
        throw new AppError(
          502,
          "AI_INVALID_RESPONSE",
          "A IA retornou um resultado inválido.",
        );
      }

      const result = parsed.data;

      // RN065/RN066 — fallback abaixo do limiar
      const categoryCode =
        result.confidence < this.threshold
          ? FALLBACK_CATEGORY_CODE
          : result.categoryCode;

      const categoryId = await this.repository.findActiveCategoryId(categoryCode);
      if (!categoryId) {
        throw new AppError(
          503,
          "AI_CATEGORY_UNAVAILABLE",
          "Categoria de análise indisponível.",
        );
      }

      await this.repository.saveCompleted(userId, analysisId, {
        categoryId,
        description: result.description,
        confidence: result.confidence,
        modelName: result.modelName,
        promptVersion: result.promptVersion,
      });

      return {
        id: analysisId,
        status: "COMPLETED",
        categoryCode,
        description: result.description,
        confidence: result.confidence,
        modelName: result.modelName,
        promptVersion: result.promptVersion,
      };
    } catch (error) {
      const errorCode =
        error instanceof AppError && error.code.startsWith("AI_")
          ? error.code
          : "AI_PROCESSING_FAILED";

      try {
        await this.repository.markFailed(userId, analysisId, errorCode);
      } catch {
        throw new AppError(
          503,
          "AI_STATUS_UPDATE_FAILED",
          "Não foi possível registrar a falha da análise.",
        );
      }

      if (error instanceof AppError) throw error;
      throw new AppError(
        503,
        "AI_PROCESSING_FAILED",
        "Não foi possível processar a análise.",
      );
    }
  }
}