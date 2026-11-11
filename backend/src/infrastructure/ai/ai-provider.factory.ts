import type {
  AiAnalysisProvider,
} from "../../modules/ai-analysis/application/ports/ai-analysis.provider.js";

import { MockAiProvider } from "./providers/mock-ai.provider.js";
import {
  HttpAiProvider,
  type ResolveAiPhoto,
} from "./providers/http-ai.provider.js";
import {
  GeminiAiProvider,
  type ResolveGeminiPhoto,
} from "./providers/gemini-ai.provider.js";

/**
 * O mock continua padrão seguro para testes locais.
 * Configure AI_PROVIDER=gemini para usar a API real.
 * O provedor HTTP/OpenAI é mantido para retrocompatibilidade.
 */
export function createAiProvider(
  resolvePhotoUrl?: ResolveAiPhoto,
  resolveGeminiPhoto?: ResolveGeminiPhoto
): AiAnalysisProvider {
  const provider = process.env.AI_PROVIDER ?? "mock";

  if (provider === "mock") return new MockAiProvider();

  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey || !resolveGeminiPhoto) {
      throw new Error("Configure GEMINI_API_KEY e o resolvedor privado de fotografias.");
    }
    return new GeminiAiProvider(
      {
        apiKey,
        model: process.env.AI_MODEL ?? "gemini-3.5-flash-lite",
        promptVersion: process.env.AI_PROMPT_VERSION ?? "v1",
      },
      resolveGeminiPhoto
    );
  }

  if (provider === "http") {
    const apiUrl = process.env.AI_API_URL;
    const apiKey = process.env.AI_API_KEY;
    const model = process.env.AI_MODEL;

    if (!apiUrl || !apiKey || !model || !resolvePhotoUrl) {
      throw new Error("Configuração do provedor HTTP de IA incompleta.");
    }
    if (new URL(apiUrl).protocol !== "https:") {
      throw new Error("AI_API_URL deve utilizar HTTPS.");
    }

    return new HttpAiProvider(
      {
        apiUrl, apiKey, model,
        promptVersion: process.env.AI_PROMPT_VERSION ?? "v1",
      },
      resolvePhotoUrl
    );
  }

  throw new Error("AI_PROVIDER inválido. Use mock, gemini ou http.");
}
