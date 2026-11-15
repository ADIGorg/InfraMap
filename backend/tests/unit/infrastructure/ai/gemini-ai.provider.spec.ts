import { describe, expect, it, vi } from "vitest";
import { GeminiAiProvider } from "../../../../src/infrastructure/ai/providers/gemini-ai.provider.js";

const config = {apiKey:"test-key",model:"gemini-2.5-flash-lite" as const,promptVersion:"v1"};
const photo = vi.fn().mockResolvedValue({mimeType:"image/png",base64:"iVBORw0KGgo="});
const input = {photoPaths:["temporary/user/analysis/photo-1.png"],userContext:{id:"user"}};
function response(result: unknown, status=200) {
  return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(result)}]}}]}),{status});
}
describe("Gemini adapter",()=>{
  it("sends inline images and validates structured JSON",async()=>{
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response({
      categoryCode:"CAT01",description:"Água parada na calçada.",confidence:0.85,
    }));
    const provider = new GeminiAiProvider(config,photo,fetchMock);
    await expect(provider.analyzeOccurrence(input)).resolves.toMatchObject({
      categoryCode:"CAT01",modelName:"gemini-2.5-flash-lite",
    });
    const [url,options] = fetchMock.mock.calls[0]!;
    expect(url).toContain("gemini-2.5-flash-lite:generateContent");
    const request = JSON.parse(String(options?.body));
    expect(request.contents[0].parts[1].inlineData.mimeType).toBe("image/png");
    expect(request.generationConfig.responseMimeType).toBe("application/json");
  });
  it("does not use a paid fallback when free quota is exceeded",async()=>{
    const provider = new GeminiAiProvider(config,photo,
      vi.fn<typeof fetch>().mockResolvedValue(new Response("quota",{status:429})));
    await expect(provider.analyzeOccurrence(input))
      .rejects.toMatchObject({code:"AI_FREE_QUOTA_EXCEEDED"});
  });
  it("rejects malformed categories and prevents invalid persistence",async()=>{
    const provider = new GeminiAiProvider(config,photo,
      vi.fn<typeof fetch>().mockResolvedValue(response({
        categoryCode:"BAD",description:"Rua",confidence:1,
      })));
    await expect(provider.analyzeOccurrence(input))
      .rejects.toMatchObject({code:"AI_INVALID_RESPONSE"});
  });
});
