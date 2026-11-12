import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AdminOccurrenceDetail,
  AdminOccurrenceItem,
  GeoPoint,
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
function parseGeoPoint(raw: unknown): GeoPoint {
  if (!raw) return { lat: 0, lng: 0 };

  if (typeof raw === "string") {
    const m = raw.match(/POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i);
    if (m) return { lng: parseFloat(m[1]!), lat: parseFloat(m[2]!) };
    return { lat: 0, lng: 0 };
  }

  const g = raw as { type?: string; coordinates?: [number, number] } | null;
  if (g?.type === "Point" && g.coordinates) {
    return { lng: g.coordinates[0], lat: g.coordinates[1] };
  }
  return { lat: 0, lng: 0 };
}

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
  constructor(private readonly supabase: SupabaseClient) {}

  // ==========================================================
  // PUBLIC — view public_occurrences (RN022)
  // ==========================================================
  async listPublic(filters: ListFilters): Promise<PaginatedResult<PublicOccurrenceItem>> {
    const offset = (filters.page - 1) * filters.pageSize;

    let query = this.supabase.from("public_occurrences").select("*", { count: "exact" });
    if (filters.categoryId) query = query.eq("category_id", filters.categoryId);

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
      location: parseGeoPoint(r.location_approximate),
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
      .from("public_occurrences")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(`Erro na consulta: ${error.message}`);
    if (!data) return null;

    return {
      id: data.id as string,
      category: { id: data.category_id as string, code: data.category_code as string, name: data.category_name as string },
      description: data.description as string,
      status: data.status as OccurrenceStatus,
      location: parseGeoPoint(data.location_approximate),
      votesCount: toInt(data.vote_count),
      createdAt: data.created_at as string,
      photos: [],
    };
  }

  // ==========================================================
  // MINE — RPC get_my_occurrences (RN045)
  // ==========================================================
  async listMine(_userId: string, filters: ListFilters): Promise<PaginatedResult<MyOccurrenceItem>> {
    const { data, error } = await this.supabase.rpc("get_my_occurrences", {
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