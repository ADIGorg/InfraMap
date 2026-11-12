interface IOccurrenceModerationRepository {
  getOccurrenceById(occurrenceId: string): Promise<unknown>;
  correctClassification(
    occurrenceId: string,
    adminId: string,
    newCategoryId: string | null,
    newDescription: string | null
  ): Promise<unknown>;
}

export class CorrectClassificationUseCase {
  constructor(private readonly repository: IOccurrenceModerationRepository) {}

  async execute(
    adminId: string,
    occurrenceId: string,
    newCategoryId?: string | null,
    newDescription?: string | null
  ): Promise<void> {
    if (!newCategoryId && !newDescription) {
      throw new Error('Informe ao menos uma correção (categoria ou descrição).');
    }

    if (newDescription !== undefined && newDescription !== null) {
      const trimmed = newDescription.trim();
      if (trimmed.length === 0) {
        throw new Error('A descrição não pode ser vazia.');
      }
      if (trimmed.length > 500) {
        throw new Error('A descrição deve ter no máximo 500 caracteres (RN009).');
      }
    }

    const occurrence = await this.repository.getOccurrenceById(occurrenceId);
    if (!occurrence) throw new Error('Ocorrência não encontrada.');

    await this.repository.correctClassification(
      occurrenceId,
      adminId,
      newCategoryId ?? null,
      newDescription ?? null
    );
  }
}