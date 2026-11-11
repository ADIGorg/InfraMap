export interface AiAnalysisInput {
  photoPaths: string[];
  userContext?: {
    id: string;
  };
}

export interface AiAnalysisResult {
  categoryCode: string;
  description: string;
  confidence: number;
  modelName: string;
  promptVersion: string;
}

export interface AiAnalysisProvider {
  analyzeOccurrence(
    input: AiAnalysisInput
  ): Promise<AiAnalysisResult>;
}
