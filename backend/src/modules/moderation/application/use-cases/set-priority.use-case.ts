import { BadRequestError, NotFoundError, ConflictError } from "../../../../shared/errors/app-error.js";
type OccurrencePriority = 'LOW' | 'MEDIUM' | 'HIGH';

interface IOccurrenceModerationRepository {
  getOccurrenceById(occurrenceId: string): Promise<{ status: string } | null>;
  setPriority(
    occurrenceId: string,
    adminId: string,
    priority: OccurrencePriority
  ): Promise<unknown>;
}

const VALID_PRIORITIES: OccurrencePriority[] = ['LOW', 'MEDIUM', 'HIGH'];

export class SetPriorityUseCase {
  constructor(private readonly repository: IOccurrenceModerationRepository) {}

  async execute(
    adminId: string,
    occurrenceId: string,
    priority: string
  ): Promise<void> {
    if (!VALID_PRIORITIES.includes(priority as OccurrencePriority)) {
      throw new BadRequestError('Prioridade inválida. Use LOW, MEDIUM ou HIGH (RN034).');
    }

    const occurrence = await this.repository.getOccurrenceById(occurrenceId);
    if (!occurrence) throw new NotFoundError('Ocorrência não encontrada.');

    if (occurrence.status !== 'CONFIRMED') {
      throw new ConflictError(
        `Apenas ocorrências CONFIRMED podem receber prioridade. Status atual: ${occurrence.status}.`
      );
    }

    await this.repository.setPriority(
      occurrenceId,
      adminId,
      priority as OccurrencePriority
    );
  }
}