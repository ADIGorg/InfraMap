import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  AdminOccurrenceDetail,
  AdminOccurrenceItem,
  GeoPoint,
  IOccurrenceQueryRepository,
  ListFilters,
  MyOccurrenceDetail,
  MyOccurrenceItem,
  PaginatedResult,
  PublicOccurrenceDetail,
  PublicOccurrenceItem,
} from '../../domain/repositories/occurrence-query.repository.js';

type RawRow = {
  id: string;
  category_id: string;
  category_code: string;
  category_name: string;
  description: string;
  status: string;
  priority: string | null;
  location_lat: number;
  location_lng: number;
  author_id: string | null;
  author_name: string | null;
  photos_count: string | number;
  votes_count: string | number;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  total_count: string | number;
};

// Arredonda para ~110m (3 casas decimais ≈ quadra/bairro) — RN022
function approximate(point: GeoPoint): GeoPoint {
  const r = (n: number) => Math.round(n * 1000) / 1000;
  return { lat: r(point.lat), lng: r(point.lng) };
}

function toInt(v: string | number): number {
  return typeof v === 'number' ? v : parseInt(v, 10);
}

function buildPagination(filters: ListFilters, total: number) {
  return {
    page: filters.page,
    pageSize: filters.pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / filters.pageSize),
  };
}

