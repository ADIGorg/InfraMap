import type { SupabaseClient } from "@supabase/supabase-js";

import { parseGeoPoint } from "../../../../shared/geo/parse-geo-point.js";

export { parseGeoPoint };

import type {
  AdminOccurrenceDetail,
  AdminOccurrenceItem,
  IOccurrenceQueryRepository,
  ListFilters,
  MyOccurrenceDetail,
  MyOccurrenceItem,
  OccurrencePhoto,
  OccurrencePriority,
  OccurrenceStatus,
  PaginatedResult,
  PublicOccurrenceDetail,
  PublicOccurrenceItem,
} from "../../domain/repositories/occurrence-query.repository.js";


// ============================================================
// Helpers
// ============================================================

/** Converte GeoJSON (RPC) ou WKT (view) em GeoPoint. */

interface RawPhoto {
  storage_path: string;
  mime_type: string;
  size_bytes?: number;
  position: number;
}

function mapPhotos(raw: unknown): OccurrencePhoto[] {
  if (!Array.isArray(raw)) return [];
  return (raw as RawPhoto[]).map((p) => ({
    storagePath: p.storage_path,
    mimeType: p.mime_type,
    sizeBytes: p.size_bytes ?? 0,
    position: p.position,
  }));
}

function toInt(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseInt(v, 10) || 0;
  return 0;
}

function buildPagination(page: number, pageSize: number, total: number) {
  return {
    page,
    pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}

function mapAdminFilters(filters: ListFilters): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (filters.statuses?.length) out.status = filters.statuses;
  if (filters.categoryId) out.category = [filters.categoryId];
  if (filters.bbox) out.bbox = filters.bbox;
  switch (filters.sort) {
    case "most_liked":
      out.sort = "votes";
      out.order = "desc";
      break;
    case "oldest":
      out.sort = "created_at";
      out.order = "asc";
      break;
    default:
      out.sort = "created_at";
      out.order = "desc";
  }
  return out;
}

