import { describe, expect, it, vi } from "vitest";
import { ProcessAiAnalysisUseCase } from "../../../../src/modules/ai-analysis/application/use-cases/process-ai-analysis.use-case.js";

const analysis = {
  id: "analysis-1",
  status: "PENDING",
  photoPaths: ["temporary/user-1/analysis-1/photo-1.jpg"],
};

describe("ProcessAiAnalysisUseCase.start", () => {
  it("salva PROCESSING antes de disparar o provider", async () => {
    const provider = { analyzeOccurrence: vi.fn() };
    const repository = {
      findOwn: vi.fn().mockResolvedValue(analysis),
      startProcessing: vi.fn().mockResolvedValue(true),
      findActiveCategoryId: vi.fn(),
      saveCompleted: vi.fn(),
      markFailed: vi.fn(),
    };
    const useCase = new ProcessAiAnalysisUseCase(repository, provider);
    expect(await useCase.start("user-1", "analysis-1")).toEqual(analysis);
    expect(repository.startProcessing).toHaveBeenCalledWith("user-1", "analysis-1");
    expect(provider.analyzeOccurrence).not.toHaveBeenCalled();
  });

  it("impede solicitação concorrente antes de aceitar o processamento", async () => {
    const repository = {
      findOwn: vi.fn().mockResolvedValue(analysis),
      startProcessing: vi.fn().mockResolvedValue(false),
      findActiveCategoryId: vi.fn(),
      saveCompleted: vi.fn(),
      markFailed: vi.fn(),
    };
    const provider = { analyzeOccurrence: vi.fn() };
    await expect(new ProcessAiAnalysisUseCase(repository, provider)
      .start("user-1", "analysis-1")).rejects.toMatchObject({ statusCode: 409 });
    expect(provider.analyzeOccurrence).not.toHaveBeenCalled();
  });
});
