// src/infrastructure/ai/providers/mock-ai.provider.ts

import {
  FALLBACK_CATEGORY_CODE,
  OCCURRENCE_PHOTOS_MAX,
  OCCURRENCE_PHOTOS_MIN,
} from "../../../config/constants.js";

import type {
  AiAnalysisInput,
  AiAnalysisProvider,
  AiAnalysisResult,
} from "../../../modules/ai-analysis/domain/providers/ai-analysis.provider.js";

/**
 * API1-46 - AI-01
 * Provedor simulado para desenvolvimento e testes automatizados.
 */
export class MockAiProvider implements AiAnalysisProvider {
  async analyzeOccurrence(
    input: AiAnalysisInput,
  ): Promise<AiAnalysisResult> {
    if (
      input.photoPaths.length < OCCURRENCE_PHOTOS_MIN ||
      input.photoPaths.length > OCCURRENCE_PHOTOS_MAX
    ) {
      throw new Error(
        `A análise exige de ${OCCURRENCE_PHOTOS_MIN} a ${OCCURRENCE_PHOTOS_MAX} fotografias.`,
      );
    }

    return {
      categoryCode: FALLBACK_CATEGORY_CODE,
      description: "Ocorrência simulada para testes do InfraMap.",
      confidence: 0.95,
      modelName: "mock-ai",
      promptVersion: "v1",
    };
  }
}