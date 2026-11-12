import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError, ForbiddenError } from "../../../../shared/errors/app-error.js";
import { mapPostgrestError } from "../../../../shared/errors/map-postgrest-error.js";
import { logger } from "../../../../shared/logger/logger.js";
import type {
  AiAnalysisData,
  CategoryData,
  FinalizeOccurrenceInput,
  IOccurrenceRepository,
  UserRoleData,
} from "../../domain/repositories/occurrence.repository.js";

const BUCKET = "occurrence-photos";

/**
 * SELECT/RPC pelo JWT do cidadão. A chave privilegiada só é usada
 * para copiar os objetos do Storage antes da transação SQL.
 * O banco é a autoridade sobre análise, propriedade, status e consumo.
 */
export class SupabaseOccurrenceRepository implements IOccurrenceRepository {
  constructor(
    private readonly userClient: SupabaseClient,
    private readonly storageClient: SupabaseClient,
  ) {}

  async getUserRole(userId: string): Promise<UserRoleData | null> {
    const { data, error } = await this.userClient
      .from("user_roles")
      .select("role, is_active")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw mapPostgrestError(error, "consultar o papel");
    if (!data) return null;
    return { role: data.role as "CITIZEN" | "ADMIN", isActive: data.is_active };
  }

  async getAiAnalysis(analysisId: string): Promise<AiAnalysisData | null> {
    const { data, error } = await this.userClient
      .from("ai_analyses")
      .select("id, user_id, status, suggested_category_id, suggested_description")
      .eq("id", analysisId)
      .maybeSingle();
    if (error) throw mapPostgrestError(error, "consultar a análise");
    if (!data) return null;
    return {
      id: data.id,
      userId: data.user_id,
      status: data.status,
      suggestedCategoryId: data.suggested_category_id,
      suggestedDescription: data.suggested_description,
    };
  }

  async getCategory(categoryId: string): Promise<CategoryData | null> {
    const { data, error } = await this.userClient
      .from("categories")
      .select("id, is_active")
      .eq("id", categoryId)
      .maybeSingle();
    if (error) throw mapPostgrestError(error, "consultar a categoria");
    if (!data) return null;
    return { id: data.id, isActive: data.is_active };
  }

  async finalize(input: FinalizeOccurrenceInput, userId: string): Promise<string> {
    const occurrenceId = randomUUID();
    const photos = input.photos.map((photo, index) => {
      const extension =
        photo.mimeType === "image/png" ? "png" :
        photo.mimeType === "image/jpeg" ? "jpg" : null;
      if (!extension) {
        throw new ForbiddenError("Formato de fotografia não permitido.");
      }
      const expectedSource = `temporary/${userId}/${input.aiAnalysisId}/photo-${index + 1}.${extension}`;
      if (photo.storagePath !== expectedSource) {
        throw new ForbiddenError("Fotografia não pertence à análise informada.");
      }
      return {
        source: expectedSource,
        destination: `occurrences/${occurrenceId}/photo-${index + 1}.${extension}`,
        mimeType: photo.mimeType,
        sizeBytes: photo.sizeBytes,
      };
    });

    const bucket = this.storageClient.storage.from(BUCKET);
    const copied: string[] = [];
    try {
      // Pré-etapa externa: o Storage não participa da transação PostgreSQL.
      // Em caso de erro, remove apenas objetos desta tentativa.
      for (const photo of photos) {
        const { error } = await bucket.copy(photo.source, photo.destination);
        if (error) {
          throw new AppError(
            503, "PHOTO_COPY_FAILED",
            "Não foi possível preparar as fotografias para o cadastro.",
          );
        }
        copied.push(photo.destination);
      }

      // Todas as escritas PostgreSQL ocorrem na mesma chamada transacional.
      const { data, error } = await this.userClient.rpc("finalize_occurrence", {
        p_author_id: userId,
        p_ai_analysis_id: input.aiAnalysisId,
        p_category_id: input.categoryId,
        p_description: input.description,
        p_lat: input.location.lat,
        p_lng: input.location.lng,
        p_location_source: input.location.source,
        p_category_source: input.categorySource,
        p_description_source: input.descriptionSource,
        p_occurrence_id: occurrenceId,
        p_photos: photos.map((photo) => ({
          storagePath: photo.destination,
          mimeType: photo.mimeType,
          sizeBytes: photo.sizeBytes,
        })),
      });
      if (error) throw mapPostgrestError(error, "registrar a ocorrência");
      if (data !== occurrenceId) {
        throw new AppError(500, "INVALID_FINALIZATION_RESULT", "Resultado de cadastro inválido.");
      }

      // Pós-etapa não crítica. O cadastro JÁ está confirmado; falha na limpeza
      // não pode gerar um 5xx que induza o cidadão a tentar cadastrar de novo.
      const { error: cleanupError } = await bucket.remove(photos.map((p) => p.source));
      if (cleanupError) logger.warn({ occurrenceId }, "temporary_photos_cleanup_pending");
      return occurrenceId;
    } catch (error) {
      if (copied.length) {
        const { error: cleanupError } = await bucket.remove(copied);
        if (cleanupError) logger.warn({ occurrenceId }, "failed_finalization_cleanup_pending");
      }
      throw error;
    }
  }
}
