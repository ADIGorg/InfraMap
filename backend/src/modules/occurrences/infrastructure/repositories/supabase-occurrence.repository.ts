import type { SupabaseClient } from "@supabase/supabase-js";
import { OCCURRENCE_PHOTO_EXTENSION_BY_MIME, STORAGE_BUCKET_NAME, type OccurrencePhotoMime } from "../../../../config/constants.js";
import { AppError, ConflictError, ForbiddenError, NotFoundError } from "../../../../shared/errors/app-error.js";
import type { AiAnalysisData, CategoryData, FinalizeOccurrenceInput, IOccurrenceRepository, UserRoleData } from "../../domain/repositories/occurrence.repository.js";

function mapPgError(error: { code?: string; message: string }): never {
  if (error.code === "42501") throw new ForbiddenError(error.message);
  if (error.code === "P0002") throw new NotFoundError(error.message);
  if (error.code === "22023" || error.code === "23505") throw new ConflictError(error.message);
  throw new AppError(500, "OCCURRENCE_PERSIST_FAILED", "Nao foi possivel registrar a ocorrencia.");
}

export class SupabaseOccurrenceRepository implements IOccurrenceRepository {
  constructor(private readonly supabase: SupabaseClient, private readonly adminClient: SupabaseClient) {}

  async getUserRole(userId: string): Promise<UserRoleData | null> {
    const { data, error } = await this.supabase.from("user_roles").select("role, is_active").eq("user_id", userId).maybeSingle();
    if (error) throw new AppError(500, "OCCURRENCE_LOOKUP_FAILED", "Falha ao consultar role.");
    return data ? { role: data.role as "CITIZEN" | "ADMIN", isActive: data.is_active } : null;
  }

  async getAiAnalysis(analysisId: string): Promise<AiAnalysisData | null> {
    const { data, error } = await this.supabase.from("ai_analyses").select("id, user_id, status, suggested_category_id, suggested_description").eq("id", analysisId).maybeSingle();
    if (error) throw new AppError(500, "OCCURRENCE_LOOKUP_FAILED", "Falha ao consultar analise.");
    return data ? { id: data.id, userId: data.user_id, status: data.status as string, suggestedCategoryId: data.suggested_category_id, suggestedDescription: data.suggested_description } : null;
  }

  async getCategory(categoryId: string): Promise<CategoryData | null> {
    const { data, error } = await this.supabase.from("categories").select("id, is_active").eq("id", categoryId).maybeSingle();
    if (error) throw new AppError(500, "OCCURRENCE_LOOKUP_FAILED", "Falha ao consultar categoria.");
    return data ? { id: data.id, isActive: data.is_active } : null;
  }

  async finalize(userId: string, input: FinalizeOccurrenceInput): Promise<string> {
    const { data, error } = await this.supabase.rpc("finalize_occurrence", {
      p_analysis_id: input.aiAnalysisId,
      p_category_id: input.categoryId,
      p_description: input.description,
      p_category_source: input.categorySource,
      p_description_source: input.descriptionSource,
      p_location_lon: input.location.lng,
      p_location_lat: input.location.lat,
      p_location_source: input.locationSource ?? "GPS",
      p_photo_public_consent: input.photoPublicConsent,
      p_location_accuracy_m: input.locationAccuracyM ?? null,
<<<<<<< HEAD
      p_photos: input.photos.map((p) => ({ mime_type: p.mimeType, size_bytes: p.sizeBytes })),
=======
      p_photos: input.photos.map(p => ({ mime_type: p.mimeType, size_bytes: p.sizeBytes })),
      p_photo_public_consent: input.photoPublicConsent === true,
>>>>>>> feature/web-ui-07-gestao-adm
    });
    if (error) mapPgError(error);
    const rows = data as Array<{ occurrence_id: string }> | null;
    const occurrenceId = rows?.[0]?.occurrence_id;
    if (!occurrenceId) throw new AppError(500, "OCCURRENCE_PERSIST_FAILED", "RPC nao retornou occurrence_id.");
    return this.reconcilePhotos(userId, input, occurrenceId);
  }

