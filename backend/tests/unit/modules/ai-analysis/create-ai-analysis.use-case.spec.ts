
import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  CreateAiAnalysisUseCase,
  MAX_PHOTO_SIZE,
  type AiAnalysisRepository,
} from "../../../../src/modules/ai-analysis/application/use-cases/create-ai-analysis.use-case.js";

// ==========================================
// API1-47 - AI-02
// TESTES UNITÁRIOS DO CASO DE USO
// ==========================================

// Simula o cabeçalho de uma imagem JPEG.
const jpeg = Buffer.from([
  0xff, 0xd8, 0xff, 0x00,
]);

// ==========================================
// DEPENDÊNCIAS SIMULADAS
// ==========================================

function createDependencies() {
  const repository = {
    uploadPhoto: vi
      .fn<AiAnalysisRepository["uploadPhoto"]>()
      .mockResolvedValue(undefined),

    createAnalysis: vi
      .fn<AiAnalysisRepository["createAnalysis"]>()
      .mockResolvedValue(undefined),

    removePhotos: vi
      .fn<AiAnalysisRepository["removePhotos"]>()
      .mockResolvedValue(undefined),
  };

  return {
    repository,
    useCase: new CreateAiAnalysisUseCase(
      repository
    ),
  };
}

describe("API1-47 - CreateAiAnalysisUseCase", () => {

  // ========================================
  // 1. CRIAÇÃO BEM-SUCEDIDA
  // ========================================

  it("deve criar análise PENDING com uma fotografia", async () => {
    const { useCase, repository } =
      createDependencies();

    const result = await useCase.execute(
      "user-123",
      [{
        buffer: jpeg,
        mimetype: "image/jpeg",
      }]
    );

    expect(result.status).toBe("PENDING");
    expect(result.photoCount).toBe(1);
    expect(result.id).toBeDefined();

    expect(
      repository.uploadPhoto
    ).toHaveBeenCalledOnce();

    expect(
      repository.createAnalysis
    ).toHaveBeenCalledOnce();

    expect(
      repository.removePhotos
    ).not.toHaveBeenCalled();
  });

  // ========================================
  // 2. AUSÊNCIA DE FOTOGRAFIAS
  // ========================================

  it("deve rejeitar ausência de fotografias", async () => {
    const { useCase, repository } =
      createDependencies();

    await expect(
      useCase.execute("user-123", [])
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "BAD_REQUEST",
    });

    expect(
      repository.uploadPhoto
    ).not.toHaveBeenCalled();

    expect(
      repository.createAnalysis
    ).not.toHaveBeenCalled();
  });

  // ========================================
  // 3. LIMITE DE FOTOGRAFIAS
  // ========================================

  it("deve rejeitar mais de três fotografias", async () => {
    const { useCase, repository } =
      createDependencies();

    const photos = Array.from(
      { length: 4 },
      () => ({
        buffer: jpeg,
        mimetype: "image/jpeg",
      })
    );

    await expect(
      useCase.execute("user-123", photos)
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "BAD_REQUEST",
    });

    expect(
      repository.uploadPhoto
    ).not.toHaveBeenCalled();
  });

  // ========================================
  // 4. MIME FALSIFICADO
  // ========================================

  it("deve rejeitar MIME falsificado", async () => {
    const { useCase, repository } =
      createDependencies();

    await expect(
      useCase.execute("user-123", [{
        buffer: jpeg,
        mimetype: "image/png",
      }])
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "BAD_REQUEST",
    });

    expect(
      repository.uploadPhoto
    ).not.toHaveBeenCalled();
  });

  // ========================================
  // 5. TAMANHO MÁXIMO
  // ========================================

  it("deve rejeitar fotografia acima de 5 MB", async () => {
    const { useCase, repository } =
      createDependencies();

    await expect(
      useCase.execute("user-123", [{
        buffer: Buffer.alloc(
          MAX_PHOTO_SIZE + 1
        ),
        mimetype: "image/jpeg",
      }])
    ).rejects.toMatchObject({
      statusCode: 413,
      code: "PAYLOAD_TOO_LARGE",
    });

    expect(
      repository.uploadPhoto
    ).not.toHaveBeenCalled();
  });

  // ========================================
  // 6. FALHA NO CADASTRO DA ANÁLISE
  // ========================================

  it("deve tentar limpar arquivos quando o banco falhar", async () => {
    const { useCase, repository } =
      createDependencies();

    repository.createAnalysis.mockRejectedValue(
      new Error("Falha no banco")
    );

    await expect(
      useCase.execute("user-123", [{
        buffer: jpeg,
        mimetype: "image/jpeg",
      }])
    ).rejects.toThrow("Falha no banco");

    expect(
      repository.uploadPhoto
    ).toHaveBeenCalledOnce();

    expect(
      repository.createAnalysis
    ).toHaveBeenCalledOnce();

    expect(
      repository.removePhotos
    ).toHaveBeenCalledOnce();
  });
});