export class SupabaseOccurrenceQueryRepository
  implements IOccurrenceQueryRepository
{
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly publicPhotoMetadataReader?: SupabaseClient,
  ) {}

  // ==========================================================
  // PUBLIC — view public_occurrences (RN022)
  // ==========================================================
  async listPublic(filters: ListFilters): Promise<PaginatedResult<PublicOccurrenceItem>> {
    const offset = (filters.page - 1) * filters.pageSize;

    let query = this.supabase.from("public_occurrences_api").select("*", { count: "exact" });
    if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
    if (filters.bbox) {
      query = query.gte("latitude", filters.bbox.minLat).lte("latitude", filters.bbox.maxLat)
        .gte("longitude", filters.bbox.minLng).lte("longitude", filters.bbox.maxLng);
    }

    if (filters.sort === "most_liked") {
      query = query.order("vote_count", { ascending: false }).order("created_at", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: filters.sort === "oldest" });
    }

    const { data, error, count } = await query.range(offset, offset + filters.pageSize - 1);
    if (error) throw new Error(`Erro na consulta: ${error.message}`);

    const items: PublicOccurrenceItem[] = (data ?? []).map((r) => ({
      id: r.id as string,
      category: { id: r.category_id as string, code: r.category_code as string, name: r.category_name as string },
      description: r.description as string,
      status: r.status as OccurrenceStatus,
      location: parseGeoPoint({ lat: r.latitude, lng: r.longitude }),
      votesCount: toInt(r.vote_count),
      createdAt: r.created_at as string,
      photos: [],
    }));

    return {
      data: items,
      pagination: buildPagination(filters.page, filters.pageSize, count ?? items.length),
    };
  }

  async getPublic(id: string): Promise<PublicOccurrenceDetail | null> {
    const { data, error } = await this.supabase
      .from("public_occurrences_api")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(`Erro na consulta: ${error.message}`);
    if (!data) return null;

    // The caller has already passed the PUBLIC, visibility-filtered view.
    // Only after that gate may the backend retrieve private metadata using a
    // service-role client, solely to sign temporary Storage URLs server-side.
    // Never expose storage_path in the public response.
    let photos: OccurrencePhoto[] = [];
    if (this.publicPhotoMetadataReader) {
      const { data: photoRows, error: photoError } = await this.publicPhotoMetadataReader
        .from("occurrence_photos")
        .select("storage_path, mime_type, size_bytes, position")
        .eq("occurrence_id", id)
        .eq("is_public", true)
        .order("position", { ascending: true });
      if (photoError) throw new Error(`Erro ao consultar fotos públicas: ${photoError.message}`);
      photos = mapPhotos(photoRows);
    }

    return {
      id: data.id as string,
      category: { id: data.category_id as string, code: data.category_code as string, name: data.category_name as string },
      description: data.description as string,
      status: data.status as OccurrenceStatus,
      location: parseGeoPoint({ lat: data.latitude, lng: data.longitude }),
      votesCount: toInt(data.vote_count),
      createdAt: data.created_at as string,
      photos,
    };
  }

  // ==========================================================
  // MINE — RPC get_my_occurrences (RN045)
  // ==========================================================
  async listMine(_userId: string, filters: ListFilters): Promise<PaginatedResult<MyOccurrenceItem>> {
    const { data, error } = await this.supabase.rpc("get_my_occurrences", {
      p_filters: {
        ...(filters.statuses?.length ? { status: filters.statuses } : {}),
        ...(filters.categoryId ? { category: [filters.categoryId] } : {}),
        ...(filters.bbox ? { bbox: filters.bbox } : {}),
        sort: filters.sort,
      },
      p_page: filters.page,
      p_limit: filters.pageSize,
    });
    if (error) throw new Error(`Erro na consulta: ${error.message}`);

    const payload = data as {
      data: Array<Record<string, unknown>>;
      pagination: { page: number; limit: number; total: number; total_pages: number };
    };

    return {
      data: (payload.data ?? []).map((r) => this.toMyItem(r)),
      pagination: {
        page: payload.pagination.page,
        pageSize: payload.pagination.limit,
        total: payload.pagination.total,
        totalPages: payload.pagination.total_pages,
      },
    };
  }

  async getMine(_userId: string, id: string): Promise<MyOccurrenceDetail | null> {
    const { data, error } = await this.supabase.rpc("get_occurrence_detail", { p_id: id });
    if (error) {
      if (error.message.includes("Acesso negado") || error.message.includes("Ocorrência não encontrada")) return null;
      throw new Error(`Erro na consulta: ${error.message}`);
    }
    if (!data) return null;

    const d = data as Record<string, unknown>;
    return { ...this.toMyItem(d), photos: mapPhotos(d.photos) };
  }

  // ==========================================================
  // ADMIN — RPC admin_list_occurrences
  // ==========================================================
  async listAdmin(filters: ListFilters): Promise<PaginatedResult<AdminOccurrenceItem>> {
    const { data, error } = await this.supabase.rpc("admin_list_occurrences", {
      p_filters: mapAdminFilters(filters),
      p_page: filters.page,
      p_limit: filters.pageSize,
    });
    if (error) throw new Error(`Erro na consulta: ${error.message}`);

    const payload = data as {
      data: Array<Record<string, unknown>>;
      pagination: { page: number; limit: number; total: number; total_pages: number };
    };

    return {
      data: (payload.data ?? []).map((r) => this.toAdminItem(r)),
      pagination: {
        page: payload.pagination.page,
        pageSize: payload.pagination.limit,
        total: payload.pagination.total,
        totalPages: payload.pagination.total_pages,
      },
    };
  }

  async getAdmin(id: string): Promise<AdminOccurrenceDetail | null> {
    const { data, error } = await this.supabase.rpc("get_occurrence_detail", { p_id: id });
    if (error) {
      if (error.message.includes("Acesso negado") || error.message.includes("Ocorrência não encontrada")) return null;
      throw new Error(`Erro na consulta: ${error.message}`);
    }
    if (!data) return null;

    const d = data as Record<string, unknown>;
    const base = this.toAdminItem(d);

    return {
      ...base,
      photos: mapPhotos(d.photos),
      locationOriginal: parseGeoPoint(d.location_original),
      locationAdjusted: d.location_adjusted ? parseGeoPoint(d.location_adjusted) : null,
      categorySource: (d.category_source as string) ?? "",
      descriptionSource: (d.description_source as string) ?? "",
    };
  }

  // ==========================================================
  // Mappers
  // ==========================================================
  private toMyItem(r: Record<string, unknown>): MyOccurrenceItem {
    const photos = mapPhotos(r.photos);
    return {
      id: r.id as string,
      category: { id: r.category_id as string, code: r.category_code as string, name: r.category_name as string },
      description: r.description as string,
      status: r.status as OccurrenceStatus,
      priority: (r.priority as OccurrencePriority | null) ?? null,
      location: parseGeoPoint(r.location),
      photosCount: photos.length,
      votesCount: toInt(r.vote_count),
      createdAt: r.created_at as string,
      updatedAt: (r.updated_at as string | undefined) ?? (r.status_updated_at as string | undefined) ?? (r.created_at as string),
      resolvedAt: (r.resolved_at as string | null) ?? null,
      photos: [],
    };
  }

  private toAdminItem(r: Record<string, unknown>): AdminOccurrenceItem {
    const locOriginal = parseGeoPoint(r.location_original);
    const locAdjusted = r.location_adjusted ? parseGeoPoint(r.location_adjusted) : null;
    const photos = mapPhotos(r.photos);

    return {
      id: r.id as string,
      category: { id: (r.category_id as string) ?? "", code: (r.category_code as string) ?? "", name: (r.category_name as string) ?? "" },
      description: r.description as string,
      status: r.status as OccurrenceStatus,
      priority: (r.priority as OccurrencePriority | null) ?? null,
      location: locAdjusted ?? locOriginal,
      photosCount: photos.length,
      votesCount: toInt(r.vote_count),
      createdAt: r.created_at as string,
      updatedAt: (r.updated_at as string | undefined) ?? (r.status_updated_at as string | undefined) ?? (r.created_at as string),
      resolvedAt: (r.resolved_at as string | null) ?? null,
      photos: [],
      author: { id: (r.author_id as string) ?? "", name: (r.author_name as string) ?? "Usuário" },
    };
  }
}