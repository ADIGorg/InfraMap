import { http } from '@/infrastructure/api/http-client';

export async function startOccurrenceAnalysis(id: string) {
  await http('/admin/occurrences/' + encodeURIComponent(id) + '/start-analysis', { method: 'PATCH' });
}

