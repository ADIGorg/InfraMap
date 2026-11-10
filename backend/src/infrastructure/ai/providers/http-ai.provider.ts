
import { z } from "zod";

import { AppError } from "../../../shared/errors/app-error.js";

import type {
  AiAnalysisProvider,
  AiAnalysisInput,
  AiAnalysisResult,
} from "../../../modules/ai-analysis/domain/providers/ai-analysis.provider.js";

// API1-46 - AI-01

const categories = [
  "CAT01", "CAT02", "CAT03", "CAT04",
  "CAT05", "CAT06", "CAT07",
] as const;

const resultSchema = z.object({
  categoryCode: z.enum(categories),
  description: z.string().trim().min(3).max(500),
  confidence: z.number().min(0).max(1),
});

const responseSchema = z.object({
  output: z.array(
    z.object({
      content: z.array(
        z.object({
          type: z.string(),
          text: z.string().optional(),
        })
      ).optional(),
    })
  ),
});

export interface HttpAiConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
  promptVersion: string;
}

// Receberá uma URL assinada ou data URL
// após verificar a autorização no Storage.
export type ResolveAiPhoto = (
  path: string,
  userId: string
) => Promise<string>;

export class HttpAiProvider implements AiAnalysisProvider {
  constructor(
    private readonly config: HttpAiConfig,
    private readonly resolvePhoto: ResolveAiPhoto,
    private readonly http: typeof fetch = fetch
  ) {}

  async analyzeOccurrence(
    input: AiAnalysisInput
  ): Promise<AiAnalysisResult> {
    const { photoPaths, userContext } = input;

    if (
      !Array.isArray(photoPaths) ||
      photoPaths.length < 1 ||
      photoPaths.length > 3 ||
      photoPaths.some((path) => !path.trim())
    ) {
      throw new AppError(
        400,
        "AI_INVALID_INPUT",
        "Informe de 1 a 3 fotografias válidas."
      );
    }

    if (!userContext?.id) {
      throw new AppError(
        401,
        "UNAUTHORIZED",
        "Usuário autenticado não informado."
      );
    }

    // O resolvedor será integrado ao Storage
    // nas próximas tarefas.
    let images: string[];

    try {
      images = await Promise.all(
        photoPaths.map((path) =>
          this.resolvePhoto(path, userContext.id)
        )
      );
    } catch {
      throw new AppError(
        403,
        "AI_PHOTO_UNAVAILABLE",
        "Fotografia não autorizada ou indisponível."
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
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          model: this.config.model,
          store: false,
          input: [{
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
          }],
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
                    enum: [...categories],
                  },
                  description: { type: "string" },
                  confidence: { type: "number" },
                },
                required: [
                  "categoryCode",
                  "description",
                  "confidence",
                ],
              },
            },
          },
        }),
      });
    } catch {
      throw new AppError(
        503,
        "AI_PROVIDER_UNAVAILABLE",
        "Provedor de IA indisponível."
      );
    }

    if (!response.ok) {
      throw new AppError(
        503,
        "AI_PROVIDER_UNAVAILABLE",
        "Falha na comunicação com a IA."
      );
    }

    let outputText: string | undefined;

    try {
      const body = responseSchema.parse(
        await response.json()
      );

      outputText = body.output
        .flatMap((item) => item.content ?? [])
        .find((item) => item.type === "output_text")
        ?.text;
    } catch {
      throw new AppError(
        502,
        "AI_INVALID_RESPONSE",
        "Resposta inválida do provedor de IA."
      );
    }

    let rawResult: unknown;

    try {
      rawResult = JSON.parse(outputText ?? "");
    } catch {
      throw new AppError(
        502,
        "AI_INVALID_RESPONSE",
        "A IA não retornou um JSON válido."
      );
    }

    const validated = resultSchema.safeParse(rawResult);

    if (!validated.success) {
      throw new AppError(
        502,
        "AI_INVALID_RESPONSE",
        "Resultado da IA fora do contrato esperado."
      );
    }

    return {
      ...validated.data,
      modelName: this.config.model,
      promptVersion: this.config.promptVersion,
    };
  }
}
