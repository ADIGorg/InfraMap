import { describe, expect, it, vi } from "vitest";
import { listPublicOccurrencesSchema, listAdminOccurrencesSchema, listMyOccurrencesSchema } from "../../../../src/modules/occurrences/presentation/occurrence-query.schema.js";
import { ListPublicOccurrencesUseCase } from "../../../../src/modules/occurrences/application/use-cases/list-public-occurrences.use-case.js";
import { ListMyOccurrencesUseCase } from "../../../../src/modules/occurrences/application/use-cases/list-my-occurrences.use-case.js";
import { ListAdminOccurrencesUseCase } from "../../../../src/modules/occurrences/application/use-cases/list-admin-occurrences.use-case.js";
import type { IOccurrenceQueryRepository, ListFilters } from "../../../../src/modules/occurrences/domain/repositories/occurrence-query.repository.js";

const base: ListFilters={page:1,pageSize:20,sort:"recent"};
const result={data:[],pagination:{page:1,pageSize:20,total:0,totalPages:0}};
const makeRepo=()=>{
  const fns={listPublic:vi.fn().mockResolvedValue(result),listMine:vi.fn().mockResolvedValue(result),listAdmin:vi.fn().mockResolvedValue(result)};
  return {fns,repo:fns as unknown as IOccurrenceQueryRepository};
};

describe("OCC-02 / RN020, RN045: filtros, paginação e visibilidade",()=>{
  it("defaults da consulta pública",()=>{
    const parsed=listPublicOccurrencesSchema.parse({query:{}});
    expect(parsed.query).toEqual({page:1,pageSize:20,sort:"recent"});
  });
  it.each(["0","-1","abc"])("rejeita página %s",page=>{
    expect(listPublicOccurrencesSchema.safeParse({query:{page}}).success).toBe(false);
  });
  it.each(["0","101","999"])("rejeita pageSize %s",pageSize=>{
    expect(listPublicOccurrencesSchema.safeParse({query:{pageSize}}).success).toBe(false);
  });
  it.each(["recent","oldest","most_liked"])("aceita ordenação %s",sort=>{
    expect(listPublicOccurrencesSchema.safeParse({query:{sort}}).success).toBe(true);
  });
  it("rejeita ordenação arbitrária",()=>{
    expect(listPublicOccurrencesSchema.safeParse({query:{sort:"hacker"}}).success).toBe(false);
  });
  it("rejeita latitude/longitude fora dos limites",()=>{
    expect(listPublicOccurrencesSchema.safeParse({query:{minLat:"-91"}}).success).toBe(false);
    expect(listPublicOccurrencesSchema.safeParse({query:{maxLng:"181"}}).success).toBe(false);
  });
  it("converte paginação e bbox numéricos",()=>{
    const parsed=listAdminOccurrencesSchema.parse({query:{
      page:"3",pageSize:"10",minLat:"-13",maxLat:"-12",minLng:"-40",maxLng:"-39",
    }});
    expect(parsed.query).toMatchObject({page:3,pageSize:10,minLat:-13,maxLat:-12,minLng:-40,maxLng:-39});
  });
  it("consulta pública nunca aceita status arbitrário",()=>{
    const parsed=listPublicOccurrencesSchema.parse({query:{status:"RECEIVED"}});
    expect("status" in parsed.query).toBe(false);
  });
  it("consultas do autor e admin aceitam filtro de status",()=>{
    expect(listMyOccurrencesSchema.parse({query:{status:"RECEIVED"}}).query.status).toBe("RECEIVED");
    expect(listAdminOccurrencesSchema.parse({query:{status:"CONFIRMED"}}).query.status).toBe("CONFIRMED");
  });
  it("caso de uso público suprime filtro de status injetado",async()=>{
    const {repo,fns}=makeRepo();
    await new ListPublicOccurrencesUseCase(repo).execute({...base,statuses:["RECEIVED"]});
    expect(fns.listPublic).toHaveBeenCalledWith({...base,statuses:undefined});
  });
  it("caso de uso do cidadão repassa identidade autenticada",async()=>{
    const {repo,fns}=makeRepo();
    await new ListMyOccurrencesUseCase(repo).execute("author-1",{...base,sort:"oldest"});
    expect(fns.listMine).toHaveBeenCalledWith("author-1",{...base,sort:"oldest"});
  });
  it("caso de uso de admin preserva filtros de domínio",async()=>{
    const {repo,fns}=makeRepo();
    await new ListAdminOccurrencesUseCase(repo).execute({...base,statuses:["CONFIRMED"],categoryId:"CAT01"});
    expect(fns.listAdmin).toHaveBeenCalledWith({...base,statuses:["CONFIRMED"],categoryId:"CAT01"});
  });
});
