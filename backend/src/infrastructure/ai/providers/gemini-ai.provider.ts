import { z } from "zod";
import {
  AI_DESCRIPTION_MIN_LENGTH, AI_PROVIDER_TIMEOUT_MS,
  OCCURRENCE_CATEGORY_CODES, OCCURRENCE_DESCRIPTION_MAX_LENGTH,
  OCCURRENCE_PHOTOS_MIN, OCCURRENCE_PHOTOS_MAX,
} from "../../../config/constants.js";
import { AppError } from "../../../shared/errors/app-error.js";
import type {
  AiAnalysisInput, AiAnalysisProvider, AiAnalysisResult,
} from "../../../modules/ai-analysis/domain/providers/ai-analysis.provider.js";

/** Binary is fetched from private Storage by the backend; never expose keys to mobile. */
export interface GeminiPhoto { mimeType: "image/png" | "image/jpeg"; base64: string }
export type ResolveGeminiPhoto = (path: string, userId: string) => Promise<GeminiPhoto>;
export interface GeminiConfig {
  apiKey: string;
  model: "gemini-2.5-flash-lite";
  promptVersion: string;
}

const resultSchema = z.object({
  categoryCode: z.enum(OCCURRENCE_CATEGORY_CODES),
  description: z.string().trim()
    .min(AI_DESCRIPTION_MIN_LENGTH).max(OCCURRENCE_DESCRIPTION_MAX_LENGTH),
  confidence: z.number().finite().min(0).max(1),
});

const googleResponse = z.object({
  candidates: z.array(z.object({
    content: z.object({
      parts: z.array(z.object({ text: z.string().optional() })),
    }),
  })).min(1),
});

export class GeminiAiProvider implements AiAnalysisProvider {
  constructor(
    private readonly config: GeminiConfig,
    private readonly resolvePhoto: ResolveGeminiPhoto,
    private readonly http: typeof fetch = fetch,
  ) {}

  async analyzeOccurrence(input: AiAnalysisInput): Promise<AiAnalysisResult> {
    if (!input.userContext?.id ||
        !Array.isArray(input.photoPaths) ||
        input.photoPaths.length < OCCURRENCE_PHOTOS_MIN ||
        input.photoPaths.length > OCCURRENCE_PHOTOS_MAX ||
        input.photoPaths.some(p => !p.trim())) {
      throw new AppError(400, "AI_INVALID_INPUT", "Análise deve conter de uma a três fotos válidas.");
    }
    const userId = input.userContext?.id;
    if (!userId) {
      throw new AppError(401, "UNAUTHORIZED", "Usuário não autenticado.");
    }
    let photos: GeminiPhoto[];
    try {
      photos = await Promise.all(input.photoPaths.map(p =>
        this.resolvePhoto(p, userId),
      ));
    } catch {
      throw new AppError(403, "AI_PHOTO_UNAVAILABLE", "Fotografia indisponível para análise.");
    }

    const prompt = [
      "Analise somente o que é visível nas fotos de infraestrutura urbana.",
      "Categorias: CAT01 Saneamento e Drenagem; CAT02 Iluminação Pública;",
      "CAT03 Pavimentação e Vias; CAT04 Resíduos e Limpeza Urbana;",
      "CAT05 Mobilidade e Sinalização; CAT06 Calçadas e Acessibilidade;",
      "CAT07 Outros Problemas de Infraestrutura.",
      "Produza uma descrição objetiva em português e classifique a categoria.",
      "Use confidence entre 0 e 1 apenas como estimativa não calibrada.",
      "Se houver incerteza, escolha CAT07. Não invente pessoas ou fatos não visíveis.",
    ].join(" ");

    let response: Response;
    try {
      response = await this.http(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.config.model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "x-goog-api-key": this.config.apiKey,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(AI_PROVIDER_TIMEOUT_MS),
          body: JSON.stringify({
            contents: [{
              role: "user",
              parts: [
                { text: prompt },
                ...photos.map(p => ({
                  inlineData: { mimeType: p.mimeType, data: p.base64 },
                })),
              ],
            }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  categoryCode: { type: "STRING", enum: [...OCCURRENCE_CATEGORY_CODES] },
                  description: { type: "STRING" },
                  confidence: { type: "NUMBER" },
                },
                required: ["categoryCode", "description", "confidence"],
              },
              temperature: 0,
            },
          }),
        },
      );
    } catch {
      throw new AppError(503, "AI_PROVIDER_UNAVAILABLE", "Não foi possível consultar o Gemini.");
    }
    // Never fall back to a paid model on quota exhaustion.
    if (response.status === 429) {
      throw new AppError(503, "AI_FREE_QUOTA_EXCEEDED",
        "Limite da API Gemini atingido. Tente novamente após a reposição da cota.");
    }
    if (!response.ok) {
      throw new AppError(503, "AI_PROVIDER_UNAVAILABLE", "Gemini não respondeu à análise.");
    }

    let raw: unknown;
    try {
      const payload = googleResponse.parse(await response.json());
      const output = payload.candidates[0]!.content.parts
        .map(part => part.text ?? "").join("").trim();
      raw = JSON.parse(output);
    } catch {
      throw new AppError(502, "AI_INVALID_RESPONSE", "Gemini não retornou JSON válido.");
    }
    const parsed = resultSchema.safeParse(raw);
    if (!parsed.success) {
      throw new AppError(502, "AI_INVALID_RESPONSE", "Resposta do Gemini fora do contrato.");
    }
    return {
      ...parsed.data,
      modelName: this.config.model,
      promptVersion: this.config.promptVersion,
    };
  }
}
