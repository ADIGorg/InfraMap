import { ConflictError, NotFoundError } from "../../../../shared/errors/app-error.js";
import { canTransitionOccurrence } from "../../domain/services/occurrence-transition-policy.js";
interface IOccurrenceModerationRepository {
  getOccurrenceById(occurrenceId: string): Promise<
    { status: string; priority?: unknown } | null | undefined
  >;
  startService(
    occurrenceId: string,
    adminId: string,
    actionNotes: string
  ): Promise<unknown>;
}

export class StartServiceUseCase {
  constructor(private readonly repository: IOccurrenceModerationRepository) {}

  async execute(
    adminId: string,
    occurrenceId: string,
    actionNotes: string
  ): Promise<void> {
    if (!actionNotes || actionNotes.trim().length < 10) {
      throw new Error(
        'É obrigatório registrar a ação concreta que caracteriza o início do atendimento (RN061).'
      );
    }

    const occurrence = await this.repository.getOccurrenceById(occurrenceId);
    if (!occurrence) throw new NotFoundError('Ocorrência não encontrada.');

    if (!canTransitionOccurrence(occurrence.status, 'IN_SERVICE')) {
      throw new Error(
        `Apenas ocorrências CONFIRMED podem ir para IN_SERVICE. Status atual: ${occurrence.status}.`
      );
    }

    if (!occurrence.priority) {
      throw new Error(
        'É obrigatório definir a prioridade antes de iniciar o atendimento (RN061).'
      );
    }

    await this.repository.startService(
      occurrenceId,
      adminId,
      actionNotes.trim()
    );
  }
}