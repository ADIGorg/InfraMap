import { describe, expect, it, vi } from "vitest";
import { GetAiAnalysisUseCase } from "../../../../src/modules/ai-analysis/application/use-cases/get-ai-analysis.use-case.js";

const analysis = {
  id: "analysis-1",
  status: "COMPLETED",
  category_code: "CAT03",
  suggested_description: "Buraco na via pública.",
  confidence: 0.9,
  model_name: "gemini-3.5-flash-lite",
  prompt_version: "v1",
  error_code: null,
  photo_count: 1,
  created_at: "2026-11-10T00:00:00.000Z",
  completed_at: "2026-11-10T00:00:01.000Z",
};

describe("GetAiAnalysisUseCase", () => {
  it("retorna exclusivamente o resultado do próprio cidadão", async () => {
    const getOwnDetails = vi.fn().mockResolvedValue(analysis);
    const result = await new GetAiAnalysisUseCase({ getOwnDetails }).execute("user-1", "analysis-1");
    expect(result).toEqual(analysis);
    expect(getOwnDetails).toHaveBeenCalledWith("user-1", "analysis-1");
    expect(result).not.toHaveProperty("input_photo_paths");
  });

  it("retorna 404 quando a análise não pertence ao usuário", async () => {
    const getOwnDetails = vi.fn().mockResolvedValue(null);
    await expect(new GetAiAnalysisUseCase({ getOwnDetails })
      .execute("stranger", "analysis-1")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("exige autenticação", async () => {
    const getOwnDetails = vi.fn();
    await expect(new GetAiAnalysisUseCase({ getOwnDetails })
      .execute(undefined, "analysis-1")).rejects.toMatchObject({ statusCode: 401 });
    expect(getOwnDetails).not.toHaveBeenCalled();
  });
});
