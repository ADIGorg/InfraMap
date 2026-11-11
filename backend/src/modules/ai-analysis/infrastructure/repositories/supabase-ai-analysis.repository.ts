import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../../../shared/errors/app-error.js";
import type {
  AiAnalysisRepository, AiPhotoMime, AiProcessingRepository, AnalysisDraft, AiAnalysisReader,
} from "../../application/ports/ai-analysis.repository.js";
import type { AiAnalysisDetailsDto } from "../../application/dtos/ai-analysis.dto.js";

const BUCKET = "occurrence-photos";

/** Persistência de um único agregado; acesso privilegiado sempre limitado por user_id. */
export class SupabaseAiAnalysisRepository implements AiAnalysisRepository, AiProcessingRepository, AiAnalysisReader {
  constructor(private readonly supabase: SupabaseClient) {}

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

  async findOwn(
    userId: string,
    analysisId: string
  ): Promise<AnalysisDraft | null> {
    const { data, error } = await this.supabase
      .from("ai_analyses")
      .select("id, status, input_photo_paths")
      .eq("id", analysisId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new AppError(
        503,
        "AI_DATABASE_ERROR",
        "Não foi possível consultar a análise."
      );
    }

    if (!data) return null;

    return {
      id: data.id,
      status: data.status,
      photoPaths: Array.isArray(data.input_photo_paths)
        ? data.input_photo_paths
        : [],
    };
  }

  async startProcessing(
    userId: string,
    analysisId: string
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("ai_analyses")
      .update({
        status: "PROCESSING",
        error_code: null,
        completed_at: null,
      })
      .eq("id", analysisId)
      .eq("user_id", userId)
      .in("status", ["PENDING", "FAILED"])
      .select("id")
      .maybeSingle();

    if (error) {
      throw new AppError(
        503,
        "AI_DATABASE_ERROR",
        "Não foi possível iniciar o processamento."
      );
    }

    return data !== null;
  }

  async findActiveCategoryId(
    code: string
  ): Promise<string | null> {
    const { data, error } = await this.supabase
      .from("categories")
      .select("id")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      throw new AppError(
        503,
        "AI_DATABASE_ERROR",
        "Não foi possível consultar a categoria."
      );
    }

    return data?.id ?? null;
  }

  async saveCompleted(
    userId: string,
    analysisId: string,
    result: {
      categoryId: string;
      description: string;
      confidence: number;
      modelName: string;
      promptVersion: string;
    }
  ): Promise<void> {
    const { data, error } = await this.supabase
      .from("ai_analyses")
      .update({
        status: "COMPLETED",
        suggested_category_id: result.categoryId,
        suggested_description: result.description,
        confidence: result.confidence,
        model_name: result.modelName,
        prompt_version: result.promptVersion,
        error_code: null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", analysisId)
      .eq("user_id", userId)
      .eq("status", "PROCESSING")
      .select("id")
      .maybeSingle();

    if (error || !data) {
      throw new AppError(
        503,
        "AI_SAVE_FAILED",
        "Não foi possível salvar o resultado da análise."
      );
    }
  }

  async markFailed(
    userId: string,
    analysisId: string,
    errorCode: string
  ): Promise<void> {
    const { data, error } = await this.supabase
      .from("ai_analyses")
      .update({
        status: "FAILED",
        error_code: errorCode,
        completed_at: null,
      })
      .eq("id", analysisId)
      .eq("user_id", userId)
      .eq("status", "PROCESSING")
      .select("id")
      .maybeSingle();

    if (error || !data) {
      throw new AppError(
        503,
        "AI_STATUS_UPDATE_FAILED",
        "Não foi possível registrar a falha."
      );
    }
  }

  // Consulta os detalhes da própria análise.
  async getOwnDetails(
    userId: string,
    analysisId: string
  ): Promise<AiAnalysisDetailsDto | null> {
    const { data, error } = await this.supabase
      .from("ai_analyses")
      .select(`
        id,
        status,
        input_photo_paths,
        suggested_category_id,
        suggested_description,
        confidence,
        model_name,
        prompt_version,
        error_code,
        created_at,
        completed_at
      `)
      .eq("id", analysisId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new AppError(
        503,
        "AI_DATABASE_ERROR",
        "Não foi possível consultar a análise."
      );
    }

    if (!data) return null;

    let categoryCode: string | null = null;

    if (data.suggested_category_id) {
      const { data: category, error: categoryError } =
        await this.supabase
          .from("categories")
          .select("code")
          .eq("id", data.suggested_category_id)
          .maybeSingle();

      if (categoryError) {
        throw new AppError(
          503,
          "AI_DATABASE_ERROR",
          "Não foi possível consultar a categoria."
        );
      }

      categoryCode = category?.code ?? null;
    }

    return {
      id: data.id,
      status: data.status,
      category_code: categoryCode,
      suggested_description: data.suggested_description,
      confidence: data.confidence,
      model_name: data.model_name,
      prompt_version: data.prompt_version,
      error_code: data.error_code,
      photo_count: Array.isArray(data.input_photo_paths)
        ? data.input_photo_paths.length
        : 0,
      created_at: data.created_at,
      completed_at: data.completed_at,
    };
  }
}
