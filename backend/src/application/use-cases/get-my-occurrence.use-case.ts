import type {
  IOccurrenceQueryRepository,
  MyOccurrenceDetail,
} from '../../domain/repositories/occurrence-query.repository.js';

export class GetMyOccurrenceUseCase {
  constructor(private readonly repository: IOccurrenceQueryRepository) {}

  async execute(userId: string, id: string): Promise<MyOccurrenceDetail> {
    const item = await this.repository.getMine(userId, id);
    if (!item) throw new Error('Ocorrência não encontrada.');
    return item;
  }
}