import { http } from '@/infrastructure/api/http-client';
import type { VoteCount } from '@/shared/types/api';

export async function createVote(occurrenceId: string): Promise<VoteCount> {
  const res = await http<{ data: VoteCount }>(
    `/occurrences/${occurrenceId}/votes`,
    { method: 'POST' },
  );
  return res.data;
}

export async function removeVote(occurrenceId: string): Promise<VoteCount> {
  const res = await http<{ data: VoteCount }>(
    `/occurrences/${occurrenceId}/votes/me`,
    { method: 'DELETE' },
  );
  return res.data;
}