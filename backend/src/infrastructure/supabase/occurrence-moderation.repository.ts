import { SupabaseClient } from '@supabase/supabase-js';
import type {
  HistoryEvent,
  IOccurrenceModerationRepository,
  ObservationVisibility,
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
  async createObservation(
    occurrenceId: string,
    adminId: string,
    content: string,
    visibility: ObservationVisibility
  ): Promise<string> {
    const { data, error } = await this.supabase.rpc('create_occurrence_observation', {
      p_occurrence_id: occurrenceId,
      p_admin_id: adminId,
      p_content: content,
      p_visibility: visibility,
    });
    if (error) throw mapPgError(error.message);
    return data as string;
  }

  async getHistory(
    occurrenceId: string,
    includeInternalObservations: boolean
  ): Promise<HistoryEvent[]> {
    const { data: historyRows, error: historyErr } = await this.supabase
      .from('occurrence_history')
      .select('id, actor_id, action, previous_data, new_data, details, created_at')
      .eq('occurrence_id', occurrenceId)
      .order('created_at', { ascending: true });

    if (historyErr) {
      throw new Error(`Erro ao buscar histórico: ${historyErr.message}`);
    }

    let obsQuery = this.supabase
      .from('observations')
      .select('id, admin_id, content, visibility, created_at')
      .eq('occurrence_id', occurrenceId);

    if (!includeInternalObservations) {
      obsQuery = obsQuery.eq('visibility', 'CITIZEN_RESPONSE');
    }

    const { data: obsRows, error: obsErr } = await obsQuery;
    if (obsErr) {
      throw new Error(`Erro ao buscar observações: ${obsErr.message}`);
    }

    const historyEvents: HistoryEvent[] = (historyRows ?? []).map((r) => ({
      id: r.id,
      type: 'history',
      action: r.action,
      actorId: r.actor_id,
      createdAt: r.created_at,
      details: r.details,
      previousData: r.previous_data,
      newData: r.new_data,
    }));

    const observationEvents: HistoryEvent[] = (obsRows ?? []).map((r) => ({
      id: r.id,
      type: 'observation',
      action: 'OBSERVATION',
      actorId: r.admin_id,
      createdAt: r.created_at,
      details: null,
      content: r.content,
      visibility: r.visibility as ObservationVisibility,
    }));

    return [...historyEvents, ...observationEvents].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

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
