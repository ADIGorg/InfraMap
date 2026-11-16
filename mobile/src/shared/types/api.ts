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