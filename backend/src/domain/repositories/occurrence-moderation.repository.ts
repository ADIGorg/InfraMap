export type OccurrenceStatus = 'RECEIVED' | 'UNDER_ANALYSIS' | 'CONFIRMED' | 'REJECTED' | 'IN_PROGRESS' | 'RESOLVED';

export interface OccurrenceBasicInfo {
  id: string;
  status: OccurrenceStatus;
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
}