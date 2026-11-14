import { beforeEach, describe, expect, it, vi } from "vitest";
import { FinalizeOccurrenceUseCase } from "../../../../src/modules/occurrences/application/use-cases/finalize-occurrence.use-case.js";
import type { IOccurrenceRepository } from "../../../../src/modules/occurrences/domain/repositories/occurrence.repository.js";

const userId = "10000000-0000-4000-8000-000000000001";
const analysisId = "10000000-0000-4000-8000-000000000002";
const categoryId = "10000000-0000-4000-8000-000000000003";
const valid = () => ({
  aiAnalysisId: analysisId,
  categoryId,
  description: "Esgoto a céu aberto",
  location: { lat: -12.26, lng: -38.97 },
  categorySource: "AI_CONFIRMED",
  descriptionSource: "AI_CONFIRMED",
  photos: [{ storagePath: "temporary/example/photo-1.jpg", mimeType: "image/jpeg", sizeBytes: 1024 }],
});

function setup() {
  const repo = {
    getUserRole: vi.fn().mockResolvedValue({ role: "CITIZEN", isActive: true }),
    getAiAnalysis: vi.fn().mockResolvedValue({
      id: analysisId, userId, status: "COMPLETED",
      suggestedCategoryId: categoryId, suggestedDescription: "Esgoto a céu aberto",
    }),
    getCategory: vi.fn().mockResolvedValue({ id: categoryId, isActive: true }),
    finalize: vi.fn().mockResolvedValue("10000000-0000-4000-8000-000000000004"),
  };
  const useCase = new FinalizeOccurrenceUseCase(repo as unknown as IOccurrenceRepository);
  return { repo, run: (changes: Record<string, unknown> = {}) =>
    useCase.execute(userId, { ...valid(), ...changes }) };
}

describe("OCC-01 / RN007, RN009, RN010, RN063, RN064, RN068", () => {
  beforeEach(() => vi.clearAllMocks());

  it("finaliza uma ocorrência e devolve resumo", async () => {
    const { run, repo } = setup();
    const result = await run();
    expect(result).toMatchObject({
      status: "RECEIVED", summary: { categoryId, photosCount: 1 },
    });
    expect(repo.finalize).toHaveBeenCalledOnce();
  });

  it.each([
    [null, "ausente"],
    [{ role: "ADMIN", isActive: true }, "administrador"],
    [{ role: "CITIZEN", isActive: false }, "inativo"],
  ])("recusa cidadão %s (%s)", async (role) => {
    const { run, repo } = setup();
    repo.getUserRole.mockResolvedValue(role);
    await expect(run()).rejects.toThrow();
    expect(repo.finalize).not.toHaveBeenCalled();
  });

  it("recusa análise inexistente", async () => {
    const { run, repo } = setup();
    repo.getAiAnalysis.mockResolvedValue(null);
    await expect(run()).rejects.toThrow(/Análise/);
    expect(repo.finalize).not.toHaveBeenCalled();
  });

  it.each(["PENDING", "PROCESSING", "FAILED", "CONSUMED"])(
    "recusa análise em %s", async (status) => {
      const { run, repo } = setup();
      repo.getAiAnalysis.mockResolvedValue({
        id: analysisId, userId, status,
        suggestedCategoryId: categoryId, suggestedDescription: "Esgoto a céu aberto",
      });
      await expect(run()).rejects.toThrow();
      expect(repo.finalize).not.toHaveBeenCalled();
    },
  );

  it("recusa análise de outro cidadão", async () => {
    const { run, repo } = setup();
    repo.getAiAnalysis.mockResolvedValue({
      id: analysisId, userId: "outra-pessoa", status: "COMPLETED",
      suggestedCategoryId: categoryId, suggestedDescription: "Esgoto a céu aberto",
    });
    await expect(run()).rejects.toThrow();
    expect(repo.finalize).not.toHaveBeenCalled();
  });

  it.each([null, { id: categoryId, isActive: false }])(
    "recusa categoria inexistente/inativa", async (category) => {
      const { run, repo } = setup();
      repo.getCategory.mockResolvedValue(category);
      await expect(run()).rejects.toThrow();
      expect(repo.finalize).not.toHaveBeenCalled();
    },
  );

  it("não aceita categoria diferente com fonte AI_CONFIRMED", async () => {
    const { run, repo } = setup();
    await expect(run({ categoryId: "10000000-0000-4000-8000-000000000009" }))
      .rejects.toThrow(/AI_EDITED/);
    expect(repo.finalize).not.toHaveBeenCalled();
  });

  it("não aceita descrição diferente com fonte AI_CONFIRMED", async () => {
    const { run } = setup();
    await expect(run({ description: "Texto alterado" })).rejects.toThrow(/AI_EDITED/);
  });

  it("permite edição declarada como AI_EDITED", async () => {
    const { run, repo } = setup();
    await expect(run({
      categorySource: "AI_EDITED", descriptionSource: "AI_EDITED",
      description: "Descrição editada",
    })).resolves.toHaveProperty("status", "RECEIVED");
    expect(repo.finalize).toHaveBeenCalledOnce();
  });

  it.each([
    ["fotos ausentes", { photos: [] }],
    ["fotos acima do limite", { photos: Array.from({ length: 4 }, () => valid().photos[0]) }],
    ["MIME inválido", { photos: [{ storagePath: "x", mimeType: "image/gif", sizeBytes: 1 }] }],
    ["tamanho zero", { photos: [{ storagePath: "x", mimeType: "image/jpeg", sizeBytes: 0 }] }],
    ["descrição vazia", { description: "    " }],
    ["descrição acima de 500", { description: "a".repeat(501) }],
    ["latitude inválida", { location: { lat: 91, lng: -38.97 } }],
    ["longitude inválida", { location: { lat: -12.26, lng: -181 } }],
    ["ID inválido", { aiAnalysisId: "errado" }],
    ["fonte inventada", { descriptionSource: "MANUAL" }],
  ])("validação rejeita %s antes da persistência", async (_title, changes) => {
    const { run, repo } = setup();
    await expect(run(changes)).rejects.toThrow();
    expect(repo.finalize).not.toHaveBeenCalled();
  });
});
