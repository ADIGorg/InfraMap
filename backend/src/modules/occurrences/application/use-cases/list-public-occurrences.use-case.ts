import type {
  IOccurrenceQueryRepository,
  ListFilters,
  PaginatedResult,
  PublicOccurrenceItem,
} from '../../domain/repositories/occurrence-query.repository.js';

export class ListPublicOccurrencesUseCase {
  constructor(private readonly repository: IOccurrenceQueryRepository) {}

  async execute(filters: ListFilters): Promise<PaginatedResult<PublicOccurrenceItem>> {
    // Força status públicas (defesa em profundidade — RPC também força)
    return this.repository.listPublic({ ...filters, statuses: undefined });
  }
}