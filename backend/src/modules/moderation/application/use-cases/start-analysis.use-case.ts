import { ConflictError, NotFoundError } from "../../../../shared/errors/app-error.js";
import { canTransitionOccurrence } from "../../domain/services/occurrence-transition-policy.js";
import type { IOccurrenceModerationRepository } from '../../domain/repositories/occurrence-moderation.repository.js';

export class StartAnalysisUseCase {
  constructor(private readonly repository: IOccurrenceModerationRepository) {}

  async execute(adminId: string, occurrenceId: string): Promise<void> {
    const occurrence = await this.repository.getOccurrenceById(occurrenceId);
    
    if (!occurrence) throw new NotFoundError('Ocorrência não encontrada.');
    
    if (!canTransitionOccurrence(occurrence.status, 'UNDER_ANALYSIS')) {
      throw new ConflictError(`Apenas ocorrências RECEIVED podem iniciar análise. Status atual: ${occurrence.status}`);
    }

    await this.repository.transitionStatus(occurrenceId, adminId, 'UNDER_ANALYSIS');
  }
}