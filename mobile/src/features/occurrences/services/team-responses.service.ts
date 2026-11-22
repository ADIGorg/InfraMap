import { supabase } from '@/infrastructure/api/supabase-auth';
import { AppError } from '@/shared/errors/app-error';

export interface TeamResponse {
  id: string;
  content: string;
  created_at: string;
}

const PAGE_SIZE = 20;

export async function getTeamResponses(occurrenceId: string, offset: number, signal: AbortSignal) {
  const { data, error, status } = await supabase
    .from('observations')
    .select('id,content,created_at')
    .eq('occurrence_id', occurrenceId)
    .eq('visibility', 'CITIZEN_RESPONSE')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + PAGE_SIZE)
    .abortSignal(signal);

  if (error) {
    throw new AppError(status, error.code, 'Não foi possível carregar as respostas da equipe.');
  }

  const rows: TeamResponse[] = data ?? [];
  return {
    responses: rows.slice(0, PAGE_SIZE),
    nextOffset: rows.length > PAGE_SIZE ? offset + PAGE_SIZE : undefined,
  };
}
