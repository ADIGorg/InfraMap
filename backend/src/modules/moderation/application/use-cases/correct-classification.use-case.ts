import {
  BadRequestError,
  NotFoundError,
} from "../../../../shared/errors/app-error.js";

import type { IOccurrenceModerationRepository } from "../../domain/repositories/occurrence-moderation.repository.js";

export class CorrectClassificationUseCase {
  constructor(private readonly repository: IOccurrenceModerationRepository) {}

  async execute(
    occurrenceId: string,
    newCategoryId?: string | null,
    newDescription?: string | null,
  ): Promise<void> {
    if (!newCategoryId && !newDescription) {
      throw new BadRequestError("Informe ao menos uma correção (categoria ou descrição).");
    }

    if (newDescription !== undefined && newDescription !== null) {
      const trimmed = newDescription.trim();
      if (trimmed.length === 0) {
        throw new BadRequestError("A descrição não pode ser vazia.");
      }
      if (trimmed.length > 500) {
        throw new BadRequestError("A descrição deve ter no máximo 500 caracteres (RN009).");
      }
    }

    const occurrence = await this.repository.getOccurrenceById(occurrenceId);
    if (!occurrence) throw new NotFoundError("Ocorrência não encontrada.");

    await this.repository.correctClassification(
      occurrenceId,
      newCategoryId ?? null,
      newDescription ?? null,
    );
  }
}