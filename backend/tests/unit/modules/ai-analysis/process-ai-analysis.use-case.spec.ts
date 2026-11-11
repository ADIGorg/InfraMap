
import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  ProcessAiAnalysisUseCase,
  type AiProcessingRepository,
} from "../../../../src/modules/ai-analysis/application/use-cases/process-ai-analysis.use-case.js";

import type {
  AiAnalysisProvider,
} from "../../../../src/modules/ai-analysis/application/ports/ai-analysis.provider.js";

const draft = {
  id: "analysis-123",
  status: "PENDING",
  photoPaths: ["temporary/user-123/analysis-123/photo-1.jpg"],
};

const result = {
  categoryCode: "CAT03",
  description: "Buraco identificado na via pública.",
  confidence: 0.92,
  modelName: "mock-ai",
  promptVersion: "v1",
};

function createDependencies() {
  const repository = {
    findOwn: vi
      .fn<AiProcessingRepository["findOwn"]>()
      .mockResolvedValue(draft),

    startProcessing: vi
      .fn<AiProcessingRepository["startProcessing"]>()
      .mockResolvedValue(true),

    findActiveCategoryId: vi
      .fn<AiProcessingRepository["findActiveCategoryId"]>()
      .mockResolvedValue("category-123"),

    saveCompleted: vi
      .fn<AiProcessingRepository["saveCompleted"]>()
      .mockResolvedValue(undefined),

    markFailed: vi
      .fn<AiProcessingRepository["markFailed"]>()
      .mockResolvedValue(undefined),
  };

  const analyzeOccurrence = vi
    .fn<AiAnalysisProvider["analyzeOccurrence"]>()
    .mockResolvedValue(result);

  const service = new ProcessAiAnalysisUseCase(
    repository,
    { analyzeOccurrence },
    0.70
  );

  return {
    repository,
    analyzeOccurrence,
    service,
  };
}

describe("API1-48 - ProcessAiAnalysisUseCase", () => {
  it("deve processar e salvar a análise", async () => {
    const deps = createDependencies();

    const response = await deps.service.execute(
      "user-123",
      "analysis-123"
    );

    expect(response.status).toBe("COMPLETED");
    expect(response.categoryCode).toBe("CAT03");

    expect(
      deps.repository.saveCompleted
    ).toHaveBeenCalledOnce();
  });

  it("deve aplicar CAT07 abaixo de 0,70", async () => {
    const deps = createDependencies();

    deps.analyzeOccurrence.mockResolvedValue({
      ...result,
      confidence: 0.69,
    });

    const response = await deps.service.execute(
      "user-123",
      "analysis-123"
    );

    expect(response.categoryCode).toBe("CAT07");

    expect(
      deps.repository.findActiveCategoryId
    ).toHaveBeenCalledWith("CAT07");
  });

  it("deve rejeitar análise de outro usuário", async () => {
    const deps = createDependencies();

    deps.repository.findOwn.mockResolvedValue(null);

    await expect(
      deps.service.execute(
        "outro-usuario",
        "analysis-123"
      )
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
    });

    expect(
      deps.analyzeOccurrence
    ).not.toHaveBeenCalled();
  });

  it("deve permitir nova tentativa após falha", async () => {
    const deps = createDependencies();

    deps.repository.findOwn.mockResolvedValue({
      ...draft,
      status: "FAILED",
    });

    const response = await deps.service.execute(
      "user-123",
      "analysis-123"
    );

    expect(response.status).toBe("COMPLETED");
    expect(
      deps.repository.startProcessing
    ).toHaveBeenCalledOnce();
  });

  it("não deve reprocessar análise concluída", async () => {
    const deps = createDependencies();

    deps.repository.findOwn.mockResolvedValue({
      ...draft,
      status: "COMPLETED",
    });

    await expect(
      deps.service.execute(
        "user-123",
        "analysis-123"
      )
    ).rejects.toMatchObject({
      statusCode: 409,
      code: "CONFLICT",
    });
  });

  it("deve impedir processamento concorrente", async () => {
    const deps = createDependencies();

    deps.repository.startProcessing.mockResolvedValue(
      false
    );

    await expect(
      deps.service.execute(
        "user-123",
        "analysis-123"
      )
    ).rejects.toMatchObject({
      statusCode: 409,
      code: "CONFLICT",
    });
  });

  it("deve registrar falha do provedor", async () => {
    const deps = createDependencies();

    deps.analyzeOccurrence.mockRejectedValue(
      new Error("Falha simulada")
    );

    await expect(
      deps.service.execute(
        "user-123",
        "analysis-123"
      )
    ).rejects.toMatchObject({
      statusCode: 503,
      code: "AI_PROCESSING_FAILED",
    });

    expect(
      deps.repository.markFailed
    ).toHaveBeenCalledWith(
      "user-123",
      "analysis-123",
      "AI_PROCESSING_FAILED"
    );
  });

  it("deve registrar falha se a categoria estiver indisponível", async () => {
    const deps = createDependencies();

    deps.repository.findActiveCategoryId
      .mockResolvedValue(null);

    await expect(
      deps.service.execute(
        "user-123",
        "analysis-123"
      )
    ).rejects.toMatchObject({
      statusCode: 503,
      code: "AI_CATEGORY_UNAVAILABLE",
    });

    expect(
      deps.repository.markFailed
    ).toHaveBeenCalledOnce();
  });
});
