import {
  ConflictError, ForbiddenError, NotFoundError,
} from "../../../../shared/errors/app-error.js";
import type {
  DataSource, FinalizeOccurrenceInput, IOccurrenceRepository,
} from "../../domain/repositories/occurrence.repository.js";

export interface FinalizeOccurrenceResult {
  id: string;
  status: "RECEIVED";
  summary: {
    categoryId: string;
    descriptionLength: number;
    photosCount: number;
  };
}

/** A validação HTTP pertence à presentation; regras de negócio ficam aqui. */
export class FinalizeOccurrenceUseCase {
  constructor(private readonly repository: IOccurrenceRepository) {}

  async execute(
    userId: string,
    data: FinalizeOccurrenceInput,
  ): Promise<FinalizeOccurrenceResult> {
    const userRole = await this.repository.getUserRole(userId);
    if (!userRole || !userRole.isActive || userRole.role !== "CITIZEN") {
      throw new ForbiddenError("Somente cidadãos ativos podem registrar ocorrências.");
    }

    const analysis = await this.repository.getAiAnalysis(data.aiAnalysisId);
    if (!analysis) throw new NotFoundError("Análise de IA não encontrada.");
    if (analysis.userId !== userId) {
      throw new ForbiddenError("Esta análise não pertence ao cidadão.");
    }
    if (analysis.status !== "COMPLETED") {
      throw new ConflictError("A análise ainda não está disponível para finalização.");
    }

    const category = await this.repository.getCategory(data.categoryId);
    if (!category || !category.isActive) {
      throw new ConflictError("Categoria inexistente ou inativa.");
    }
    this.validateSourceCoherence(
      data.categorySource,
      data.descriptionSource,
      data.categoryId,
      data.description,
      analysis.suggestedCategoryId,
      analysis.suggestedDescription,
    );

    const occurrenceId = await this.repository.finalize(data, userId);
    return {
      id: occurrenceId,
      status: "RECEIVED",
      summary: {
        categoryId: data.categoryId,
        descriptionLength: data.description.length,
        photosCount: data.photos.length,
      },
    };
  }

  private validateSourceCoherence(
    categorySource: DataSource,
    descriptionSource: DataSource,
    categoryId: string,
    description: string,
    suggestedCategoryId: string | null,
    suggestedDescription: string | null,
  ): void {
    if (categorySource === "AI_CONFIRMED" && categoryId !== suggestedCategoryId) {
      throw new ConflictError("Categoria alterada deve utilizar a fonte AI_EDITED.");
    }
    if (
      descriptionSource === "AI_CONFIRMED" &&
      description.trim() !== suggestedDescription?.trim()
    ) {
      throw new ConflictError("Descrição alterada deve utilizar a fonte AI_EDITED.");
    }
  }
}
