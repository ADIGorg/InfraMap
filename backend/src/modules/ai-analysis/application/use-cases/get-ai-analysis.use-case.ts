import type { AiAnalysisReader } from "../ports/ai-analysis.repository.js";
export type { AiAnalysisReader } from "../ports/ai-analysis.repository.js";
import { NotFoundError, UnauthorizedError } from "../../../../shared/errors/app-error.js";
import type { AiAnalysisDetailsDto } from "../dtos/ai-analysis.dto.js";

/** Consultar o próprio rascunho/análise sem acessar Supabase no controller. */
export class GetAiAnalysisUseCase {
  constructor(private readonly analyses: AiAnalysisReader) {}

  async execute(userId: string | undefined, analysisId: string): Promise<AiAnalysisDetailsDto> {
    if (!userId) throw new UnauthorizedError();
    const analysis = await this.analyses.getOwnDetails(userId, analysisId);
    if (!analysis) throw new NotFoundError("Análise não encontrada.");
    return analysis;
  }
}
