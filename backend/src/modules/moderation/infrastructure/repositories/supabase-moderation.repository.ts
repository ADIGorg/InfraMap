import type { SupabaseClient } from "@supabase/supabase-js";

import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../../../shared/errors/app-error.js";

import type {
  GeoCoordinate,
  HistoryEvent,
  IOccurrenceModerationRepository,
  ObservationVisibility,
  OccurrenceBasicInfo,
  OccurrencePriority,
  OccurrenceStatus,
} from "../../domain/repositories/occurrence-moderation.repository.js";

// ============================================================
// Mapeamento de erro SQL → HTTP
//
// RPCs do banco usam `USING ERRCODE` específicos:
//   42501 = insufficient_privilege (auth)
//   P0002 = no_data_found (recurso)
//   22023 = invalid_parameter_value (transição inválida, prioridade, etc.)
//   23505 = unique_violation
// ============================================================
function mapPgError(error: { code?: string; message: string }): never {
  if (error.code === "42501") {
    throw new ForbiddenError("Acesso negado.");
  }
  if (error.code === "P0002") {
    throw new NotFoundError(error.message);
  }
  if (error.code === "22023" || error.code === "23505") {
    throw new ConflictError(error.message);
  }
  throw new AppError(
    500,
    "MODERATION_FAILED",
    "Falha ao executar operação administrativa.",
  );
}

export class SupabaseOccurrenceModerationRepository
  implements IOccurrenceModerationRepository
{
  constructor(private readonly supabase: SupabaseClient) {}

  // ==========================================================
  // Leitura básica
  // ==========================================================
  async getOccurrenceById(
    occurrenceId: string,
  ): Promise<OccurrenceBasicInfo | null> {
    const { data, error } = await this.supabase
      .from("occurrences")
      .select("id, status, priority, author_id")
      .eq("id", occurrenceId)
      .maybeSingle();

    if (error) {
      throw new AppError(
        500,
        "MODERATION_LOOKUP_FAILED",
        "Falha ao consultar a ocorrência.",
      );
    }
    if (!data) return null;

    return {
      id: data.id,
      status: data.status as OccurrenceStatus,
      priority: (data.priority as OccurrencePriority | null) ?? null,
      authorId: data.author_id,
    };
  }

  // ==========================================================
  // Histórico (history + observations)
  // ==========================================================
  async getHistory(
    occurrenceId: string,
    includeInternalObservations: boolean,
  ): Promise<HistoryEvent[]> {
    const { data: historyRows, error: historyErr } = await this.supabase
      .from("occurrence_history")
      .select("id, actor_id, action, previous_data, new_data, details, created_at")
      .eq("occurrence_id", occurrenceId)
      .order("created_at", { ascending: true });

    if (historyErr) {
      throw new AppError(
        500,
        "MODERATION_HISTORY_FAILED",
        "Falha ao consultar o histórico.",
      );
    }

    let obsQuery = this.supabase
      .from("observations")
      .select("id, admin_id, content, visibility, created_at")
      .eq("occurrence_id", occurrenceId);

    if (!includeInternalObservations) {
      obsQuery = obsQuery.eq("visibility", "CITIZEN_RESPONSE");
    }

    const { data: obsRows, error: obsErr } = await obsQuery;
    if (obsErr) {
      throw new AppError(
        500,
        "MODERATION_OBSERVATIONS_FAILED",
        "Falha ao consultar as observações.",
      );
    }

    const historyEvents: HistoryEvent[] = (historyRows ?? []).map((r) => ({
      id: r.id,
      type: "history",
      action: r.action,
      actorId: r.actor_id,
      createdAt: r.created_at,
      details: r.details,
      previousData: r.previous_data,
      newData: r.new_data,
    }));

    const observationEvents: HistoryEvent[] = (obsRows ?? []).map((r) => ({
      id: r.id,
      type: "observation",
      action: "OBSERVATION",
      actorId: r.admin_id,
      createdAt: r.created_at,
      details: null,
      content: r.content,
      visibility: r.visibility as ObservationVisibility,
    }));

    return [...historyEvents, ...observationEvents].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }

  // ==========================================================
  // Transições (RPC transition_occurrence)
  // ==========================================================
  async transitionStatus(
    occurrenceId: string,
    newStatus: OccurrenceStatus,
    justification?: string,
  ): Promise<void> {
    const { error } = await this.supabase.rpc("transition_occurrence", {
      p_occurrence_id: occurrenceId,
      p_new_status: newStatus,
      p_reason: justification ?? null,
      p_priority: null,
      p_action: null,
    });
    if (error) mapPgError(error);
  }

  async startService(occurrenceId: string, actionNotes: string): Promise<void> {
    // Priority já foi setada antes (use case valida). Passa null.
    const { error } = await this.supabase.rpc("transition_occurrence", {
      p_occurrence_id: occurrenceId,
      p_new_status: "IN_SERVICE",
      p_reason: null,
      p_priority: null,
      p_action: actionNotes,
    });
    if (error) mapPgError(error);
  }

  async resolve(occurrenceId: string, resolutionNotes?: string): Promise<void> {
    const { error } = await this.supabase.rpc("transition_occurrence", {
      p_occurrence_id: occurrenceId,
      p_new_status: "RESOLVED",
      p_reason: resolutionNotes ?? null,
      p_priority: null,
      p_action: null,
    });
    if (error) mapPgError(error);
  }

  // ==========================================================
  // Prioridade (RPC update_occurrence_priority)
  // ==========================================================
  async setPriority(
    occurrenceId: string,
    priority: OccurrencePriority,
  ): Promise<void> {
    const { error } = await this.supabase.rpc("update_occurrence_priority", {
      p_occurrence_id: occurrenceId,
      p_priority: priority,
    });
    if (error) mapPgError(error);
  }

  // ==========================================================
  // Observação (RPC create_observation) — retorna UUID
  // ==========================================================
  async createObservation(
    occurrenceId: string,
    content: string,
    visibility: ObservationVisibility,
  ): Promise<string> {
    const { data, error } = await this.supabase.rpc("create_observation", {
      p_occurrence_id: occurrenceId,
      p_content: content,
      p_visibility: visibility,
    });
    if (error) mapPgError(error);
    return data as string;
  }

  // ==========================================================
  // Localização (RPC adjust_occurrence_location)
  // ==========================================================
  async adjustLocation(
    occurrenceId: string,
    newLocation: GeoCoordinate,
  ): Promise<void> {
    const { error } = await this.supabase.rpc("adjust_occurrence_location", {
      p_occurrence_id: occurrenceId,
      p_new_lon: newLocation.lng,   // ordem: lon antes de lat
      p_new_lat: newLocation.lat,
    });
    if (error) mapPgError(error);
  }

  // ==========================================================
  // Classificação (RPC correct_occurrence_classification)
  // ==========================================================
  async correctClassification(
    occurrenceId: string,
    newCategoryId: string | null,
    newDescription: string | null,
  ): Promise<void> {
    const { error } = await this.supabase.rpc(
      "correct_occurrence_classification",
      {
        p_occurrence_id: occurrenceId,
        p_new_category_id: newCategoryId,
        p_new_description: newDescription,
      },
    );
    if (error) mapPgError(error);
  }
}