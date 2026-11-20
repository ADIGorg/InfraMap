import {
  http,
} from '@/infrastructure/api/http-client';

import type {
  VoteCount,
} from '@/shared/types/api';

export function createVote(
  occurrenceId: string,
): Promise<VoteCount> {
  return http<VoteCount>(
    `/occurrences/${occurrenceId}/votes`,
    {
      method: 'POST',
    },
  );
}

export function removeVote(
  occurrenceId: string,
): Promise<VoteCount> {
  return http<VoteCount>(
    `/occurrences/${occurrenceId}/votes/me`,
    {
      method: 'DELETE',
    },
  );
}