import type {
    IOccurrenceModerationRepository,
    HistoryEvent,
} from '../../domain/repositories/occurrence-moderation.repository.js';

export interface RequesterContext {
  userId: string;
  role: 'CITIZEN' | 'ADMIN';
}

export class GetOccurrenceHistoryUseCase {
  constructor(private readonly repository: IOccurrenceModerationRepository) {}

  async execute(
    requester: RequesterContext,
    occurrenceId: string
  ): Promise<HistoryEvent[]> {
    const occurrence = await this.repository.getOccurrenceById(occurrenceId);
    if (!occurrence) throw new Error('Ocorrência não encontrada.');

    // Autorização (RN045 e RN046):
    //   - Cidadão só vê o histórico da PRÓPRIA ocorrência
    //   - Admin vê o histórico de qualquer ocorrência
    const isAdmin = requester.role === 'ADMIN';
    const isAuthor = occurrence.authorId === requester.userId;

    if (!isAdmin && !isAuthor) {
      throw new Error('Você não tem permissão para consultar o histórico desta ocorrência.');
    }

    // Regra de visibilidade (RN044):
    //   - INTERNAL: visível apenas ao admin
    //   - CITIZEN_RESPONSE: visível ao autor e ao admin
    // O filtro de INTERNAL é aplicado no repositório via `includeInternalObservations`.
    return this.repository.getHistory(occurrenceId, isAdmin);
  }
}