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