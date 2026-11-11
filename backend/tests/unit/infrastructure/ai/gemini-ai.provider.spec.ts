import { afterEach, describe, expect, it, vi } from "vitest";
import { GeminiAiProvider } from "../../../../src/infrastructure/ai/providers/gemini-ai.provider.js";
import { createAiProvider } from "../../../../src/infrastructure/ai/ai-provider.factory.js";

const config = { apiKey: "test-key", model: "gemini-3.5-flash-lite", promptVersion: "v1" };
const input = {
  userContext: { id: "user-1" },
  photoPaths: ["temporary/user-1/analysis-1/photo-1.jpg"],
};
const photo = {
  bytes: Uint8Array.from([0xff, 0xd8, 0xff, 0x00]),
  mimeType: "image/jpeg" as const,
};
const resolvePhoto = vi.fn().mockResolvedValue(photo);

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}
function validResponse() {
  return response({ candidates: [{ content: { parts: [{ text: JSON.stringify({
    categoryCode: "CAT03",
    description: "Buraco na pista de rolamento.",
    confidence: 0.9,
  }) }] } }] });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("GeminiAiProvider", () => {
  it("seleciona Gemini sem exigir SDK", () => {
    vi.stubEnv("AI_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    expect(createAiProvider(undefined, resolvePhoto)).toBeInstanceOf(GeminiAiProvider);
  });

  it("envia bytes das fotos e devolve resposta estruturada", async () => {
    const http = vi.fn<typeof fetch>().mockResolvedValue(validResponse());
    const provider = new GeminiAiProvider(config, resolvePhoto, http);
    const result = await provider.analyzeOccurrence(input);
    expect(result.categoryCode).toBe("CAT03");
    expect(result.modelName).toBe(config.model);
    const [url, options] = http.mock.calls[0]!;
    expect(url).toContain("gemini-3.5-flash-lite:generateContent");
    const body = JSON.parse(String(options?.body));
    expect(body.contents[0].parts[1].inlineData.mimeType).toBe("image/jpeg");
    expect(body.contents[0].parts[1].inlineData.data).toBe(
      Buffer.from(photo.bytes).toString("base64")
    );
    expect(JSON.stringify(body)).not.toContain(config.apiKey);
  });

  it("rejeita resposta fora das sete categorias", async () => {
    const invalid = response({ candidates: [{ content: { parts: [{ text: JSON.stringify({
      categoryCode: "INVENTADA", description: "Buraco na via.", confidence: 0.8,
    }) }] } }] });
    const provider = new GeminiAiProvider(config, resolvePhoto, vi.fn<typeof fetch>().mockResolvedValue(invalid));
    await expect(provider.analyzeOccurrence(input)).rejects.toMatchObject({
      code: "AI_INVALID_RESPONSE", statusCode: 502,
    });
  });

  it("trata limite de requisições sem expor credenciais", async () => {
    const provider = new GeminiAiProvider(
      config, resolvePhoto,
      vi.fn<typeof fetch>().mockResolvedValue(response({}, 429))
    );
    await expect(provider.analyzeOccurrence(input)).rejects.toMatchObject({
      code: "AI_RATE_LIMITED", statusCode: 503,
    });
  });

  it("bloqueia fotos não autorizadas", async () => {
    const provider = new GeminiAiProvider(
      config,
      vi.fn().mockRejectedValue(new Error("private storage error")),
      vi.fn<typeof fetch>()
    );
    await expect(provider.analyzeOccurrence(input)).rejects.toMatchObject({
      code: "AI_PHOTO_UNAVAILABLE", statusCode: 403,
    });
  });
});
