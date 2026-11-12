import type { SupabaseClient } from '@supabase/supabase-js';
import { mapPostgrestError } from '../../../../shared/errors/map-postgrest-error.js';
import type {
  GeoCoordinate,
  HistoryEvent,
  IOccurrenceModerationRepository,
  ObservationVisibility,
  OccurrenceBasicInfo,
  OccurrencePriority,
  OccurrenceStatus,
} from '../../domain/repositories/occurrence-moderation.repository.js';

export class SupabaseOccurrenceModerationRepository
  implements IOccurrenceModerationRepository
{
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly mutationClient: SupabaseClient = supabase,
  ) {}

  // ==========================================================
  // MOD-04 — ajustar localização
  // ==========================================================
  async adjustLocation(
    occurrenceId: string,
    adminId: string,
    newLocation: GeoCoordinate
  ): Promise<string> {
    const { data, error } = await this.mutationClient.rpc(
      'adjust_occurrence_location',
      {
        p_occurrence_id: occurrenceId,
        p_admin_id: adminId,
        p_new_lat: newLocation.lat,
        p_new_lng: newLocation.lng,
      }
    );
    if (error) throw mapPostgrestError(error, 'moderar a ocorrência');
    return data as string;
  }

  // ==========================================================
  // MOD-04 — corrigir categoria e/ou descrição
  // ==========================================================
  async correctClassification(
    occurrenceId: string,
    adminId: string,
    newCategoryId?: string | null,
    newDescription?: string | null
  ): Promise<string> {
    const { data, error } = await this.mutationClient.rpc(
      'correct_occurrence_classification',
      {
        p_occurrence_id: occurrenceId,
        p_admin_id: adminId,
        p_new_category_id: newCategoryId ?? null,
        p_new_description: newDescription ?? null,
      }
    );
    if (error) throw mapPostgrestError(error, 'moderar a ocorrência');
    return data as string;
  }

  // ==========================================================
  // MOD-03 — criar observação administrativa
  // ==========================================================
  async createObservation(
    occurrenceId: string,
    adminId: string,
    content: string,
    visibility: ObservationVisibility
  ): Promise<string> {
    const { data, error } = await this.mutationClient.rpc('create_occurrence_observation', {
      p_occurrence_id: occurrenceId,
      p_admin_id: adminId,
      p_content: content,
      p_visibility: visibility,
    });
    if (error) throw mapPostgrestError(error, 'moderar a ocorrência');
    return data as string;
  }

  // ==========================================================
  // MOD-03 — consultar histórico
  // ==========================================================
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
      throw mapPostgrestError(historyErr, 'consultar o histórico');
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
      throw mapPostgrestError(obsErr, 'consultar as observações');
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

    const visibleHistory = includeInternalObservations
      ? historyEvents
      : historyEvents.filter((event) => {
          if (event.action === 'OBSERVATION_INTERNAL_ADDED') return false;
          if (event.action !== 'OBSERVATION_ADDED') return true;
          return event.details?.visibility !== 'INTERNAL';
        });

    return [...visibleHistory, ...observationEvents].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  // ==========================================================
  // MOD-01 / MOD-02 — leitura básica
  // ==========================================================
  async getOccurrenceById(occurrenceId: string): Promise<OccurrenceBasicInfo | null> {
    const { data, error } = await this.supabase
      .from('occurrences')
      .select('id, status, priority, author_id')
      .eq('id', occurrenceId)
      .maybeSingle();

    if (error) throw mapPostgrestError(error, 'consultar a ocorrência');
    if (!data) return null;

    return {
      id: data.id,
      status: data.status as OccurrenceStatus,
      priority: (data.priority as OccurrencePriority | null) ?? null,
      authorId: data.author_id,
    };
  }

  // ==========================================================
  // MOD-01 — transição genérica de status
  // ==========================================================
  async transitionStatus(
    occurrenceId: string,
    adminId: string,
    newStatus: OccurrenceStatus,
    justification?: string
  ): Promise<string> {
    const { data, error } = await this.mutationClient.rpc('transition_occurrence_status', {
      p_occurrence_id: occurrenceId,
      p_admin_id: adminId,
      p_new_status: newStatus,
      p_justification: justification ?? null,
    });
    if (error) throw mapPostgrestError(error, 'moderar a ocorrência');
    return data as string;
  }

  // ==========================================================
  // MOD-02 — prioridade
  // ==========================================================
  async setPriority(
    occurrenceId: string,
    adminId: string,
    priority: OccurrencePriority
  ): Promise<string> {
    const { data, error } = await this.mutationClient.rpc('set_occurrence_priority', {
      p_occurrence_id: occurrenceId,
      p_admin_id: adminId,
      p_priority: priority,
    });
    if (error) throw mapPostgrestError(error, 'moderar a ocorrência');
    return data as string;
  }

  // ==========================================================
  // MOD-02 — iniciar atendimento
  // ==========================================================
  async startService(
    occurrenceId: string,
    adminId: string,
    actionNotes: string
  ): Promise<string> {
    const { data, error } = await this.mutationClient.rpc('start_occurrence_service', {
      p_occurrence_id: occurrenceId,
      p_admin_id: adminId,
      p_action_notes: actionNotes,
    });
    if (error) throw mapPostgrestError(error, 'moderar a ocorrência');
    return data as string;
  }

  // ==========================================================
  // MOD-02 — resolver
  // ==========================================================
  async resolve(
    occurrenceId: string,
    adminId: string,
    resolutionNotes?: string
  ): Promise<string> {
    const { data, error } = await this.mutationClient.rpc('resolve_occurrence', {
      p_occurrence_id: occurrenceId,
      p_admin_id: adminId,
      p_resolution_notes: resolutionNotes ?? null,
    });
    if (error) throw mapPostgrestError(error, 'moderar a ocorrência');
    return data as string;
  }
}