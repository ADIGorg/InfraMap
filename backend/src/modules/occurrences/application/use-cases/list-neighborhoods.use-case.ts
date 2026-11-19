import type { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../../../../shared/errors/app-error.js';

export async function listNeighborhoods(client: SupabaseClient) {
  const { data, error } = await client.from('administrative_neighborhoods')
    .select('id,name,municipality').eq('is_active', true).order('municipality').order('name');
  if (error) throw new AppError(500, 'NEIGHBORHOODS_UNAVAILABLE', 'Não foi possível consultar os bairros.');
  return data;
}
