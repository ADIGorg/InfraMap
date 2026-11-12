import {
  ConflictError,
  NotFoundError,
} from "../../../../shared/errors/app-error.js";

import type { IOccurrenceModerationRepository } from "../../domain/repositories/occurrence-moderation.repository.js";

export class StartAnalysisUseCase {
  constructor(private readonly repository: IOccurrenceModerationRepository) {}

  async execute(occurrenceId: string): Promise<void> {
    const occurrence = await this.repository.getOccurrenceById(occurrenceId);
    if (!occurrence) throw new NotFoundError("Ocorrência não encontrada.");

    if (occurrence.status !== "RECEIVED") {
      throw new ConflictError(
        `Apenas ocorrências RECEIVED podem iniciar análise. Status atual: ${occurrence.status}.`,
      );
    }

    await this.repository.transitionStatus(occurrenceId, "UNDER_ANALYSIS");
  }
}