export type PhotoMimeType = 'image/jpeg' | 'image/png';

export interface CapturedPhoto {
  uri: string;
  mimeType: PhotoMimeType;
  sizeBytes: number;
  width: number;
  height: number;
}

export type PhotoVisibility = 'PUBLIC' | 'PRIVATE' | null;
export type AiAnalysisStatus =
  | 'UPLOADING'
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'CONSUMED';
export type DataSource = 'AI_CONFIRMED' | 'AI_EDITED' | 'USER_MANUAL';

export interface CreateAiAnalysisResponse {
  id: string;
  status: 'PENDING';
  photo_count: number;
}

export interface AiAnalysisDetails {
  id: string;
  status: AiAnalysisStatus;
  category_code: string | null;
  suggested_description: string | null;
  confidence: number | null;
  model_name: string | null;
  prompt_version: string | null;
  error_code: string | null;
  photo_count: number;
  created_at: string;
  completed_at: string | null;
}
