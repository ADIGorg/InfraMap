
import type {
  AiAnalysisProvider,
} from "../../modules/ai-analysis/domain/providers/ai-analysis.provider.js";

import {
  MockAiProvider,
} from "./providers/mock-ai.provider.js";

import {
  HttpAiProvider,
  type ResolveAiPhoto,
} from "./providers/http-ai.provider.js";

// API1-46 - AI-01

export function createAiProvider(
  resolvePhoto?: ResolveAiPhoto
): AiAnalysisProvider {
  const provider = process.env.AI_PROVIDER ?? "mock";

  if (provider === "mock") {
    return new MockAiProvider();
  }

  if (provider !== "http") {
    throw new Error("AI_PROVIDER inválido.");
  }

  const apiUrl = process.env.AI_API_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;

  if (!apiUrl || !apiKey || !model) {
    throw new Error(
      "Configuração do provedor de IA incompleta."
    );
  }

  if (new URL(apiUrl).protocol !== "https:") {
    throw new Error("AI_API_URL deve utilizar HTTPS.");
  }

  if (!resolvePhoto) {
    throw new Error(
      "Resolvedor de fotografias não configurado."
    );
  }

  return new HttpAiProvider(
    {
      apiUrl,
      apiKey,
      model,
      promptVersion:
        process.env.AI_PROMPT_VERSION ?? "v1",
    },
    resolvePhoto
  );
}
