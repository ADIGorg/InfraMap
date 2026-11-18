import { http } from '@/infrastructure/api/http-client';
import type { AiAnalysisDetails } from '@/shared/types/registration';

export async function startAiAnalysis(id: string): Promise<void> {
  await http(`/ai-analyses/${id}/analyze`, { method: 'POST' });
}

export async function getAiAnalysis(id: string): Promise<AiAnalysisDetails> {
  return http<AiAnalysisDetails>(`/ai-analyses/${id}`);
}
