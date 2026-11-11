export type AiAnalysisStatus =
  | "UPLOADING" | "PENDING" | "PROCESSING"
  | "COMPLETED" | "FAILED" | "CANCELLED" | "CONSUMED";

export interface AiAnalysis {
  id: string;
  userId: string;
  status: AiAnalysisStatus;
  photoPaths: string[];
}

/** Somente análises novas ou com falha podem iniciar (novamente). */
export function canProcessAiAnalysis(status: string): boolean {
  return status === "PENDING" || status === "FAILED";
}
