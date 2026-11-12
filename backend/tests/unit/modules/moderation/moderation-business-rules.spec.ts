import { describe, expect, it, vi } from "vitest";
import { StartAnalysisUseCase } from "../../../../src/modules/moderation/application/use-cases/start-analysis.use-case.js";
import { ConfirmOccurrenceUseCase } from "../../../../src/modules/moderation/application/use-cases/confirm-occurrence.use-case.js";
import { RejectOccurrenceUseCase } from "../../../../src/modules/moderation/application/use-cases/reject-occurrence.use-case.js";
import { SetPriorityUseCase } from "../../../../src/modules/moderation/application/use-cases/set-priority.use-case.js";
import { StartServiceUseCase } from "../../../../src/modules/moderation/application/use-cases/start-service.use-case.js";
import { ResolveOccurrenceUseCase } from "../../../../src/modules/moderation/application/use-cases/resolve-occurrence.use-case.js";
import { AdjustLocationUseCase } from "../../../../src/modules/moderation/application/use-cases/adjust-location.use-case.js";
import { CorrectClassificationUseCase } from "../../../../src/modules/moderation/application/use-cases/correct-classification.use-case.js";
import { CreateObservationUseCase } from "../../../../src/modules/moderation/application/use-cases/create-observation.use-case.js";
import type {
  IOccurrenceModerationRepository, OccurrenceStatus, OccurrencePriority,
} from "../../../../src/modules/moderation/domain/repositories/occurrence-moderation.repository.js";

const id = "10000000-0000-4000-8000-000000001111";
function setup(status: OccurrenceStatus = "RECEIVED", priority: OccurrencePriority | null = null) {
  const repository = {
    getOccurrenceById: vi.fn().mockResolvedValue({id, status, priority, authorId: "author"}),
    getHistory: vi.fn().mockResolvedValue([]),
    transitionStatus: vi.fn().mockResolvedValue(undefined),
    startService: vi.fn().mockResolvedValue(undefined),
    resolve: vi.fn().mockResolvedValue(undefined),
    setPriority: vi.fn().mockResolvedValue(undefined),
    createObservation: vi.fn().mockResolvedValue("obs-1"),
    adjustLocation: vi.fn().mockResolvedValue(undefined),
    correctClassification: vi.fn().mockResolvedValue(undefined),
  };
  return { repository, repo: repository as unknown as IOccurrenceModerationRepository };
}

describe("MOD-01 / RN026–RN037: transições válidas e negativas", () => {
  const cases = [
    { source: "RECEIVED", target: "UNDER_ANALYSIS", construct: StartAnalysisUseCase, method: "transitionStatus" },
    { source: "UNDER_ANALYSIS", target: "CONFIRMED", construct: ConfirmOccurrenceUseCase, method: "transitionStatus" },
  ] as const;
  it.each(cases)("permite $source → $target", async ({ source, target, construct, method }) => {
    const { repository, repo } = setup(source);
    await new construct(repo).execute(id);
    expect(repository[method]).toHaveBeenCalledWith(id, target);
  });
  it.each(cases)("rejeita transição $target quando já estava $target", async ({ target, construct }) => {
    const { repository, repo } = setup(target);
    await expect(new construct(repo).execute(id)).rejects.toHaveProperty("statusCode", 409);
    expect(repository.transitionStatus).not.toHaveBeenCalled();
  });
  it("rejeita ocorrência inexistente", async () => {
    const { repository, repo } = setup();
    repository.getOccurrenceById.mockResolvedValue(null);
    await expect(new StartAnalysisUseCase(repo).execute(id)).rejects.toHaveProperty("statusCode", 404);
  });
  it("rejeição exige justificativa mínima (10 caracteres)", async () => {
    const { repository, repo } = setup("UNDER_ANALYSIS");
    await expect(new RejectOccurrenceUseCase(repo).execute(id, "  não ")).rejects.toHaveProperty("statusCode", 400);
    expect(repository.transitionStatus).not.toHaveBeenCalled();
  });
  it("rejeição valida status e registra justificativa normalizada", async () => {
    const { repo, repository } = setup("UNDER_ANALYSIS");
    await new RejectOccurrenceUseCase(repo).execute(id, "  Local incorreto  ");
    expect(repository.transitionStatus).toHaveBeenCalledWith(id, "REJECTED", "Local incorreto");
    repository.getOccurrenceById.mockResolvedValue({id, status:"RESOLVED", priority: null});
    await expect(new RejectOccurrenceUseCase(repo).execute(id, "Justificativa adequada")).rejects.toHaveProperty("statusCode",409);
  });
});

