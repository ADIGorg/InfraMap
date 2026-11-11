interface GeoCoordinate {
  lat: number;
  lng: number;
}

interface IOccurrenceModerationRepository {
  getOccurrenceById(occurrenceId: string): Promise<unknown>;
  adjustLocation(
    occurrenceId: string,
    adminId: string,
    newLocation: GeoCoordinate
  ): Promise<void>;
}

export class AdjustLocationUseCase {
  constructor(private readonly repository: IOccurrenceModerationRepository) {}

  async execute(
    adminId: string,
    occurrenceId: string,
    newLocation: GeoCoordinate
  ): Promise<void> {
    if (
      newLocation.lat < -90 || newLocation.lat > 90 ||
      newLocation.lng < -180 || newLocation.lng > 180
    ) {
      throw new Error('Coordenadas inválidas.');
    }

    const occurrence = await this.repository.getOccurrenceById(occurrenceId);
    if (!occurrence) throw new Error('Ocorrência não encontrada.');

    await this.repository.adjustLocation(occurrenceId, adminId, newLocation);
  }
}