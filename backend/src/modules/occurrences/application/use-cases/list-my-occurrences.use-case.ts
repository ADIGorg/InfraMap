import type {
  IOccurrenceQueryRepository,
  ListFilters,
  MyOccurrenceItem,
  PaginatedResult,
} from '../../domain/repositories/occurrence-query.repository.js';

export class ListMyOccurrencesUseCase {
  constructor(private readonly repository: IOccurrenceQueryRepository) {}

  async execute(userId: string, filters: ListFilters): Promise<PaginatedResult<MyOccurrenceItem>> {
    return this.repository.listMine(userId, filters);
  }
}