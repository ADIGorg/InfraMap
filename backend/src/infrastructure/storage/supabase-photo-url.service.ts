import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  IPhotoUrlService,
  SignedPhotoUrl,
} from '../../modules/occurrences/domain/services/photo-url.service.js';

// Bucket privado — configurado nas migrations de AI-02 / DB-09.
// Se o nome real for outro, ajuste aqui (e mantenha consistência com AI-02).
export const OCCURRENCE_PHOTOS_BUCKET = 'occurrence-photos';

// Expiração curta obrigatória (RF27 / RN017 / LGPD)
// 5 minutos é suficiente para o cliente baixar/exibir a imagem.
const DEFAULT_EXPIRES_IN_SECONDS = 300;

export class SupabasePhotoUrlService implements IPhotoUrlService {
  constructor(private readonly supabase: SupabaseClient) {}

  async generate(
    storagePath: string,
    expiresInSeconds = DEFAULT_EXPIRES_IN_SECONDS
  ): Promise<SignedPhotoUrl> {
    const { data, error } = await this.supabase.storage
      .from(OCCURRENCE_PHOTOS_BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new Error(
        `Erro ao gerar URL assinada: ${error?.message ?? 'resposta vazia'}`
      );
    }

    const expiresAt = new Date(
      Date.now() + expiresInSeconds * 1000
    ).toISOString();

    return {
      url: data.signedUrl,
      expiresAt,
      expiresInSeconds,
    };
  }

  async generateBatch(
    storagePaths: string[],
    expiresInSeconds = DEFAULT_EXPIRES_IN_SECONDS
  ): Promise<Record<string, SignedPhotoUrl>> {
    if (storagePaths.length === 0) return {};

    const { data, error } = await this.supabase.storage
      .from(OCCURRENCE_PHOTOS_BUCKET)
      .createSignedUrls(storagePaths, expiresInSeconds);

    if (error || !data) {
      throw new Error(
        `Erro ao gerar URLs assinadas em lote: ${error?.message ?? 'resposta vazia'}`
      );
    }

    const expiresAt = new Date(
      Date.now() + expiresInSeconds * 1000
    ).toISOString();

    const result: Record<string, SignedPhotoUrl> = {};
    for (const item of data) {
      if (!item.path || !item.signedUrl || item.error) continue;
      result[item.path] = {
        url: item.signedUrl,
        expiresAt,
        expiresInSeconds,
      };
    }

    return result;
  }
}