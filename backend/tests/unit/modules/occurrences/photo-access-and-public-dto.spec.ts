import { describe, expect, it, vi } from "vitest";
import { GetPhotoSignedUrlUseCase } from "../../../../src/modules/occurrences/application/use-cases/get-photo-signed-url.use-case.js";
import { GetPublicOccurrenceUseCase } from "../../../../src/modules/occurrences/application/use-cases/get-public-occurrence.use-case.js";
import type { IPhotoAccessRepository } from "../../../../src/modules/occurrences/domain/repositories/photo-access.repository.js";
import type { IPhotoUrlService } from "../../../../src/modules/occurrences/domain/services/photo-url.service.js";
import type { IOccurrenceQueryRepository } from "../../../../src/modules/occurrences/domain/repositories/occurrence-query.repository.js";

const id="10000000-0000-4000-8000-000000009001";
const author="10000000-0000-4000-8000-000000009002";
const signed={
  url:"https://signed.example.invalid/token",
  expiresAt:"2026-11-12T18:00:00Z",
  expiresInSeconds:300,
};
const photo={
  photoId:"photo-1",occurrenceId:id,
  storagePath:`occurrences/${id}/photo-1.jpg`,mimeType:"image/jpeg",
  sizeBytes:1200,position:1,occurrenceStatus:"CONFIRMED" as const,
  occurrenceAuthorId:author,
};

function setup(status=photo.occurrenceStatus) {
  const repository={getPhotoInfo:vi.fn().mockResolvedValue({...photo,occurrenceStatus:status})};
  const urlService={generate:vi.fn().mockResolvedValue(signed),generateBatch:vi.fn().mockResolvedValue({
    [photo.storagePath]:signed,
  })};
  return {
    repo:repository,
    urls:urlService,
    useCase:new GetPhotoSignedUrlUseCase(repository as unknown as IPhotoAccessRepository,urlService as unknown as IPhotoUrlService),
  };
}
describe("OCC-03 / RN017, RN022: foto privada e URL assinada",()=>{
  it("público pode ver foto CONFIRMED",async()=>{
    const {useCase,urls}=setup();
    await expect(useCase.execute({role:"PUBLIC"},id,photo.photoId)).resolves.toEqual(signed);
    expect(urls.generate).toHaveBeenCalledWith(photo.storagePath);
  });
  it("público pode ver foto IN_SERVICE",async()=>{
    const {useCase}=setup("IN_SERVICE");
    await expect(useCase.execute({role:"PUBLIC"},id,photo.photoId)).resolves.toEqual(signed);
  });
  it.each(["RECEIVED","UNDER_ANALYSIS","REJECTED","RESOLVED"])(
    "público não pode acessar foto em %s",async status=>{
      const {useCase,urls}=setup(status);
      await expect(useCase.execute({role:"PUBLIC"},id,photo.photoId)).rejects.toHaveProperty("statusCode",403);
      expect(urls.generate).not.toHaveBeenCalled();
    });
  it("autor vê foto própria independentemente do status",async()=>{
    const {useCase}=setup("RECEIVED");
    await expect(useCase.execute({role:"OWNER",userId:author},id,photo.photoId)).resolves.toEqual(signed);
  });
  it("outro cidadão não vê foto privada",async()=>{
    const {useCase,urls}=setup("RECEIVED");
    await expect(useCase.execute({role:"OWNER",userId:"terceiro"},id,photo.photoId)).rejects.toHaveProperty("statusCode",403);
    expect(urls.generate).not.toHaveBeenCalled();
  });
  it("admin vê evidência necessária para moderação",async()=>{
    const {useCase}=setup("REJECTED");
    await expect(useCase.execute({role:"ADMIN"},id,photo.photoId)).resolves.toEqual(signed);
  });
  it("vínculo incorreto entre ocorrência/foto dá 400",async()=>{
    const {useCase}=setup();
    await expect(useCase.execute({role:"PUBLIC"},"outra",photo.photoId)).rejects.toHaveProperty("statusCode",400);
  });
  it("foto inexistente dá 404",async()=>{
    const {useCase,repo}=setup();repo.getPhotoInfo.mockResolvedValue(null);
    await expect(useCase.execute({role:"PUBLIC"},id,"ausente")).rejects.toHaveProperty("statusCode",404);
  });
  it("perfil inesperado não consegue gerar URL",async()=>{
    const {useCase}=setup();
    await expect(useCase.execute({role:"HACKER" as never},id,photo.photoId)).rejects.toHaveProperty("statusCode",400);
  });
});

describe("OCC-03: DTO público nunca expõe storagePath",()=>{
  const mockDetail={
    id,category:{id:"cat",code:"CAT01",name:"Saneamento"},
    description:"Esgoto",status:"CONFIRMED" as const,
    location:{lat:-12.27,lng:-38.98},votesCount:2,
    createdAt:"2026-11-12T10:00:00Z",
    photos:[{storagePath:photo.storagePath,mimeType:"image/jpeg",sizeBytes:1200,position:1}],
  };
  it("retorna somente URL assinada, sem path interno",async()=>{
    const {urls}=setup();
    const repository={getPublic:vi.fn().mockResolvedValue(mockDetail)};
    const result=await new GetPublicOccurrenceUseCase(
      repository as unknown as IOccurrenceQueryRepository,urls as unknown as IPhotoUrlService,
    ).execute(id);
    expect(result.photoUrls).toEqual([{
      mimeType:"image/jpeg",sizeBytes:1200,position:1,...signed,
    }]);
    expect(JSON.stringify(result)).not.toContain(photo.storagePath);
  });
  it("não gera URL de foto se ocorrência não é pública",async()=>{
    const {urls}=setup();
    const repository={getPublic:vi.fn().mockResolvedValue({...mockDetail,status:"RECEIVED"})};
    const result=await new GetPublicOccurrenceUseCase(
      repository as unknown as IOccurrenceQueryRepository,urls as unknown as IPhotoUrlService,
    ).execute(id);
    expect(result.photoUrls).toEqual([]);
    expect(urls.generateBatch).not.toHaveBeenCalled();
  });
  it("sem detalhe retorna 404",async()=>{
    const {urls}=setup();
    const repository={getPublic:vi.fn().mockResolvedValue(null)};
    await expect(new GetPublicOccurrenceUseCase(
      repository as unknown as IOccurrenceQueryRepository,urls as unknown as IPhotoUrlService,
    ).execute(id)).rejects.toHaveProperty("statusCode",404);
  });
});
