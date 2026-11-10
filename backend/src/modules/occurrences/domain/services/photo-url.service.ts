export interface SignedPhotoUrl {
  url: string;
  expiresAt: string; // ISO 8601
  expiresInSeconds: number;
}

export interface IPhotoUrlService {
  /**
   * Gera URL assinada para uma foto isolada.
   * @param storagePath  path dentro do bucket privado
   * @param expiresInSeconds  expiração (default: 300s = 5min)
   */
  generate(storagePath: string, expiresInSeconds?: number): Promise<SignedPhotoUrl>;

  /**
   * Gera URLs assinadas para um lote de fotos.
   * Útil para enriquecer o detalhe de uma ocorrência de uma só vez.
   */
  generateBatch(
    storagePaths: string[],
    expiresInSeconds?: number
  ): Promise<Record<string, SignedPhotoUrl>>;
}