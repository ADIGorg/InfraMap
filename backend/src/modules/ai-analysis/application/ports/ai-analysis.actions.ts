import type { AiPhotoUpload, CreatedAiAnalysis } from "../use-cases/create-ai-analysis.use-case.js";
import type { AiAnalysisDetailsDto } from "../dtos/ai-analysis.dto.js";

/** Contrato de operações do módulo, injetado na apresentação. */
export interface AiAnalysisActions {
  create(userId: string, photos: AiPhotoUpload[]): Promise<CreatedAiAnalysis>;
  start(userId: string, analysisId: string): Promise<void>;
  get(userId: string, analysisId: string): Promise<AiAnalysisDetailsDto>;
}
