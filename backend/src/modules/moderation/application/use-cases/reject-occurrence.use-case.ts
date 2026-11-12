import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../../../shared/errors/app-error.js";

import type { IOccurrenceModerationRepository } from "../../domain/repositories/occurrence-moderation.repository.js";

export class RejectOccurrenceUseCase {
  constructor(private readonly repository: IOccurrenceModerationRepository) {}

  async execute(occurrenceId: string, justification: string): Promise<void> {
    if (!justification || justification.trim().length < 10) {
      throw new BadRequestError(
        "Rejeição exige justificativa com pelo menos 10 caracteres (RN037).",
      );
    }

    const occurrence = await this.repository.getOccurrenceById(occurrenceId);
    if (!occurrence) throw new NotFoundError("Ocorrência não encontrada.");

    if (occurrence.status !== "UNDER_ANALYSIS") {
      throw new ConflictError(
        `Apenas ocorrências UNDER_ANALYSIS podem ser rejeitadas. Status atual: ${occurrence.status}.`,
      );
    }

    await this.repository.transitionStatus(
      occurrenceId,
      "REJECTED",
      justification.trim(),
    );
  }
}