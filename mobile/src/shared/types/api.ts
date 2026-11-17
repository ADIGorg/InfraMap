// src/shared/types/api.ts

// ─────────────────────────────────────
// Enums e Tipos Básicos
// ─────────────────────────────────────
export type OccurrenceStatus =
  | 'RECEIVED'
  | 'UNDER_ANALYSIS'
  | 'CONFIRMED'
  | 'IN_SERVICE'
  | 'RESOLVED'
  | 'REJECTED';

export type OccurrencePriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type DataSource = 'AI_CONFIRMED' | 'AI_EDITED' | 'USER_MANUAL';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface CategorySummary {
  id: string;
  code: string;
  name: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Page<T> {
  data: T[];
  pagination: Pagination;
}

// ─────────────────────────────────────
// Identidade e Perfil
// ─────────────────────────────────────
export interface IdentityResponse {
  id: string;
  role: 'CITIZEN' | 'ADMIN';
  is_active: boolean;
}

export interface AccountProfile {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface MyProfileResponse {
  message: string;
  data: AccountProfile;
}

export interface UpdateMyProfileRequest {
  name?: string;
  phone?: string | null;
}

// ─────────────────────────────────────
// Ocorrências Públicas (MOB-UI-05)
// ─────────────────────────────────────
export interface PublicOccurrenceListItem {
  id: string;
  category: CategorySummary;
  description: string;
  status: 'CONFIRMED' | 'IN_SERVICE';
  location: GeoPoint; // coordenada aproximada (~110m)
  votesCount: number;
  createdAt: string;
}

export interface PublicOccurrenceListResponse {
  data: PublicOccurrenceListItem[];
  pagination: Pagination;
}

export interface PublicMapFilters {
  categoryId?: string;
  bbox?: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  sort?: 'recent' | 'oldest' | 'most_liked';
}

// ─────────────────────────────────────
// Minhas Ocorrências (MOB-UI-07)
// ─────────────────────────────────────
export interface MyOccurrenceListItem {
  id: string;
  category: CategorySummary;
  description: string;
  status: OccurrenceStatus;
  priority: OccurrencePriority | null;
  location: GeoPoint; // exata — é o autor (RN004)
  photosCount: number;
  votesCount: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface MyOccurrencesResponse {
  data: MyOccurrenceListItem[];
  pagination: Pagination;
}

export interface MyOccurrencesFilters {
  page?: number;
  pageSize?: number;
  statuses?: OccurrenceStatus[];
  categoryId?: string;
  sort?: 'recent' | 'oldest' | 'most_liked';
}

// ─────────────────────────────────────
// Detalhe público + votos (MOB-UI-10)
// ─────────────────────────────────────
export interface PublicPhotoUrl {
  mimeType: string;
  sizeBytes: number;
  position: number;
  url: string;
  expiresAt: string;
  expiresInSeconds: number;
}

export interface PublicOccurrenceDetail {
  id: string;
  category: CategorySummary;
  description: string;
  status: 'CONFIRMED' | 'IN_SERVICE';
  location: GeoPoint; // aproximada (backend aplica snap RN022)
  votesCount: number;
  createdAt: string;
  photoUrls: PublicPhotoUrl[];
}

export interface VoteCount {
  occurrence_id: string;
  vote_count: number;
}