import type {
  AdminOccurrenceItem,
  IOccurrenceQueryRepository,
  ListFilters,
  PaginatedResult,
} from '../../domain/repositories/occurrence-query.repository.js';

export class ListAdminOccurrencesUseCase {
  constructor(private readonly repository: IOccurrenceQueryRepository) {}

  async execute(filters: ListFilters): Promise<PaginatedResult<AdminOccurrenceItem>> {
    return this.repository.listAdmin(filters);
  }
}