import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../../../shared/errors/app-error.js";

import type { IOccurrenceModerationRepository } from "../../domain/repositories/occurrence-moderation.repository.js";

export class StartServiceUseCase {
  constructor(private readonly repository: IOccurrenceModerationRepository) {}

  async execute(occurrenceId: string, actionNotes: string): Promise<void> {
    if (!actionNotes || actionNotes.trim().length < 10) {
      throw new BadRequestError(
        "É obrigatório registrar a ação concreta que caracteriza o início do atendimento (RN061).",
      );
    }

    const occurrence = await this.repository.getOccurrenceById(occurrenceId);
    if (!occurrence) throw new NotFoundError("Ocorrência não encontrada.");

    if (occurrence.status !== "CONFIRMED") {
      throw new ConflictError(
        `Apenas ocorrências CONFIRMED podem ir para IN_SERVICE. Status atual: ${occurrence.status}.`,
      );
    }

    if (!occurrence.priority) {
      throw new ConflictError(
        "É obrigatório definir a prioridade antes de iniciar o atendimento (RN061).",
      );
    }

    await this.repository.startService(occurrenceId, actionNotes.trim());
  }
}