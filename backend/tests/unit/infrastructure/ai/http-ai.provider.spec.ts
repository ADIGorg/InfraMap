
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  HttpAiProvider,
} from "../../../../src/infrastructure/ai/providers/http-ai.provider.js";

import {
  createAiProvider,
} from "../../../../src/infrastructure/ai/ai-provider.factory.js";

import {
  MockAiProvider,
} from "../../../../src/infrastructure/ai/providers/mock-ai.provider.js";

const config = {
  apiUrl: "https://api.example.com/v1/responses",
  apiKey: "test-key",
  model: "test-model",
  promptVersion: "v1",
};

const input = {
  photoPaths: ["temporary/user-1/photo-1.jpg"],
  userContext: { id: "user-1" },
};

const resolvePhoto = vi.fn().mockResolvedValue(
  "data:image/jpeg;base64,AAAA"
);

function mockResponse(result: unknown): Response {
  return new Response(
    JSON.stringify({
      output: [{
        content: [{
          type: "output_text",
          text: JSON.stringify(result),
        }],
      }],
    }),
    { status: 200 }
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("API1-46 - Provedor de IA", () => {
  it("deve selecionar o provedor mock (default)", () => {
  // env.ts resolve AI_PROVIDER=mock quando não definido.
  // tests/setup.ts fixa o default para evitar flakiness.
  expect(createAiProvider()).toBeInstanceOf(MockAiProvider);
  });

  it("deve retornar análise válida", async () => {
    const http = vi.fn<typeof fetch>().mockResolvedValue(
      mockResponse({
        categoryCode: "CAT03",
        description: "Buraco identificado na via.",
        confidence: 0.9,
      })
    );

    const provider = new HttpAiProvider(
      config,
      resolvePhoto,
      http
    );

    const result = await provider.analyzeOccurrence(input);

    expect(result).toEqual({
      categoryCode: "CAT03",
      description: "Buraco identificado na via.",
      confidence: 0.9,
      modelName: "test-model",
      promptVersion: "v1",
    });

    expect(http).toHaveBeenCalledOnce();
  });

  it("deve rejeitar categoria inválida", async () => {
    const http = vi.fn<typeof fetch>().mockResolvedValue(
      mockResponse({
        categoryCode: "INVALID",
        description: "Buraco na via.",
        confidence: 0.9,
      })
    );

    const provider = new HttpAiProvider(
      config,
      resolvePhoto,
      http
    );

    await expect(
      provider.analyzeOccurrence(input)
    ).rejects.toMatchObject({
      statusCode: 502,
      code: "AI_INVALID_RESPONSE",
    });
  });

  it("deve tratar falhas de comunicação", async () => {
    const http = vi.fn<typeof fetch>().mockRejectedValue(
      new Error("Falha de rede")
    );

    const provider = new HttpAiProvider(
      config,
      resolvePhoto,
      http
    );

    await expect(
      provider.analyzeOccurrence(input)
    ).rejects.toMatchObject({
      statusCode: 503,
      code: "AI_PROVIDER_UNAVAILABLE",
    });
  });

  it("deve exigir de 1 a 3 fotos", async () => {
    const provider = new HttpAiProvider(
      config,
      resolvePhoto
    );

    await expect(
      provider.analyzeOccurrence({
        ...input,
        photoPaths: [],
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "AI_INVALID_INPUT",
    });
  });
});
