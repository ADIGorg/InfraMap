import {
  ConflictError,
  NotFoundError,
} from "../../../../shared/errors/app-error.js";

import type { IOccurrenceModerationRepository } from "../../domain/repositories/occurrence-moderation.repository.js";

export class ResolveOccurrenceUseCase {
  constructor(private readonly repository: IOccurrenceModerationRepository) {}

  async execute(occurrenceId: string, resolutionNotes?: string): Promise<void> {
    const occurrence = await this.repository.getOccurrenceById(occurrenceId);
    if (!occurrence) throw new NotFoundError("Ocorrência não encontrada.");

    if (occurrence.status !== "IN_SERVICE") {
      throw new ConflictError(
        `Apenas ocorrências IN_SERVICE podem ser resolvidas. Status atual: ${occurrence.status}.`,
      );
    }

    await this.repository.resolve(occurrenceId, resolutionNotes?.trim());
  }
}