type ObservationVisibility = 'INTERNAL' | 'CITIZEN_RESPONSE';

interface IOccurrenceModerationRepository {
  getOccurrenceById(occurrenceId: string): Promise<unknown | null>;
  createObservation(
    occurrenceId: string,
    adminId: string,
    content: string,
    visibility: ObservationVisibility
  ): Promise<string>;
}

const VALID_VISIBILITIES: ObservationVisibility[] = ['INTERNAL', 'CITIZEN_RESPONSE'];

export class CreateObservationUseCase {
  constructor(private readonly repository: IOccurrenceModerationRepository) {}

  async execute(
    adminId: string,
    occurrenceId: string,
    content: string,
    visibility: string
  ): Promise<{ observationId: string }> {
    if (!VALID_VISIBILITIES.includes(visibility as ObservationVisibility)) {
      throw new Error('Visibilidade inválida. Use INTERNAL ou CITIZEN_RESPONSE (RN044).');
    }

    if (!content || content.trim().length < 5) {
      throw new Error('O conteúdo da observação deve ter pelo menos 5 caracteres.');
    }

    const occurrence = await this.repository.getOccurrenceById(occurrenceId);
    if (!occurrence) throw new Error('Ocorrência não encontrada.');

    const observationId = await this.repository.createObservation(
      occurrenceId,
      adminId,
      content.trim(),
      visibility as ObservationVisibility
    );

    return { observationId };
  }
}