export class SupabaseOccurrenceQueryRepository implements IOccurrenceQueryRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  // ==========================================================
  // Interno: chamada RPC de listagem
  // ==========================================================
  private async callList(
    role: 'PUBLIC' | 'CITIZEN' | 'ADMIN',
    userId: string | null,
    filters: ListFilters
  ): Promise<{ rows: RawRow[]; total: number }> {
    const { data, error } = await this.supabase.rpc('list_occurrences', {
      p_role: role,
      p_user_id: userId,
      p_statuses: filters.statuses ?? null,
      p_category_id: filters.categoryId ?? null,
      p_bbox_min_lat: filters.bbox?.minLat ?? null,
      p_bbox_max_lat: filters.bbox?.maxLat ?? null,
      p_bbox_min_lng: filters.bbox?.minLng ?? null,
      p_bbox_max_lng: filters.bbox?.maxLng ?? null,
      p_page: filters.page,
      p_page_size: filters.pageSize,
      p_sort: filters.sort,
    });

    if (error) throw new Error(`Erro na consulta: ${error.message}`);

    const rows = (data ?? []) as RawRow[];
    const total = rows[0] ? toInt(rows[0].total_count) : 0;
    return { rows, total };
  }

  // ==========================================================
  // Interno: chamada RPC de detalhe
  // ==========================================================
  private async callGet(
    role: 'PUBLIC' | 'CITIZEN' | 'ADMIN',
    userId: string | null,
    id: string
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.supabase.rpc('get_occurrence', {
      p_role: role,
      p_user_id: userId,
      p_occurrence_id: id,
    });

    if (error) throw new Error(`Erro na consulta: ${error.message}`);
    return (data as Record<string, unknown> | null) ?? null;
  }

  // ==========================================================
  // PUBLIC — listagem
  // ==========================================================
  async listPublic(filters: ListFilters): Promise<PaginatedResult<PublicOccurrenceItem>> {
    const { rows, total } = await this.callList('PUBLIC', null, filters);

    const data: PublicOccurrenceItem[] = rows.map((r) => ({
      id: r.id,
      category: { id: r.category_id, code: r.category_code, name: r.category_name },
      description: r.description,
      status: r.status as PublicOccurrenceItem['status'],
      location: approximate({ lat: r.location_lat, lng: r.location_lng }),
      votesCount: toInt(r.votes_count),
      createdAt: r.created_at,
    }));

    return { data, pagination: buildPagination(filters, total) };
  }

  // ==========================================================
  // PUBLIC — detalhe
  // ==========================================================
  async getPublic(id: string): Promise<PublicOccurrenceDetail | null> {
    const raw = await this.callGet('PUBLIC', null, id);
    if (!raw) return null;

    const loc = raw.location as GeoPoint;
    return {
      id: raw.id as string,
      category: raw.category as PublicOccurrenceDetail['category'],
      description: raw.description as string,
      status: raw.status as PublicOccurrenceDetail['status'],
      location: approximate(loc),
      votesCount: toInt(raw.votesCount as string | number),
      createdAt: raw.createdAt as string,
    };
  }

  // ==========================================================
  // MINE — listagem
  // ==========================================================
  async listMine(userId: string, filters: ListFilters): Promise<PaginatedResult<MyOccurrenceItem>> {
    const { rows, total } = await this.callList('CITIZEN', userId, filters);

    const data: MyOccurrenceItem[] = rows.map((r) => ({
      id: r.id,
      category: { id: r.category_id, code: r.category_code, name: r.category_name },
      description: r.description,
      status: r.status as MyOccurrenceItem['status'],
      priority: r.priority as MyOccurrenceItem['priority'],
      location: { lat: r.location_lat, lng: r.location_lng },
      photosCount: toInt(r.photos_count),
      votesCount: toInt(r.votes_count),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      resolvedAt: r.resolved_at,
    }));

    return { data, pagination: buildPagination(filters, total) };
  }

  // ==========================================================
  // MINE — detalhe
  // ==========================================================
  async getMine(userId: string, id: string): Promise<MyOccurrenceDetail | null> {
    const raw = await this.callGet('CITIZEN', userId, id);
    if (!raw) return null;

    return {
      id: raw.id as string,
      category: raw.category as MyOccurrenceDetail['category'],
      description: raw.description as string,
      status: raw.status as MyOccurrenceDetail['status'],
      priority: raw.priority as MyOccurrenceDetail['priority'],
      location: raw.location as GeoPoint,
      photosCount: (raw.photos as unknown[]).length,
      votesCount: toInt(raw.votesCount as string | number),
      createdAt: raw.createdAt as string,
      updatedAt: raw.updatedAt as string,
      resolvedAt: raw.resolvedAt as string | null,
      photos: raw.photos as MyOccurrenceDetail['photos'],
    };
  }

  // ==========================================================
  // ADMIN — listagem
  // ==========================================================
  async listAdmin(filters: ListFilters): Promise<PaginatedResult<AdminOccurrenceItem>> {
    const { rows, total } = await this.callList('ADMIN', null, filters);

    const data: AdminOccurrenceItem[] = rows.map((r) => ({
      id: r.id,
      category: { id: r.category_id, code: r.category_code, name: r.category_name },
      description: r.description,
      status: r.status as AdminOccurrenceItem['status'],
      priority: r.priority as AdminOccurrenceItem['priority'],
      location: { lat: r.location_lat, lng: r.location_lng },
      photosCount: toInt(r.photos_count),
      votesCount: toInt(r.votes_count),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      resolvedAt: r.resolved_at,
      author: {
        id: r.author_id as string,
        name: r.author_name ?? 'Usuário',
      },
    }));

    return { data, pagination: buildPagination(filters, total) };
  }

  // ==========================================================
  // ADMIN — detalhe
  // ==========================================================
  async getAdmin(id: string): Promise<AdminOccurrenceDetail | null> {
    const raw = await this.callGet('ADMIN', null, id);
    if (!raw) return null;

    return {
      id: raw.id as string,
      category: raw.category as AdminOccurrenceDetail['category'],
      description: raw.description as string,
      status: raw.status as AdminOccurrenceDetail['status'],
      priority: raw.priority as AdminOccurrenceDetail['priority'],
      location: raw.location as GeoPoint,
      photosCount: (raw.photos as unknown[]).length,
      votesCount: toInt(raw.votesCount as string | number),
      createdAt: raw.createdAt as string,
      updatedAt: raw.updatedAt as string,
      resolvedAt: raw.resolvedAt as string | null,
      author: raw.author as AdminOccurrenceDetail['author'],
      photos: raw.photos as AdminOccurrenceDetail['photos'],
      locationOriginal: raw.locationOriginal as GeoPoint,
      locationAdjusted: raw.locationAdjusted as GeoPoint | null,
      categorySource: raw.categorySource as string,
      descriptionSource: raw.descriptionSource as string,
    };
  }
}