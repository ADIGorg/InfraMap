import type { AiAnalysisDetailsDto } from "../dtos/ai-analysis.dto.js";

export type AiPhotoMime = "image/jpeg" | "image/png";

export interface AiAnalysisRepository {
  uploadPhoto(
    path: string,
    buffer: Buffer,
    mime: AiPhotoMime
  ): Promise<void>;

  createAnalysis(
    userId: string,
    analysisId: string,
    photoPaths: string[]
  ): Promise<void>;

  removePhotos(paths: string[]): Promise<void>;
}


export interface AnalysisDraft {
  id: string;
  status: string;
  photoPaths: string[];
}
export interface AiProcessingRepository {
  findOwn(userId: string, analysisId: string): Promise<AnalysisDraft | null>;
  startProcessing(userId: string, analysisId: string): Promise<boolean>;
  findActiveCategoryId(code: string): Promise<string | null>;
  saveCompleted(
    userId: string, analysisId: string,
    data: {
      categoryId: string;
      description: string;
      confidence: number;
      modelName: string;
      promptVersion: string;
    }
  ): Promise<void>;
  markFailed(userId: string, analysisId: string, errorCode: string): Promise<void>;
}


export interface AiAnalysisReader {
  getOwnDetails(userId: string, analysisId: string): Promise<AiAnalysisDetailsDto | null>;
}

