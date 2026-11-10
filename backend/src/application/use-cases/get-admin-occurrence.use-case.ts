import type {
  AdminOccurrenceDetail,
  IOccurrenceQueryRepository,
} from '../../domain/repositories/occurrence-query.repository.js';

export class GetAdminOccurrenceUseCase {
  constructor(private readonly repository: IOccurrenceQueryRepository) {}

  async execute(id: string): Promise<AdminOccurrenceDetail> {
    const item = await this.repository.getAdmin(id);
    if (!item) throw new Error('Ocorrência não encontrada.');
    return item;
  }
}