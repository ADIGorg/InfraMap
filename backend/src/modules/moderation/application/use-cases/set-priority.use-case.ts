import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../../../shared/errors/app-error.js";

import type {
  IOccurrenceModerationRepository,
  OccurrencePriority,
} from "../../domain/repositories/occurrence-moderation.repository.js";

const VALID_PRIORITIES: readonly OccurrencePriority[] = ["LOW", "MEDIUM", "HIGH"];

export class SetPriorityUseCase {
  constructor(private readonly repository: IOccurrenceModerationRepository) {}

  async execute(occurrenceId: string, priority: string): Promise<void> {
    if (!VALID_PRIORITIES.includes(priority as OccurrencePriority)) {
      throw new BadRequestError(
        "Prioridade inválida. Use LOW, MEDIUM ou HIGH (RN034).",
      );
    }

    const occurrence = await this.repository.getOccurrenceById(occurrenceId);
    if (!occurrence) throw new NotFoundError("Ocorrência não encontrada.");

    const ALLOWED = ["CONFIRMED", "IN_SERVICE", "RESOLVED"];
    if (!ALLOWED.includes(occurrence.status)) {
      throw new ConflictError(
        `Prioridade só pode ser definida/alterada em CONFIRMED, IN_SERVICE ou RESOLVED. Status atual: ${occurrence.status}.`
      );
    }

    await this.repository.setPriority(
      occurrenceId,
      priority as OccurrencePriority,
    );
  }
}