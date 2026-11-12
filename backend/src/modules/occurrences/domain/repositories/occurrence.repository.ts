export type DataSource = "AI_CONFIRMED" | "AI_EDITED" | "USER_MANUAL";
export type LocationSource = "GPS" | "MANUAL";

export interface UserRoleData {
  role: "CITIZEN" | "ADMIN";
  isActive: boolean;
}

export interface AiAnalysisData {
  id: string;
  userId: string;
  status: string;
  suggestedCategoryId: string | null;
  suggestedDescription: string | null;
}

export interface CategoryData {
  id: string;
  isActive: boolean;
}

export interface PhotoInput {
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
}

export interface FinalizeOccurrenceInput {
  aiAnalysisId: string;
  categoryId: string;
  description: string;
  location: { lat: number; lng: number };
  categorySource: DataSource;
  descriptionSource: DataSource;
  photos: PhotoInput[];
  /** GPS (padrão) ou MANUAL — RPC exige. */
  locationSource?: LocationSource;
  /** Precisão em metros (opcional). */
  locationAccuracyM?: number | null;
}

export interface IOccurrenceRepository {
  getUserRole(userId: string): Promise<UserRoleData | null>;
  getAiAnalysis(analysisId: string): Promise<AiAnalysisData | null>;
  getCategory(categoryId: string): Promise<CategoryData | null>;
  /**
   * RPC `finalize_occurrence` usa auth.uid() — não recebe userId.
   * Após o commit, move as fotos de `temporary/` → `occurrences/` via admin client.
   */
  finalize(input: FinalizeOccurrenceInput): Promise<string>;
}