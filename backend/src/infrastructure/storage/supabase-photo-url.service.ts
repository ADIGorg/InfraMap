// src/infrastructure/storage/supabase-photo-url.service.ts

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  PHOTO_URL_EXPIRATION_SECONDS,
  STORAGE_BUCKET_NAME,
} from "../../config/constants.js";

import type {
  IPhotoUrlService,
  SignedPhotoUrl,
} from "../../modules/occurrences/domain/services/photo-url.service.js";

/**
 * @deprecated Use `STORAGE_BUCKET_NAME` de `config/constants.js`.
 * Re-exportado apenas para não quebrar imports legados.
 */
export const OCCURRENCE_PHOTOS_BUCKET = STORAGE_BUCKET_NAME;

export class SupabasePhotoUrlService implements IPhotoUrlService {
  constructor(private readonly supabase: SupabaseClient) {}

  async generate(
    storagePath: string,
    expiresInSeconds = PHOTO_URL_EXPIRATION_SECONDS,
  ): Promise<SignedPhotoUrl> {
    const { data, error } = await this.supabase.storage
      .from(STORAGE_BUCKET_NAME)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new Error(
        `Erro ao gerar URL assinada: ${error?.message ?? "resposta vazia"}`,
      );
    }

    const expiresAt = new Date(
      Date.now() + expiresInSeconds * 1000,
    ).toISOString();

    return { url: data.signedUrl, expiresAt, expiresInSeconds };
  }

  async generateBatch(
    storagePaths: string[],
    expiresInSeconds = PHOTO_URL_EXPIRATION_SECONDS,
  ): Promise<Record<string, SignedPhotoUrl>> {
    if (storagePaths.length === 0) return {};

    const { data, error } = await this.supabase.storage
      .from(STORAGE_BUCKET_NAME)
      .createSignedUrls(storagePaths, expiresInSeconds);

    if (error || !data) {
      throw new Error(
        `Erro ao gerar URLs assinadas em lote: ${error?.message ?? "resposta vazia"}`,
      );
    }

    const expiresAt = new Date(
      Date.now() + expiresInSeconds * 1000,
    ).toISOString();

    const result: Record<string, SignedPhotoUrl> = {};
    for (const item of data) {
      if (!item.path || !item.signedUrl || item.error) continue;
      result[item.path] = { url: item.signedUrl, expiresAt, expiresInSeconds };
    }
    return result;
  }
}