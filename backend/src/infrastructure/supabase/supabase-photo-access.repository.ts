import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  IPhotoAccessRepository,
  PhotoAccessInfo,
} from '../../domain/repositories/photo-access.repository.js';
import type { OccurrenceStatus } from '../../domain/repositories/occurrence-query.repository.js';

type RawPhotoRow = {
  id: string;
  occurrence_id: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  position: number;
  occurrences: {
    id: string;
    status: string;
    author_id: string;
  } | null;
};

export class SupabasePhotoAccessRepository implements IPhotoAccessRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getPhotoInfo(photoId: string): Promise<PhotoAccessInfo | null> {
    const { data, error } = await this.supabase
      .from('occurrence_photos')
      .select(
        'id, occurrence_id, storage_path, mime_type, size_bytes, position, occurrences!inner(id, status, author_id)'
      )
      .eq('id', photoId)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar foto: ${error.message}`);
    }
    if (!data) return null;

    const row = data as unknown as RawPhotoRow;
    if (!row.occurrences) return null;

    return {
      photoId: row.id,
      occurrenceId: row.occurrence_id,
      storagePath: row.storage_path,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      position: row.position,
      occurrenceStatus: row.occurrences.status as OccurrenceStatus,
      occurrenceAuthorId: row.occurrences.author_id,
    };
  }
}