describe("MOD-02 / RN033–RN036 e RN061: prioridade e atendimento", () => {
  it.each(["LOW","MEDIUM","HIGH"] as const)("atribui prioridade %s em CONFIRMED", async value => {
    const { repository, repo } = setup("CONFIRMED");
    await new SetPriorityUseCase(repo).execute(id,value);
    expect(repository.setPriority).toHaveBeenCalledWith(id,value);
  });
  it("prioridade inválida gera HTTP 400", async () => {
    const {repo}=setup("CONFIRMED");
    await expect(new SetPriorityUseCase(repo).execute(id,"CRITICAL")).rejects.toHaveProperty("statusCode",400);
  });
  it.each(["RECEIVED","UNDER_ANALYSIS","REJECTED","IN_SERVICE","RESOLVED"] as const)(
    "não define prioridade em %s pelo caso de uso",async status => {
      const {repo,repository}=setup(status);
      await expect(new SetPriorityUseCase(repo).execute(id,"HIGH")).rejects.toHaveProperty("statusCode",409);
      expect(repository.setPriority).not.toHaveBeenCalled();
    });
  it("não inicia atendimento sem prioridade", async () => {
    const {repo}=setup("CONFIRMED",null);
    await expect(new StartServiceUseCase(repo).execute(id,"Equipe deslocada ao local")).rejects.toHaveProperty("statusCode",409);
  });
  it("não inicia atendimento sem ação concreta", async () => {
    const {repo}=setup("CONFIRMED","HIGH");
    await expect(new StartServiceUseCase(repo).execute(id,"curto")).rejects.toHaveProperty("statusCode",400);
  });
  it("inicia atendimento com prioridade e ação concreta", async () => {
    const {repo,repository}=setup("CONFIRMED","HIGH");
    await new StartServiceUseCase(repo).execute(id,"  Equipe deslocada ao local   ");
    expect(repository.startService).toHaveBeenCalledWith(id,"Equipe deslocada ao local");
  });
  it("só resolve ocorrência em atendimento", async () => {
    const {repo}=setup("CONFIRMED","HIGH");
    await expect(new ResolveOccurrenceUseCase(repo).execute(id)).rejects.toHaveProperty("statusCode",409);
  });
  it("resolve e normaliza observação de resolução", async () => {
    const {repo,repository}=setup("IN_SERVICE","HIGH");
    await new ResolveOccurrenceUseCase(repo).execute(id,"  Conserto realizado  ");
    expect(repository.resolve).toHaveBeenCalledWith(id,"Conserto realizado");
  });
});

describe("MOD-03 / RN043–RN044: observações administrativas", () => {
  it.each(["INTERNAL","CITIZEN_RESPONSE"] as const)("registra %s",async visibility => {
    const {repo,repository}=setup("UNDER_ANALYSIS");
    const result=await new CreateObservationUseCase(repo).execute(id,"  Verificar vazamento   ",visibility);
    expect(result).toEqual({observationId:"obs-1"});
    expect(repository.createObservation).toHaveBeenCalledWith(id,"Verificar vazamento",visibility);
  });
  it.each(["","abc"])("rejeita texto curto '%s'",async content => {
    const {repo}=setup("UNDER_ANALYSIS");
    await expect(new CreateObservationUseCase(repo).execute(id,content,"INTERNAL")).rejects.toHaveProperty("statusCode",400);
  });
  it("rejeita visibilidade inválida",async () => {
    const {repo}=setup();
    await expect(new CreateObservationUseCase(repo).execute(id,"Texto válido","PUBLIC")).rejects.toHaveProperty("statusCode",400);
  });
});

describe("MOD-04 / RN020, RN025 e RN068: ajustes administrativos", () => {
  it("ajusta localização sem alterar original no caso de uso",async () => {
    const {repo,repository}=setup("CONFIRMED");
    await new AdjustLocationUseCase(repo).execute(id,{lat:-12.2,lng:-38.9});
    expect(repository.adjustLocation).toHaveBeenCalledWith(id,{lat:-12.2,lng:-38.9});
  });
  it.each([{lat:91,lng:0},{lat:0,lng:-181}])("rejeita coordenadas fora da faixa",async point => {
    const {repo}=setup("CONFIRMED");
    await expect(new AdjustLocationUseCase(repo).execute(id,point)).rejects.toHaveProperty("statusCode",400);
  });
  it("recusa correção sem novos valores",async () => {
    const {repo}=setup("UNDER_ANALYSIS");
    await expect(new CorrectClassificationUseCase(repo).execute(id)).rejects.toHaveProperty("statusCode",400);
  });
  it("recusa descrição vazia ou maior que 500",async () => {
    const {repo}=setup("UNDER_ANALYSIS");
    await expect(new CorrectClassificationUseCase(repo).execute(id,null,"   ")).rejects.toHaveProperty("statusCode",400);
    await expect(new CorrectClassificationUseCase(repo).execute(id,null,"x".repeat(501))).rejects.toHaveProperty("statusCode",400);
  });
  it("envia alterações ao repositório preservando NULL para campo ausente",async () => {
    const {repo,repository}=setup("UNDER_ANALYSIS");
    await new CorrectClassificationUseCase(repo).execute(id,null,"Uma descrição válida");
    expect(repository.correctClassification).toHaveBeenCalledWith(id,null,"Uma descrição válida");
  });
});
