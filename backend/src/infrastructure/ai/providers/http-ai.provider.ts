// src/infrastructure/ai/providers/http-ai.provider.ts

import { z } from "zod";

import {
  AI_DESCRIPTION_MIN_LENGTH,
  AI_PROVIDER_TIMEOUT_MS,
  OCCURRENCE_CATEGORY_CODES,
  OCCURRENCE_DESCRIPTION_MAX_LENGTH,
  OCCURRENCE_PHOTOS_MAX,
  OCCURRENCE_PHOTOS_MIN,
} from "../../../config/constants.js";

import { AppError } from "../../../shared/errors/app-error.js";

import type {
  AiAnalysisInput,
  AiAnalysisProvider,
  AiAnalysisResult,
} from "../../../modules/ai-analysis/domain/providers/ai-analysis.provider.js";

// API1-46 - AI-01

const resultSchema = z.object({
  categoryCode: z.enum(OCCURRENCE_CATEGORY_CODES),
  description: z
    .string()
    .trim()
    .min(AI_DESCRIPTION_MIN_LENGTH)
    .max(OCCURRENCE_DESCRIPTION_MAX_LENGTH),
  confidence: z.number().min(0).max(1),
});

const responseSchema = z.object({
  output: z.array(
    z.object({
      content: z
        .array(
          z.object({
            type: z.string(),
            text: z.string().optional(),
          }),
        )
        .optional(),
    }),
  ),
});

export interface HttpAiConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
  promptVersion: string;
}

/** Recebe o path no bucket e o userId do dono. Retorna signed URL ou data URL. */
export type ResolveAiPhoto = (
  path: string,
  userId: string,
) => Promise<string>;

export class HttpAiProvider implements AiAnalysisProvider {
  constructor(
    private readonly config: HttpAiConfig,
    private readonly resolvePhoto: ResolveAiPhoto,
    private readonly http: typeof fetch = fetch,
  ) {}

  async analyzeOccurrence(
    input: AiAnalysisInput,
  ): Promise<AiAnalysisResult> {
    const { photoPaths, userContext } = input;

    if (
      !Array.isArray(photoPaths) ||
      photoPaths.length < OCCURRENCE_PHOTOS_MIN ||
      photoPaths.length > OCCURRENCE_PHOTOS_MAX ||
      photoPaths.some((path) => !path.trim())
    ) {
      throw new AppError(
        400,
        "AI_INVALID_INPUT",
        `Informe de ${OCCURRENCE_PHOTOS_MIN} a ${OCCURRENCE_PHOTOS_MAX} fotografias válidas.`,
      );
    }

    if (!userContext?.id) {
      throw new AppError(
        401,
        "UNAUTHORIZED",
        "Usuário autenticado não informado.",
      );
    }

    let images: string[];
    try {
      images = await Promise.all(
        photoPaths.map((path) => this.resolvePhoto(path, userContext.id)),
      );
    } catch {
      throw new AppError(
        403,
        "AI_PHOTO_UNAVAILABLE",
        "Fotografia não autorizada ou indisponível.",
      );
    }

    let response: Response;
    try {
      response = await this.http(this.config.apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(AI_PROVIDER_TIMEOUT_MS),
        body: JSON.stringify({
          model: this.config.model,
          store: false,
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: `
Analise as fotografias de infraestrutura urbana.
Categorias:
CAT01 Saneamento e Drenagem
CAT02 Iluminação Pública
CAT03 Pavimentação e Vias
CAT04 Resíduos e Limpeza Urbana
CAT05 Mobilidade e Sinalização
CAT06 Calçadas e Acessibilidade
CAT07 Outros Problemas de Infraestrutura

Retorne a categoria, descrição objetiva em português
e confiança entre 0 e 1.
Não invente informações não visíveis.
                  `.trim(),
                },
                ...images.map((image) => ({
                  type: "input_image",
                  image_url: image,
                  detail: "auto",
                })),
              ],
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "inframap_analysis",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  categoryCode: {
                    type: "string",
                    enum: [...OCCURRENCE_CATEGORY_CODES],
                  },
                  description: { type: "string" },
                  confidence: { type: "number" },
                },
                required: ["categoryCode", "description", "confidence"],
              },
            },
          },
        }),
      });
    } catch {
      throw new AppError(
        503,
        "AI_PROVIDER_UNAVAILABLE",
        "Provedor de IA indisponível.",
      );
    }

    if (!response.ok) {
      throw new AppError(
        503,
        "AI_PROVIDER_UNAVAILABLE",
        "Falha na comunicação com a IA.",
      );
    }

    let outputText: string | undefined;
    try {
      const body = responseSchema.parse(await response.json());
      outputText = body.output
        .flatMap((item) => item.content ?? [])
        .find((item) => item.type === "output_text")?.text;
    } catch {
      throw new AppError(
        502,
        "AI_INVALID_RESPONSE",
        "Resposta inválida do provedor de IA.",
      );
    }

    let rawResult: unknown;
    try {
      rawResult = JSON.parse(outputText ?? "");
    } catch {
      throw new AppError(
        502,
        "AI_INVALID_RESPONSE",
        "A IA não retornou um JSON válido.",
      );
    }

    const validated = resultSchema.safeParse(rawResult);
    if (!validated.success) {
      throw new AppError(
        502,
        "AI_INVALID_RESPONSE",
        "Resultado da IA fora do contrato esperado.",
      );
    }

    return {
      ...validated.data,
      modelName: this.config.model,
      promptVersion: this.config.promptVersion,
    };
  }
}