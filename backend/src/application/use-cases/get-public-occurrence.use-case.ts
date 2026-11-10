import type {
  IOccurrenceQueryRepository,
  PublicOccurrenceDetail,
} from '../../domain/repositories/occurrence-query.repository.js';

export class GetPublicOccurrenceUseCase {
  constructor(private readonly repository: IOccurrenceQueryRepository) {}

  async execute(id: string): Promise<PublicOccurrenceDetail> {
    const item = await this.repository.getPublic(id);
    if (!item) throw new Error('Ocorrência não encontrada ou não é pública.');
    return item;
  }
}