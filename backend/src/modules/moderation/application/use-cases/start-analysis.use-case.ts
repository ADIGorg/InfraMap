import type { IOccurrenceModerationRepository } from '../../domain/repositories/occurrence-moderation.repository.js';

export class StartAnalysisUseCase {
  constructor(private readonly repository: IOccurrenceModerationRepository) {}

  async execute(adminId: string, occurrenceId: string): Promise<void> {
    const occurrence = await this.repository.getOccurrenceById(occurrenceId);
    
    if (!occurrence) throw new Error('Ocorrência não encontrada.');
    
    if (occurrence.status !== 'RECEIVED') {
      throw new Error(`Apenas ocorrências RECEIVED podem iniciar análise. Status atual: ${occurrence.status}`);
    }

    await this.repository.transitionStatus(occurrenceId, adminId, 'UNDER_ANALYSIS');
  }
}