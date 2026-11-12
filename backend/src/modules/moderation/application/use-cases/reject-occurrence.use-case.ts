import { ConflictError, NotFoundError, BadRequestError } from "../../../../shared/errors/app-error.js";
import { canTransitionOccurrence } from "../../domain/services/occurrence-transition-policy.js";
interface IOccurrenceModerationRepository {
  getOccurrenceById(occurrenceId: string): Promise<{ status: string } | null>;
  transitionStatus(
    occurrenceId: string,
    adminId: string,
    status: 'REJECTED',
    justification: string,
  ): Promise<unknown>;
}

export class RejectOccurrenceUseCase {
  constructor(private readonly repository: IOccurrenceModerationRepository) {}

  async execute(adminId: string, occurrenceId: string, justification: string): Promise<void> {
    if (!justification || justification.trim().length < 10) {
      throw new BadRequestError('Rejeição exige justificativa com pelo menos 10 caracteres (RN037).');
    }

    const occurrence = await this.repository.getOccurrenceById(occurrenceId);
    
    if (!occurrence) throw new NotFoundError('Ocorrência não encontrada.');
    
    if (!canTransitionOccurrence(occurrence.status, 'REJECTED')) {
      throw new ConflictError(`Apenas ocorrências UNDER_ANALYSIS podem ser rejeitadas. Status atual: ${occurrence.status}`);
    }

    await this.repository.transitionStatus(occurrenceId, adminId, 'REJECTED', justification.trim());
  }
}