import type { SupabaseClient } from "@supabase/supabase-js";

import {
  OCCURRENCE_PHOTO_EXTENSION_BY_MIME,
  STORAGE_BUCKET_NAME,
  type OccurrencePhotoMime,
} from "../../../../config/constants.js";

import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../../../shared/errors/app-error.js";

import type {
  AiAnalysisData,
  CategoryData,
  FinalizeOccurrenceInput,
  IOccurrenceRepository,
  UserRoleData,
} from "../../domain/repositories/occurrence.repository.js";

function mapPgError(error: { code?: string; message: string }): never {
  if (error.code === "42501") throw new ForbiddenError(error.message);
  if (error.code === "P0002") throw new NotFoundError(error.message);
  if (error.code === "22023" || error.code === "23505") throw new ConflictError(error.message);
  throw new AppError(
    500,
    "OCCURRENCE_PERSIST_FAILED",
    "Não foi possível registrar a ocorrência.",
  );
}

export class SupabaseOccurrenceRepository implements IOccurrenceRepository {
  constructor(
    private readonly supabase: SupabaseClient,      // user client (JWT) — RPC usa auth.uid()
    private readonly adminClient: SupabaseClient,   // service_role — move no bucket
  ) {}

  async getUserRole(userId: string): Promise<UserRoleData | null> {
    const { data, error } = await this.supabase
      .from("user_roles")
      .select("role, is_active")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new AppError(500, "OCCURRENCE_LOOKUP_FAILED", "Falha ao consultar role.");
    }
    if (!data) return null;

    return {
      role: data.role as "CITIZEN" | "ADMIN",
      isActive: data.is_active,
    };
  }

  async getAiAnalysis(analysisId: string): Promise<AiAnalysisData | null> {
    const { data, error } = await this.supabase
      .from("ai_analyses")
      .select("id, user_id, status, suggested_category_id, suggested_description")
      .eq("id", analysisId)
      .maybeSingle();

    if (error) {
      throw new AppError(500, "OCCURRENCE_LOOKUP_FAILED", "Falha ao consultar análise.");
    }
    if (!data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      status: data.status as string,
      suggestedCategoryId: data.suggested_category_id,
      suggestedDescription: data.suggested_description,
    };
  }

  async getCategory(categoryId: string): Promise<CategoryData | null> {
    const { data, error } = await this.supabase
      .from("categories")
      .select("id, is_active")
      .eq("id", categoryId)
      .maybeSingle();

    if (error) {
      throw new AppError(500, "OCCURRENCE_LOOKUP_FAILED", "Falha ao consultar categoria.");
    }
    if (!data) return null;

    return { id: data.id, isActive: data.is_active };
  }

  async finalize(input: FinalizeOccurrenceInput): Promise<string> {
    // RPC 10 params, sem p_author_id (usa auth.uid())
    const { data, error } = await this.supabase.rpc("finalize_occurrence", {
      p_analysis_id:         input.aiAnalysisId,
      p_category_id:         input.categoryId,
      p_description:         input.description,
      p_category_source:     input.categorySource,
      p_description_source:  input.descriptionSource,
      p_location_lon:        input.location.lng,   // ordem: lon antes de lat
      p_location_lat:        input.location.lat,
      p_location_source:     input.locationSource ?? "GPS",
      p_location_accuracy_m: input.locationAccuracyM ?? null,
      p_photos: input.photos.map((p) => ({
        mime_type:  p.mimeType,
        size_bytes: p.sizeBytes,
      })),
    });

    if (error) mapPgError(error);

    const rows = data as Array<{ occurrence_id: string }> | null;
    const occurrenceId = rows?.[0]?.occurrence_id;
    if (!occurrenceId) {
      throw new AppError(
        500,
        "OCCURRENCE_PERSIST_FAILED",
        "RPC finalize_occurrence não retornou occurrence_id.",
      );
    }

    // Move fotos: temporary/{userId}/{analysisId}/photo-N.ext → occurrences/{occId}/photo-N.ext
    // O RPC já criou ocorrência + rows em occurrence_photos, mas o arquivo físico
    // permanece no temp. Sem esse move, signed URL falha em runtime.
    await this.movePhotos(input.aiAnalysisId, occurrenceId, input.photos);

    return occurrenceId;
  }

  private async movePhotos(
    analysisId: string,
    occurrenceId: string,
    photos: FinalizeOccurrenceInput["photos"],
  ): Promise<void> {
    // Precisamos do userId (dono). O RPC usa auth.uid() internamente; aqui
    // pegamos do JWT via admin auth.getUser? Não — o repo não tem o JWT direto.
    // Alternativa: o path original é `temporary/{userId}/{analysisId}/`.
    // O usuário sabe seu próprio ID. Mas o repo não recebe. Solução:
    // usar o `finalize_occurrence` return + consultar o author_id via admin.
    // Simplificação: o service_role lê a occurrence para pegar author_id.

    const { data: occ, error: occErr } = await this.adminClient
      .from("occurrences")
      .select("author_id")
      .eq("id", occurrenceId)
      .maybeSingle();

    if (occErr || !occ) {
      throw new AppError(
        500,
        "OCCURRENCE_PHOTO_MOVE_FAILED",
        `Ocorrência ${occurrenceId} criada, mas falha ao resolver author_id.`,
      );
    }

    const userId = occ.author_id as string;
    const errors: string[] = [];

    for (let i = 0; i < photos.length; i++) {
      const mime = photos[i]!.mimeType as OccurrencePhotoMime;
      const ext = OCCURRENCE_PHOTO_EXTENSION_BY_MIME[mime] ?? "jpg";
      const src = `temporary/${userId}/${analysisId}/photo-${i + 1}.${ext}`;
      const dst = `occurrences/${occurrenceId}/photo-${i + 1}.${ext}`;

      const { error: moveErr } = await this.adminClient.storage
        .from(STORAGE_BUCKET_NAME)
        .move(src, dst);

      if (moveErr) errors.push(`${src} → ${dst}: ${moveErr.message}`);
    }

    if (errors.length > 0) {
      throw new AppError(
        500,
        "OCCURRENCE_PHOTO_MOVE_FAILED",
        `Ocorrência ${occurrenceId} criada, mas falha ao mover fotos: ${errors.join("; ")}. ` +
        `Ação manual: mover arquivos no bucket ${STORAGE_BUCKET_NAME}.`,
      );
    }
  }
}