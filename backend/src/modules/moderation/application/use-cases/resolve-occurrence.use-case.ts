import { NotFoundError } from "../../../../shared/errors/app-error.js";
import { canTransitionOccurrence } from "../../domain/services/occurrence-transition-policy.js";
interface IOccurrenceModerationRepository {
  getOccurrenceById(
    occurrenceId: string
  ): Promise<{ status: string } | null | undefined>;
  resolve(
    occurrenceId: string,
    adminId: string,
    resolutionNotes?: string
  ): Promise<unknown>;
}

export class ResolveOccurrenceUseCase {
  constructor(private readonly repository: IOccurrenceModerationRepository) {}

  async execute(
    adminId: string,
    occurrenceId: string,
    resolutionNotes?: string
  ): Promise<void> {
    const occurrence = await this.repository.getOccurrenceById(occurrenceId);
    if (!occurrence) throw new NotFoundError('Ocorrência não encontrada.');

    if (!canTransitionOccurrence(occurrence.status, 'RESOLVED')) {
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