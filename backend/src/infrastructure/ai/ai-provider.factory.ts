// src/infrastructure/ai/ai-provider.factory.ts

import { env } from "../../config/env.js";

import type { AiAnalysisProvider } from "../../modules/ai-analysis/domain/providers/ai-analysis.provider.js";

import { HttpAiProvider, type ResolveAiPhoto } from "./providers/http-ai.provider.js";
import { MockAiProvider } from "./providers/mock-ai.provider.js";
import { GeminiAiProvider, type ResolveGeminiPhoto } from "./providers/gemini-ai.provider.js";

/**
 * Seleciona o provider de IA com base em `AI_PROVIDER`.
 *
 * `env.ts` já garantiu no boot:
 *  - `AI_PROVIDER` é `mock | http`
 *  - Se `http`, `AI_API_URL`/`AI_API_KEY`/`AI_MODEL` estão presentes
 *  - `AI_API_URL` é HTTPS
 */
export function createAiProvider(resolvePhoto?: ResolveAiPhoto, resolveGeminiPhoto?: ResolveGeminiPhoto): AiAnalysisProvider {
  if (env.ai.provider === "mock") {
    return new MockAiProvider();
  }

  if (env.ai.provider === "gemini") {
    if (!resolveGeminiPhoto || !env.ai.geminiApiKey) {
      throw new Error("AI_PROVIDER=gemini exige resolver de fotos e GEMINI_API_KEY.");
    }
    return new GeminiAiProvider({
      apiKey: env.ai.geminiApiKey,
      model: env.ai.geminiModel,
      promptVersion: env.ai.promptVersion,
    }, resolveGeminiPhoto);
  }

  // Legacy HTTP adapter retained for backward-compatible tests.
  if (!resolvePhoto) {
    throw new Error(
      "AI_PROVIDER=http exige um resolver de fotografias (signed URL).",
    );
  }

  return new HttpAiProvider(
    {
      apiUrl:    env.ai.apiUrl!,
      apiKey:    env.ai.apiKey!,
      model:     env.ai.model!,
      promptVersion: env.ai.promptVersion,
    },
    resolvePhoto,
  );
}