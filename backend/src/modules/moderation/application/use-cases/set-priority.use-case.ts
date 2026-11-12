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

    if (occurrence.status !== "CONFIRMED") {
      throw new ConflictError(
        `Apenas ocorrências CONFIRMED podem receber prioridade. Status atual: ${occurrence.status}.`,
      );
    }

    await this.repository.setPriority(
      occurrenceId,
      priority as OccurrencePriority,
    );
  }
}