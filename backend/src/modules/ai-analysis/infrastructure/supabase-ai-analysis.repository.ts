
import type {
  SupabaseClient,
} from "@supabase/supabase-js";


import {
  AppError,
} from "../../../shared/errors/app-error.js";


import type {
  AiAnalysisRepository,
  AiPhotoMime,
} from "../application/use-cases/create-ai-analysis.use-case.js";

const BUCKET = "occurrence-photos";

export class SupabaseAiAnalysisRepository
  implements AiAnalysisRepository {

  constructor(
    private readonly supabase: SupabaseClient
  ) {}

  async uploadPhoto(
    path: string,
    buffer: Buffer,
    mime: AiPhotoMime
  ): Promise<void> {
    const { error } = await this.supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: mime,
        upsert: false,
      });

    if (error) {
      throw new AppError(
        503,
        "AI_STORAGE_FAILED",
        "Não foi possível armazenar a fotografia."
      );
    }
  }

  async createAnalysis(
    userId: string,
    analysisId: string,
    photoPaths: string[]
  ): Promise<void> {
    const { error } = await this.supabase
      .from("ai_analyses")
      .insert({
        id: analysisId,
        user_id: userId,
        input_photo_paths: photoPaths,
        status: "PENDING",
      });

    if (error) {
      throw new AppError(
        503,
        "AI_ANALYSIS_CREATE_FAILED",
        "Não foi possível registrar a análise."
      );
    }
  }

  async removePhotos(
    paths: string[]
  ): Promise<void> {
    if (paths.length === 0) return;

    const { error } = await this.supabase.storage
      .from(BUCKET)
      .remove(paths);

    if (error) {
      throw new AppError(
        503,
        "AI_STORAGE_CLEANUP_FAILED",
        "Não foi possível remover arquivos temporários."
      );
    }
  }
}
