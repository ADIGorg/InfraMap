import {
  BadRequestError,
  NotFoundError,
} from "../../../../shared/errors/app-error.js";

import type {
  IOccurrenceModerationRepository,
  ObservationVisibility,
} from "../../domain/repositories/occurrence-moderation.repository.js";

const VALID_VISIBILITIES: readonly ObservationVisibility[] = [
  "INTERNAL",
  "CITIZEN_RESPONSE",
];

export class CreateObservationUseCase {
  constructor(private readonly repository: IOccurrenceModerationRepository) {}

  async execute(
    occurrenceId: string,
    content: string,
    visibility: string,
  ): Promise<{ observationId: string }> {
    if (!VALID_VISIBILITIES.includes(visibility as ObservationVisibility)) {
      throw new BadRequestError(
        "Visibilidade inválida. Use INTERNAL ou CITIZEN_RESPONSE (RN044).",
      );
    }

    if (!content || content.trim().length < 5) {
      throw new BadRequestError(
        "O conteúdo da observação deve ter pelo menos 5 caracteres.",
      );
    }

    const occurrence = await this.repository.getOccurrenceById(occurrenceId);
    if (!occurrence) throw new NotFoundError("Ocorrência não encontrada.");

    const observationId = await this.repository.createObservation(
      occurrenceId,
      content.trim(),
      visibility as ObservationVisibility,
    );

    return { observationId };
  }
}