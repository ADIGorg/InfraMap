/** Contratos HTTP: nunca expor caminhos privados do Storage. */
export interface AiAnalysisDetailsDto {
  id: string;
  status: string;
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

export interface CreateAiAnalysisDto {
  id: string;
  status: "PENDING";
  photo_count: number;
}

export interface AcceptedAiAnalysisDto {
  id: string;
  message: string;
}
