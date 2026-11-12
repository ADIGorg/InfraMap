export interface UserRoleData {
  role: 'CITIZEN' | 'ADMIN';
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

export type DataSource = 'AI_CONFIRMED' | 'AI_EDITED' | 'USER_MANUAL';

export interface FinalizeOccurrenceInput {
  aiAnalysisId: string;
  categoryId: string;
  description: string;
  location: { lat: number; lng: number; source: 'GPS' | 'MANUAL' };
  categorySource: DataSource;
  descriptionSource: DataSource;
  photos: PhotoInput[];
}

export interface IOccurrenceRepository {
  getUserRole(userId: string): Promise<UserRoleData | null>;
  getAiAnalysis(analysisId: string): Promise<AiAnalysisData | null>;
  getCategory(categoryId: string): Promise<CategoryData | null>;
  finalize(input: FinalizeOccurrenceInput, userId: string): Promise<string>;
}