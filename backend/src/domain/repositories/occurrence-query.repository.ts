export type OccurrenceStatus =
  | 'RECEIVED'
  | 'UNDER_ANALYSIS'
  | 'CONFIRMED'
  | 'IN_SERVICE'
  | 'RESOLVED'
  | 'REJECTED';

export type OccurrencePriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface CategorySummary {
  id: string;
  code: string;
  name: string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface OccurrencePhoto {
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  position: number;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: Pagination;
}

export interface ListFilters {
  statuses?: OccurrenceStatus[] | undefined;
  categoryId?: string | undefined;
  bbox?: { minLat: number; maxLat: number; minLng: number; maxLng: number; } | undefined;
  page: number;
  pageSize: number;
  sort: 'recent' | 'oldest' | 'most_liked';
}

// PUBLIC
export interface PublicOccurrenceItem {
  id: string;
  category: CategorySummary;
  description: string;
  status: OccurrenceStatus;
  location: GeoPoint; // aproximada
  votesCount: number;
  createdAt: string;
}

export type PublicOccurrenceDetail = PublicOccurrenceItem;

// MINE
export interface MyOccurrenceItem {
  id: string;
  category: CategorySummary;
  description: string;
  status: OccurrenceStatus;
  priority: OccurrencePriority | null;
  location: GeoPoint; // exata (é do autor)
  photosCount: number;
  votesCount: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface MyOccurrenceDetail extends MyOccurrenceItem {
  photos: OccurrencePhoto[];
}

// ADMIN
export interface AdminOccurrenceItem extends MyOccurrenceItem {
  author: { id: string; name: string };
}

export interface AdminOccurrenceDetail extends AdminOccurrenceItem {
  photos: OccurrencePhoto[];
  locationOriginal: GeoPoint;
  locationAdjusted: GeoPoint | null;
  categorySource: string;
  descriptionSource: string;
}

export interface IOccurrenceQueryRepository {
  listPublic(filters: ListFilters): Promise<PaginatedResult<PublicOccurrenceItem>>;
  getPublic(id: string): Promise<PublicOccurrenceDetail | null>;

  listMine(userId: string, filters: ListFilters): Promise<PaginatedResult<MyOccurrenceItem>>;
  getMine(userId: string, id: string): Promise<MyOccurrenceDetail | null>;

  listAdmin(filters: ListFilters): Promise<PaginatedResult<AdminOccurrenceItem>>;
  getAdmin(id: string): Promise<AdminOccurrenceDetail | null>;
}