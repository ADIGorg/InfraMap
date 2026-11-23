import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../../../shared/errors/app-error.js";

import type { IOccurrenceModerationRepository } from "../../domain/repositories/occurrence-moderation.repository.js";

export class RejectOccurrenceUseCase {
  constructor(private readonly repository: IOccurrenceModerationRepository) {}

  async execute(occurrenceId: string, justification: string, agencyResponse?: string): Promise<void> {
    const reason = justification.trim();
    const response = agencyResponse?.trim() || undefined;
    if (reason.length < 10 || reason.length > 2000) {
      throw new BadRequestError(
        "Informe uma justificativa de 10 a 2000 caracteres.",
      );
    }

    const occurrence = await this.repository.getOccurrenceById(occurrenceId);
    if (!occurrence) throw new NotFoundError("Ocorrência não encontrada.");

    if (occurrence.status !== "UNDER_ANALYSIS" && occurrence.status !== "CONFIRMED" && occurrence.status !== "IN_SERVICE") {
      throw new ConflictError(
        "A ocorrência precisa estar em análise, confirmada ou em atendimento para ser encerrada sem resolução.",
      );
    }

    const usesAgencyResponse = occurrence.status !== "UNDER_ANALYSIS";
    if (occurrence.status === "CONFIRMED" && !response) {
      throw new BadRequestError("Registre a resposta do órgão responsável.");
    }
    if (usesAgencyResponse && response && (response.length < 10 || response.length > 2000)) {
      throw new BadRequestError("A resposta do órgão deve ter de 10 a 2000 caracteres.");
    }

    await this.repository.transitionStatus(
      occurrenceId,
      "REJECTED",
      reason,
      usesAgencyResponse ? response : undefined,
    );
  }
}
