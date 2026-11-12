export type OccurrenceStatus =
  | "RECEIVED"
  | "UNDER_ANALYSIS"
  | "CONFIRMED"
  | "REJECTED"
  | "IN_SERVICE"
  | "RESOLVED";

export type OccurrencePriority = "LOW" | "MEDIUM" | "HIGH";
export type ObservationVisibility = "INTERNAL" | "CITIZEN_RESPONSE";

export interface GeoCoordinate {
  lat: number;
  lng: number;
}

export interface OccurrenceBasicInfo {
  id: string;
  status: OccurrenceStatus;
  priority: OccurrencePriority | null;
  authorId: string;
}

export interface HistoryEvent {
  id: string;
  type: "history" | "observation";
  action: string;
  actorId: string | null;
  createdAt: string;
  details: Record<string, unknown> | null;
  previousData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  content?: string | null;
  visibility?: ObservationVisibility;
}

export interface IOccurrenceModerationRepository {
  // Leitura
  getOccurrenceById(occurrenceId: string): Promise<OccurrenceBasicInfo | null>;
  getHistory(
    occurrenceId: string,
    includeInternalObservations: boolean,
  ): Promise<HistoryEvent[]>;

  // Transições (RPC transition_occurrence — usa auth.uid())
  transitionStatus(
    occurrenceId: string,
    newStatus: OccurrenceStatus,
    justification?: string,
  ): Promise<void>;

  startService(occurrenceId: string, actionNotes: string): Promise<void>;
  resolve(occurrenceId: string, resolutionNotes?: string): Promise<void>;

  // Prioridade (RPC update_occurrence_priority)
  setPriority(
    occurrenceId: string,
    priority: OccurrencePriority,
  ): Promise<void>;

  // Observação (RPC create_observation — retorna UUID da observação)
  createObservation(
    occurrenceId: string,
    content: string,
    visibility: ObservationVisibility,
  ): Promise<string>;

  // Localização (RPC adjust_occurrence_location)
  adjustLocation(
    occurrenceId: string,
    newLocation: GeoCoordinate,
  ): Promise<void>;

  // Classificação (RPC correct_occurrence_classification)
  correctClassification(
    occurrenceId: string,
    newCategoryId: string | null,
    newDescription: string | null,
  ): Promise<void>;
}