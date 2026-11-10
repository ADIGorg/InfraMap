export type OccurrenceStatus =
  | 'RECEIVED'
  | 'UNDER_ANALYSIS'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'IN_SERVICE'   // ← antes era IN_PROGRESS
  | 'RESOLVED';

export type OccurrencePriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface OccurrenceBasicInfo {
  id: string;
  status: OccurrenceStatus;
  priority: OccurrencePriority | null;
  authorId: string;
}

export interface IOccurrenceModerationRepository {
  getOccurrenceById(occurrenceId: string): Promise<OccurrenceBasicInfo | null>;

  transitionStatus(
    occurrenceId: string,
    adminId: string,
    newStatus: OccurrenceStatus,
    justification?: string
  ): Promise<string>;

  // MOD-02
  setPriority(
    occurrenceId: string,
    adminId: string,
    priority: OccurrencePriority
  ): Promise<string>;

  startService(
    occurrenceId: string,
    adminId: string,
    actionNotes: string
  ): Promise<string>;

  resolve(
    occurrenceId: string,
    adminId: string,
    resolutionNotes?: string
  ): Promise<string>;
}
export type ObservationVisibility = 'INTERNAL' | 'CITIZEN_RESPONSE';

export interface HistoryEvent {
  id: string;
  type: 'history' | 'observation';
  action: string;
  actorId: string | null;
  createdAt: string;
  details: Record<string, unknown> | null;
  previousData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  // Para observations
  content?: string | null;
  visibility?: ObservationVisibility;
}

// Estenda a interface IOccurrenceModerationRepository:
export interface IOccurrenceModerationRepository {
  // ... métodos do MOD-01 e MOD-02 ...

  createObservation(
    occurrenceId: string,
    adminId: string,
    content: string,
    visibility: ObservationVisibility
  ): Promise<string>;

  /**
   * Retorna todos os eventos da linha do tempo.
   * A filtragem de visibilidade (INTERNAL só para admin) é feita aqui
   * — o use case decide quem é o solicitante e passa o flag.
   */
  getHistory(
    occurrenceId: string,
    includeInternalObservations: boolean
  ): Promise<HistoryEvent[]>;
}

export interface GeoCoordinate {
  lat: number;
  lng: number;
}

// Estenda a interface IOccurrenceModerationRepository:
export interface IOccurrenceModerationRepository {
  // ... métodos existentes (MOD-01 a MOD-03) ...

  // MOD-04
  adjustLocation(
    occurrenceId: string,
    adminId: string,
    newLocation: GeoCoordinate
  ): Promise<string>;

  correctClassification(
    occurrenceId: string,
    adminId: string,
    newCategoryId?: string | null,
    newDescription?: string | null
  ): Promise<string>;
}