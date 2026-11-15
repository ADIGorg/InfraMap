import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../../shared/errors/app-error.js';

import type {
  DataSource,
  IOccurrenceRepository,
} from '../../domain/repositories/occurrence.repository.js';
import { finalizeOccurrenceSchema } from '../../presentation/occurrence.schema.js';

export interface FinalizeOccurrenceResult {
  id: string;
  status: 'RECEIVED';
  summary: {
    categoryId: string;
    descriptionLength: number;
    photosCount: number;
  };
}

export class FinalizeOccurrenceUseCase {
  constructor(private readonly repository: IOccurrenceRepository) {}

    async execute(userId: string, input: unknown): Promise<FinalizeOccurrenceResult> {
      // 1. Validação Zod
      const parsed = finalizeOccurrenceSchema.safeParse({ body: input });
      if (!parsed.success) {
        const msg = parsed.error.issues.map((i) => i.message).join(', ');
        throw new BadRequestError(`Dados inválidos: ${msg}`);
      }
      const data = parsed.data.body;

      // 2. Validar cidadão ativo (RN002)
      const userRole = await this.repository.getUserRole(userId);
      if (!userRole || !userRole.isActive || userRole.role !== 'CITIZEN') {
        throw new ForbiddenError(
          'Apenas cidadãos autenticados e ativos podem registrar ocorrências.'
        );
      }

      // 3. Validar análise (RN063, RN064)
      const analysis = await this.repository.getAiAnalysis(data.aiAnalysisId);
      if (!analysis) throw new NotFoundError('Análise de IA não encontrada.');
      if (analysis.userId !== userId) {
        throw new ForbiddenError('A análise não pertence a este cidadão.');
      }
      if (analysis.status !== 'COMPLETED' && analysis.status !== 'CONSUMED') {
        throw new ConflictError(
          `A análise não está concluída. Status atual: ${analysis.status}.`
        );
      }

      // 4. Validar categoria ativa (RN007)
      const category = await this.repository.getCategory(data.categoryId);
      if (!category || !category.isActive) {
        throw new BadRequestError('Categoria inválida ou inativa (RN007).');
      }

      // 4b. Normalização RN068: AI_EDITED → AI_CONFIRMED quando o valor
      //     coincide com a sugestão da IA (evita métricas poluídas).
      const effectiveCategorySource =
        data.categorySource === 'AI_EDITED' &&
        analysis.suggestedCategoryId &&
        data.categoryId === analysis.suggestedCategoryId
          ? 'AI_CONFIRMED'
          : data.categorySource;

      const effectiveDescriptionSource =
        data.descriptionSource === 'AI_EDITED' &&
        analysis.suggestedDescription &&
        data.description.trim() === analysis.suggestedDescription.trim()
          ? 'AI_CONFIRMED'
          : data.descriptionSource;

      // 5. Validar coerência das fontes (RN068) — usa fontes EFETIVAS
      this.validateSourceCoherence(
        effectiveCategorySource,
        effectiveDescriptionSource,
        data.categoryId,
        data.description,
        analysis.suggestedCategoryId,
        analysis.suggestedDescription
      );

      // 6. Invocar função transacional — passa fontes EFETIVAS
      const payload = {
        ...data,
        categorySource: effectiveCategorySource,
        descriptionSource: effectiveDescriptionSource,
      };
      const occurrenceId = analysis.status === 'CONSUMED'
        ? await this.repository.resume(userId, payload)
        : await this.repository.finalize(userId, payload);

        // 7. Retorno
        return {
          id: occurrenceId,
          status: 'RECEIVED',
          summary: {
            categoryId: data.categoryId,
            descriptionLength: data.description.length,
            photosCount: data.photos.length,
          },
      };
    };

    private validateSourceCoherence(
    categorySource: DataSource,
    descriptionSource: DataSource,
    categoryId: string,
    description: string,
    suggestedCategoryId: string | null,
    suggestedDescription: string | null
  ): void {
    if (
      categorySource === 'AI_CONFIRMED' &&
      suggestedCategoryId &&
      categoryId !== suggestedCategoryId
    ) {
      throw new BadRequestError(
        'Inconsistência: a categoria difere da sugestão da IA, mas a fonte indica "AI_CONFIRMED". Use "AI_EDITED".'
      );
    }

    if (
      descriptionSource === 'AI_CONFIRMED' &&
      suggestedDescription &&
      description.trim() !== suggestedDescription.trim()
    ) {
      throw new BadRequestError(
        'Inconsistência: a descrição difere da sugestão da IA, mas a fonte indica "AI_CONFIRMED". Use "AI_EDITED".'
      );
    }
  }
}