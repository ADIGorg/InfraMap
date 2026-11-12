import {
  ForbiddenError,
  NotFoundError,
} from "../../../../shared/errors/app-error.js";

import type {
  HistoryEvent,
  IOccurrenceModerationRepository,
} from "../../../moderation/domain/repositories/occurrence-moderation.repository.js";

export interface RequesterContext {
  userId: string;
  role: "CITIZEN" | "ADMIN";
}

export class GetOccurrenceHistoryUseCase {
  constructor(private readonly repository: IOccurrenceModerationRepository) {}

  async execute(requester: RequesterContext, occurrenceId: string): Promise<HistoryEvent[]> {
    const occurrence = await this.repository.getOccurrenceById(occurrenceId);
    if (!occurrence) throw new NotFoundError("Ocorrência não encontrada.");

    const isAdmin = requester.role === "ADMIN";
    const isAuthor = occurrence.authorId === requester.userId;

    if (!isAdmin && !isAuthor) {
      throw new ForbiddenError("Você não tem permissão para consultar o histórico desta ocorrência.");
    }

    return this.repository.getHistory(occurrenceId, isAdmin);
  }
}