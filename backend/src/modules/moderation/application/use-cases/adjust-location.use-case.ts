import {
  BadRequestError,
  NotFoundError,
} from "../../../../shared/errors/app-error.js";

import type {
  GeoCoordinate,
  IOccurrenceModerationRepository,
} from "../../domain/repositories/occurrence-moderation.repository.js";

export class AdjustLocationUseCase {
  constructor(private readonly repository: IOccurrenceModerationRepository) {}

  async execute(occurrenceId: string, newLocation: GeoCoordinate): Promise<void> {
    if (
      newLocation.lat < -90 || newLocation.lat > 90 ||
      newLocation.lng < -180 || newLocation.lng > 180
    ) {
      throw new BadRequestError("Coordenadas inválidas.");
    }

    const occurrence = await this.repository.getOccurrenceById(occurrenceId);
    if (!occurrence) throw new NotFoundError("Ocorrência não encontrada.");

    await this.repository.adjustLocation(occurrenceId, newLocation);
  }
}