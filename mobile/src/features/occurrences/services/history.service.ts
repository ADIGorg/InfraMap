import { http } from '@/infrastructure/api/http-client';
import type { HistoryEvent } from '@/shared/types/api';

export async function getOccurrenceHistory(
  occurrenceId: string,
): Promise<HistoryEvent[]> {
  return http<HistoryEvent[]>(`/occurrences/${occurrenceId}/history`);
}
