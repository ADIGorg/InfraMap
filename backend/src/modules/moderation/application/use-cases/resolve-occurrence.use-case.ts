interface IOccurrenceModerationRepository {
  getOccurrenceById(
    occurrenceId: string
  ): Promise<{ status: string } | null | undefined>;
  resolve(
    occurrenceId: string,
    adminId: string,
    resolutionNotes?: string
  ): Promise<void>;
}

export class ResolveOccurrenceUseCase {
  constructor(private readonly repository: IOccurrenceModerationRepository) {}

  async execute(
    adminId: string,
    occurrenceId: string,
    resolutionNotes?: string
  ): Promise<void> {
    const occurrence = await this.repository.getOccurrenceById(occurrenceId);
    if (!occurrence) throw new Error('Ocorrência não encontrada.');

    if (occurrence.status !== 'IN_SERVICE') {
      throw new Error(
        `Apenas ocorrências IN_SERVICE podem ser resolvidas. Status atual: ${occurrence.status}.`
      );
    }

    await this.repository.resolve(
      occurrenceId,
      adminId,
      resolutionNotes?.trim()
    );
  }
}