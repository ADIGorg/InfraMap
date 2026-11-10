
import { z } from "zod";

import {
  AppError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "../../../../shared/errors/app-error.js";

import type {
  AiAnalysisProvider,
} from "../../domain/providers/ai-analysis.provider.js";

// ==========================================
// API1-48 - AI-03
// PROCESSAMENTO DA ANÁLISE
// ==========================================

const categories = [
  "CAT01", "CAT02", "CAT03", "CAT04",
  "CAT05", "CAT06", "CAT07",
] as const;

const resultSchema = z.object({
  categoryCode: z.enum(categories),
  description: z.string().trim().min(3).max(500),
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
  findOwn(
    userId: string,
    analysisId: string
  ): Promise<AnalysisDraft | null>;

  startProcessing(
    userId: string,
    analysisId: string
  ): Promise<boolean>;

  findActiveCategoryId(
    code: string
  ): Promise<string | null>;

  saveCompleted(
    userId: string,
    analysisId: string,
    data: {
      categoryId: string;
      description: string;
      confidence: number;
      modelName: string;
      promptVersion: string;
    }
  ): Promise<void>;

  markFailed(
    userId: string,
    analysisId: string,
    errorCode: string
  ): Promise<void>;
}

export class ProcessAiAnalysisUseCase {
  constructor(
    private readonly repository: AiProcessingRepository,
    private readonly provider: AiAnalysisProvider,
    private readonly threshold = 0.70
  ) {
    if (
      !Number.isFinite(threshold) ||
      threshold < 0 ||
      threshold > 1
    ) {
      throw new Error(
        "Limiar de confiança inválido."
      );
    }
  }

  async execute(
    userId: string | undefined,
    analysisId: string
  ): Promise<AnalysisResult> {
    if (!userId) {
      throw new UnauthorizedError();
    }

    const analysis = await this.repository.findOwn(
      userId,
      analysisId
    );

    if (!analysis) {
      throw new NotFoundError(
        "Análise não encontrada."
      );
    }

    // Apenas análises pendentes ou com falha
    // podem iniciar um processamento.
    if (
      analysis.status !== "PENDING" &&
      analysis.status !== "FAILED"
    ) {
      throw new ConflictError(
        "Esta análise não pode ser processada."
      );
    }

    if (
      !Array.isArray(analysis.photoPaths) ||
      analysis.photoPaths.length < 1 ||
      analysis.photoPaths.length > 3
    ) {
      throw new ConflictError(
        "A análise não possui fotografias válidas."
      );
    }

    // Reserva a análise antes de chamar a IA.
    // O repositório fará a atualização condicional.
    const started =
      await this.repository.startProcessing(
        userId,
        analysisId
      );

    if (!started) {
      throw new ConflictError(
        "A análise já está sendo processada."
      );
    }

    try {
      // Utiliza a interface criada na AI-01.
      const response =
        await this.provider.analyzeOccurrence({
          photoPaths: analysis.photoPaths,
          userContext: {
            id: userId,
          },
        });

      const parsed = resultSchema.safeParse(
        response
      );

      if (!parsed.success) {
        throw new AppError(
          502,
          "AI_INVALID_RESPONSE",
          "A IA retornou um resultado inválido."
        );
      }

      const result = parsed.data;

      // Confiança abaixo do limiar:
      // aplica a categoria padrão CAT07.
      const categoryCode =
        result.confidence < this.threshold
          ? "CAT07"
          : result.categoryCode;

      const categoryId =
        await this.repository.findActiveCategoryId(
          categoryCode
        );

      if (!categoryId) {
        throw new AppError(
          503,
          "AI_CATEGORY_UNAVAILABLE",
          "Categoria de análise indisponível."
        );
      }

      // Persiste o resultado e conclui a análise.
      await this.repository.saveCompleted(
        userId,
        analysisId,
        {
          categoryId,
          description: result.description,
          confidence: result.confidence,
          modelName: result.modelName,
          promptVersion: result.promptVersion,
        }
      );

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
      // Registra a falha sem salvar mensagens
      // ou credenciais do provedor.
      const errorCode =
        error instanceof AppError &&
        error.code.startsWith("AI_")
          ? error.code
          : "AI_PROCESSING_FAILED";

      try {
        await this.repository.markFailed(
          userId,
          analysisId,
          errorCode
        );
      } catch {
        throw new AppError(
          503,
          "AI_STATUS_UPDATE_FAILED",
          "Não foi possível registrar a falha da análise."
        );
      }

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        503,
        "AI_PROCESSING_FAILED",
        "Não foi possível processar a análise."
      );
    }
  }
}
