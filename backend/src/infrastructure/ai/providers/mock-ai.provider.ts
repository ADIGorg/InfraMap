
import type {
  AiAnalysisInput,
  AiAnalysisResult,
  AiAnalysisProvider,
} from "../../../modules/ai-analysis/domain/providers/ai-analysis.provider.js";

/**
 * API1-46 - AI-01
 *
 * Provedor simulado utilizado em
 * desenvolvimento e testes automatizados.
 */
export class MockAiProvider implements AiAnalysisProvider {
  async analyzeOccurrence(
    input: AiAnalysisInput
  ): Promise<AiAnalysisResult> {
    if (
      input.photoPaths.length < 1 ||
      input.photoPaths.length > 3
    ) {
      throw new Error(
        "A análise exige de 1 a 3 fotografias."
      );
    }

    return {
      categoryCode: "CAT07",
      description:
        "Ocorrência simulada para testes do InfraMap.",
      confidence: 0.95,
      modelName: "mock-ai",
      promptVersion: "v1",
    };
  }
}
