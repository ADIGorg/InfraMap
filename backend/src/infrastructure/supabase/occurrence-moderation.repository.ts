import { SupabaseClient } from '@supabase/supabase-js';
import type {
  IOccurrenceModerationRepository,
  OccurrenceBasicInfo,
  OccurrencePriority,
  OccurrenceStatus,
} from '../../domain/repositories/occurrence-moderation.repository.js';

function mapPgError(message: string): Error {
  for (const prefix of ['FORBIDDEN', 'NOT_FOUND', 'CONFLICT', 'BAD_REQUEST']) {
    if (message.includes(`${prefix}:`)) {
      return new Error(message.replace(`${prefix}:`, '').trim());
    }
  }
  return new Error(`Erro no banco: ${message}`);
}

export class SupabaseOccurrenceModerationRepository
  implements IOccurrenceModerationRepository
{
  constructor(private readonly supabase: SupabaseClient) {}

  async getOccurrenceById(occurrenceId: string): Promise<OccurrenceBasicInfo | null> {
    const { data, error } = await this.supabase
      .from('occurrences')
      .select('id, status, priority, author_id')
      .eq('id', occurrenceId)
      .maybeSingle();

    if (error) throw new Error(`Erro ao buscar ocorrência: ${error.message}`);
    if (!data) return null;

    return {
      id: data.id,
      status: data.status as OccurrenceStatus,
      priority: (data.priority as OccurrencePriority | null) ?? null,
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
    if (error) throw mapPgError(error.message);
    return data as string;
  }

  async setPriority(
    occurrenceId: string,
    adminId: string,
    priority: OccurrencePriority
  ): Promise<string> {
    const { data, error } = await this.supabase.rpc('set_occurrence_priority', {
      p_occurrence_id: occurrenceId,
      p_admin_id: adminId,
      p_priority: priority,
    });
    if (error) throw mapPgError(error.message);
    return data as string;
  }

  async startService(
    occurrenceId: string,
    adminId: string,
    actionNotes: string
  ): Promise<string> {
    const { data, error } = await this.supabase.rpc('start_occurrence_service', {
      p_occurrence_id: occurrenceId,
      p_admin_id: adminId,
      p_action_notes: actionNotes,
    });
    if (error) throw mapPgError(error.message);
    return data as string;
  }

  async resolve(
    occurrenceId: string,
    adminId: string,
    resolutionNotes?: string
  ): Promise<string> {
    const { data, error } = await this.supabase.rpc('resolve_occurrence', {
      p_occurrence_id: occurrenceId,
      p_admin_id: adminId,
      p_resolution_notes: resolutionNotes ?? null,
    });
    if (error) throw mapPgError(error.message);
    return data as string;
  }
}