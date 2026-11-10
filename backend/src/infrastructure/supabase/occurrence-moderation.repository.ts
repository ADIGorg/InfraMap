import { SupabaseClient } from '@supabase/supabase-js';
import type {
  IOccurrenceModerationRepository,
  OccurrenceBasicInfo,
  OccurrenceStatus,
} from '../../domain/repositories/occurrence-moderation.repository.js';

export class SupabaseOccurrenceModerationRepository implements IOccurrenceModerationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getOccurrenceById(occurrenceId: string): Promise<OccurrenceBasicInfo | null> {
    const { data, error } = await this.supabase
      .from('occurrences')
      .select('id, status, author_id')
      .eq('id', occurrenceId)
      .maybeSingle();

    if (error) throw new Error(`Erro ao buscar ocorrência: ${error.message}`);
    if (!data) return null;

    return {
      id: data.id,
      status: data.status as OccurrenceStatus,
      authorId: data.author_id,
    };
  }

  async transitionStatus(
    occurrenceId: string,
    adminId: string,
    newStatus: OccurrenceStatus,
    justification?: string
  ): Promise<string> {
    const { data, error } = await this.supabase.rpc('transition_occurrence_status', {
      p_occurrence_id: occurrenceId,
      p_admin_id: adminId,
      p_new_status: newStatus,
      p_justification: justification ?? null,
    });

    if (error) {
      // Mapeia o erro do Postgres para o padrão do projeto (ex: AppError)
      const msg = error.message;
      if (msg.includes('CONFLICT:')) throw new Error(msg.replace('CONFLICT:', '').trim());
      if (msg.includes('NOT_FOUND:')) throw new Error(msg.replace('NOT_FOUND:', '').trim());
      if (msg.includes('BAD_REQUEST:')) throw new Error(msg.replace('BAD_REQUEST:', '').trim());
      if (msg.includes('FORBIDDEN:')) throw new Error(msg.replace('FORBIDDEN:', '').trim());
      throw new Error(`Falha na transição de status: ${msg}`);
    }

    return data as string;
  }
}