  async resume(userId: string, input: FinalizeOccurrenceInput): Promise<string> {
    const { data: occurrence, error } = await this.adminClient.from("occurrences").select("id").eq("ai_analysis_id", input.aiAnalysisId).eq("author_id", userId).maybeSingle();
    if (error || !occurrence) throw new ConflictError("Analise consumida sem ocorrencia propria recuperavel.");
    return this.reconcilePhotos(userId, input, occurrence.id as string);
  }

<<<<<<< HEAD
  private async reconcilePhotos(userId: string, input: FinalizeOccurrenceInput, occurrenceId: string): Promise<string> {
    const [{ data: occurrence, error: occurrenceError }, { data: rows, error: metadataError }, { data: analysis, error: analysisError }] = await Promise.all([
      this.adminClient.from("occurrences").select("id,author_id,ai_analysis_id,category_id,description,category_source,description_source").eq("id", occurrenceId).maybeSingle(),
      this.adminClient.from("occurrence_photos").select("storage_path,mime_type,size_bytes,position,is_public,consent_recorded_at,consent_version").eq("occurrence_id", occurrenceId).order("position"),
      this.adminClient.from("ai_analyses").select("id,user_id,input_photo_paths,status").eq("id", input.aiAnalysisId).maybeSingle(),
=======
  private async reconcilePhotos(
    userId: string,
    input: FinalizeOccurrenceInput,
    occurrenceId: string,
  ): Promise<string> {
    const [{ data: occurrence, error: occurrenceError },
      { data: rows, error: metadataError },
      { data: analysis, error: analysisError }] = await Promise.all([
      this.adminClient.from("occurrences")
        .select("id,author_id,ai_analysis_id,category_id,description,category_source,description_source,photo_public_consent")
        .eq("id", occurrenceId).maybeSingle(),
      this.adminClient.from("occurrence_photos")
        .select("storage_path,mime_type,size_bytes,position")
        .eq("occurrence_id", occurrenceId).order("position"),
      this.adminClient.from("ai_analyses")
        .select("id,user_id,input_photo_paths,status")
        .eq("id", input.aiAnalysisId).maybeSingle(),
>>>>>>> feature/web-ui-07-gestao-adm
    ]);
    if (occurrenceError || metadataError || analysisError || !occurrence || !analysis || !rows) {
      throw new AppError(503, "OCCURRENCE_PHOTO_MOVE_FAILED", "Falha ao recuperar metadados das fotos.");
    }
<<<<<<< HEAD
    if (occurrence.author_id !== userId || occurrence.ai_analysis_id !== input.aiAnalysisId || analysis.user_id !== userId || analysis.status !== "CONSUMED" || occurrence.category_id !== input.categoryId || occurrence.description !== input.description || occurrence.category_source !== input.categorySource || occurrence.description_source !== input.descriptionSource || rows.length !== input.photos.length) {
      throw new ConflictError("A tentativa de recuperacao nao corresponde a ocorrencia original.");
=======
    if (occurrence.author_id !== userId || occurrence.ai_analysis_id !== input.aiAnalysisId ||
        analysis.user_id !== userId || analysis.status !== "CONSUMED" ||
        occurrence.category_id !== input.categoryId ||
        occurrence.description !== input.description ||
        occurrence.category_source !== input.categorySource ||
        occurrence.description_source !== input.descriptionSource ||
        occurrence.photo_public_consent !== (input.photoPublicConsent === true) ||
        rows.length !== input.photos.length) {
      throw new ConflictError("A tentativa de recuperação não corresponde à ocorrência original.");
>>>>>>> feature/web-ui-07-gestao-adm
    }
    const sourcePaths = analysis.input_photo_paths;
    if (!Array.isArray(sourcePaths) || sourcePaths.length !== rows.length) throw new ConflictError("As fotografias da analise original sao incompativeis.");

    const folder = `occurrences/${occurrenceId}`;
    const listNames = async (prefix: string): Promise<Set<string>> => {
      const { data, error } = await this.adminClient.storage.from(STORAGE_BUCKET_NAME).list(prefix, { limit: 100 });
      if (error || !data) throw new AppError(503, "OCCURRENCE_PHOTO_MOVE_FAILED", "Storage indisponivel.");
      return new Set(data.map((file) => file.name));
    };

    for (let i = 0; i < rows.length; i += 1) {
      const original = input.photos[i]!;
      const mime = original.mimeType as OccurrencePhotoMime;
      const ext = OCCURRENCE_PHOTO_EXTENSION_BY_MIME[mime];
      if (!ext) throw new ConflictError("Formato da fotografia invalido.");
      const expectedSource = `temporary/${userId}/${input.aiAnalysisId}/photo-${i + 1}.${ext}`;
      const destName = `photo-${i + 1}.${ext}`;
      const dest = `${folder}/${destName}`;
      const row = rows[i]!;
      if (sourcePaths[i] !== expectedSource || original.storagePath !== expectedSource || row.storage_path !== dest || row.position !== i + 1 || row.mime_type !== mime || Number(row.size_bytes) !== original.sizeBytes || row.is_public !== input.photoPublicConsent || !row.consent_recorded_at || row.consent_version !== "photo-public-v1") {
        throw new ConflictError("As fotografias ou o consentimento nao correspondem ao registro persistido.");
      }
      const destNames = await listNames(folder);
      if (destNames.has(destName)) continue;
      const sourcePrefix = `temporary/${userId}/${input.aiAnalysisId}`;
      const tempNames = await listNames(sourcePrefix);
      if (!tempNames.has(destName)) throw new AppError(503, "OCCURRENCE_PHOTO_MOVE_FAILED", "Arquivo nao esta no caminho temporario nem no destino. Recuperacao manual necessaria.");
      const { error: moveError } = await this.adminClient.storage.from(STORAGE_BUCKET_NAME).move(expectedSource, dest);
      if (moveError) {
        const afterError = await listNames(folder);
        if (!afterError.has(destName)) throw new AppError(503, "OCCURRENCE_PHOTO_MOVE_FAILED", "Falha ao mover fotografia. Repita a finalizacao com o mesmo payload.");
      }
      const confirmed = await listNames(folder);
      if (!confirmed.has(destName)) throw new AppError(503, "OCCURRENCE_PHOTO_MOVE_FAILED", "Movimentacao nao confirmada. Repita a finalizacao com o mesmo payload.");
    }
    return occurrenceId;
  }
}
