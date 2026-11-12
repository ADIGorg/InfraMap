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
      throw new Error(`Dados inválidos: ${msg}`);
    }
    const data = parsed.data.body;

    // 2. Validar cidadão ativo (RN002)
    const userRole = await this.repository.getUserRole(userId);
    if (!userRole || !userRole.isActive || userRole.role !== 'CITIZEN') {
      throw new Error('Apenas cidadãos autenticados e ativos podem registrar ocorrências.');
    }

    // 3. Validar análise (RN063, RN064)
    const analysis = await this.repository.getAiAnalysis(data.aiAnalysisId);
    if (!analysis) throw new Error('Análise de IA não encontrada.');
    if (analysis.userId !== userId) {
      throw new Error('A análise não pertence a este cidadão.');
    }
    if (analysis.status !== 'COMPLETED') {
      throw new Error(`A análise não está concluída. Status atual: ${analysis.status}.`);
    }

    // 4. Validar categoria ativa (RN007)
    const category = await this.repository.getCategory(data.categoryId);
    if (!category || !category.isActive) {
      throw new Error('Categoria inválida ou inativa (RN007).');
    }

    // 5. Validar coerência das fontes (RN068)
    this.validateSourceCoherence(
      data.categorySource,
      data.descriptionSource,
      data.categoryId,
      data.description,
      analysis.suggestedCategoryId,
      analysis.suggestedDescription
    );

    // 6. Invocar função transacional
    const occurrenceId = await this.repository.finalize(data);

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
  }

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
      throw new Error(
        'Inconsistência: a categoria difere da sugestão da IA, mas a fonte indica "AI_CONFIRMED". Use "AI_EDITED".'
      );
    }

    if (
      descriptionSource === 'AI_CONFIRMED' &&
      suggestedDescription &&
      description.trim() !== suggestedDescription.trim()
    ) {
      throw new Error(
        'Inconsistência: a descrição difere da sugestão da IA, mas a fonte indica "AI_CONFIRMED". Use "AI_EDITED".'
      );
    }
  }
}