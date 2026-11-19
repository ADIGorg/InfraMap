import type { SupabaseClient } from '@supabase/supabase-js';
import type { IPhotoAccessRepository, PhotoAccessInfo } from '../../domain/repositories/photo-access.repository.js';
import type { OccurrenceStatus } from '../../domain/repositories/occurrence-query.repository.js';

type RawPhotoRow = {
  id: string;
  occurrence_id: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  position: number;
<<<<<<< HEAD
  is_public: boolean;
  occurrences: { id: string; status: string; author_id: string; public_visible: boolean } | null;
=======
  occurrences: {
    id: string;
    status: string;
    author_id: string;
    public_visible: boolean;
    photo_public_consent: boolean;
  } | null;
>>>>>>> feature/web-ui-07-gestao-adm
};

export class SupabasePhotoAccessRepository implements IPhotoAccessRepository {
  constructor(private readonly supabase: SupabaseClient) {}
  async getPhotoInfo(photoId: string): Promise<PhotoAccessInfo | null> {
    const { data, error } = await this.supabase
      .from('occurrence_photos')
<<<<<<< HEAD
      .select('id, occurrence_id, storage_path, mime_type, size_bytes, position, is_public, occurrences!inner(id, status, author_id, public_visible)')
=======
      .select(
        'id, occurrence_id, storage_path, mime_type, size_bytes, position, occurrences!inner(id, status, author_id, public_visible, photo_public_consent)'
      )
>>>>>>> feature/web-ui-07-gestao-adm
      .eq('id', photoId)
      .maybeSingle();
    if (error) throw new Error(`Erro ao buscar foto: ${error.message}`);
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
      isPublic: row.is_public,
      occurrenceStatus: row.occurrences.status as OccurrenceStatus,
      occurrenceAuthorId: row.occurrences.author_id,
      occurrencePublicVisible: row.occurrences.public_visible,
      occurrencePhotoPublicConsent: row.occurrences.photo_public_consent === true,
    };
  }
}
