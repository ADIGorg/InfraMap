import { ConflictError, NotFoundError } from "../../../../shared/errors/app-error.js";
import { canTransitionOccurrence } from "../../domain/services/occurrence-transition-policy.js";
interface IOccurrenceModerationRepository {
  getOccurrenceById(occurrenceId: string): Promise<{ status: string } | null>;
  transitionStatus(occurrenceId: string, adminId: string, status: 'CONFIRMED'): Promise<unknown>;
}

export class ConfirmOccurrenceUseCase {
  constructor(private readonly repository: IOccurrenceModerationRepository) {}

  async execute(adminId: string, occurrenceId: string): Promise<void> {
    const occurrence = await this.repository.getOccurrenceById(occurrenceId);
    
    if (!occurrence) throw new NotFoundError('Ocorrência não encontrada.');
    
    if (!canTransitionOccurrence(occurrence.status, 'CONFIRMED')) {
      throw new ConflictError(`Apenas ocorrências UNDER_ANALYSIS podem ser confirmadas. Status atual: ${occurrence.status}`);
    }

    await this.repository.transitionStatus(occurrenceId, adminId, 'CONFIRMED');
  }
}