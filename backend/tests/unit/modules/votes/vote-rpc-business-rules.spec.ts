import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addVote } from "../../../../src/modules/votes/application/use-cases/add-vote.use-case.js";
import { removeVote } from "../../../../src/modules/votes/application/use-cases/remove-vote.use-case.js";
import { getVoteCount } from "../../../../src/modules/votes/application/use-cases/get-vote-count.use-case.js";
import { createVoteRepository } from "../../../../src/modules/votes/infrastructure/repositories/supabase-vote.repository.js";
import type { VoteRepository } from "../../../../src/modules/votes/domain/repositories/vote.repository.js";

const id = "10000000-0000-4000-8000-000000001234";

describe("QA-01 / API1-63 — regra de votos e isolamento da RPC", () => {
  function inMemory() {
    const repo: VoteRepository = {
      register: vi.fn().mockResolvedValue({occurrence_id:id,vote_count:1}),
      countPublic: vi.fn().mockResolvedValue({occurrence_id:id,vote_count:1}),
    };
    return repo;
  }

  it("ADD chama a operação transacional, sem modificar contagem fora do banco", async () => {
    const repo = inMemory();
    const response = await addVote(repo,id);
    expect(repo.register).toHaveBeenCalledWith(id,"ADD");
    expect(response.vote_count).toBe(1);
  });

  it("REMOVE usa a mesma RPC atômica, não DELETE direto", async () => {
    const repo = inMemory();
    await removeVote(repo,id);
    expect(repo.register).toHaveBeenCalledWith(id,"REMOVE");
  });

  it("consulta contagem através de projeção pública", async () => {
    const repo = inMemory();
    await getVoteCount(repo,id);
    expect(repo.countPublic).toHaveBeenCalledWith(id);
  });

  it.each([
    ["42501",403,"auto-voto ou cidadão não autorizado"],
    ["23505",409,"voto duplicado"],
    ["22023",409,"ocorrência em status não elegível"],
    ["P0002",404,"voto ou ocorrência inexistente"],
  ])("mapeia SQLSTATE %s para HTTP %d (%s)",async (pgCode,httpStatus) => {
    const single=vi.fn().mockResolvedValue({data:null,error:{code:pgCode,message:"erro simulado"}});
    const rpc=vi.fn().mockReturnValue({single});
    const client={rpc} as unknown as SupabaseClient;
    const repo=createVoteRepository(client);
    await expect(addVote(repo,id)).rejects.toHaveProperty("statusCode",httpStatus);
    expect(rpc).toHaveBeenCalledWith("register_vote",{p_occurrence_id:id,p_action:"ADD"});
  });

  it("retorno sem registro válido é erro, não confirmação falsa",async()=>{
    const client={rpc:vi.fn().mockReturnValue({
      single:vi.fn().mockResolvedValue({data:null,error:null}),
    })} as unknown as SupabaseClient;
    await expect(addVote(createVoteRepository(client),id)).rejects.toHaveProperty("statusCode",500);
  });

  it("contagem ausente nunca é substituída por zero silencioso",async()=>{
    const client={from:vi.fn().mockReturnValue({
      select:vi.fn().mockReturnValue({
        eq:vi.fn().mockReturnValue({
          maybeSingle:vi.fn().mockResolvedValue({data:null,error:null}),
        }),
      }),
    })} as unknown as SupabaseClient;
    await expect(getVoteCount(createVoteRepository(client),id)).rejects.toHaveProperty("statusCode",404);
  });
});
