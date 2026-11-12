import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createVoteRepository } from "../../../../src/modules/votes/infrastructure/repositories/supabase-vote.repository.js";
import { addVote } from "../../../../src/modules/votes/application/use-cases/add-vote.use-case.js";
import { removeVote } from "../../../../src/modules/votes/application/use-cases/remove-vote.use-case.js";
import { getVoteCount } from "../../../../src/modules/votes/application/use-cases/get-vote-count.use-case.js";

const occurrenceId = "10000000-0000-4000-8000-000000000041";

function fixture(value: { data?: unknown; error?: {code?: string;message: string} | null } = {}) {
  const result = { data: value.data ?? null, error: value.error ?? null };
  const single = vi.fn().mockResolvedValue(result);
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({eq});
  const from = vi.fn().mockReturnValue({select});
  const rpc = vi.fn().mockReturnValue({single});
  const client = {rpc,from} as unknown as SupabaseClient;
  return {repo:createVoteRepository(client),rpc,from};
}

describe("API1-63 QA-01 — votos: repository e regras SQLSTATE",()=>{
  it("ADD registra voto e conserva contagem",async()=>{
    const {repo,rpc}=fixture({data:{occurrence_id:occurrenceId,new_count:3}});
    expect(await addVote(repo,occurrenceId)).toEqual({occurrence_id:occurrenceId,vote_count:3});
    expect(rpc).toHaveBeenCalledWith("register_vote",{p_occurrence_id:occurrenceId,p_action:"ADD"});
  });
  it("REMOVE retira voto e reflete a nova contagem",async()=>{
    const {repo,rpc}=fixture({data:{occurrence_id:occurrenceId,new_count:2}});
    expect(await removeVote(repo,occurrenceId)).toEqual({occurrence_id:occurrenceId,vote_count:2});
    expect(rpc).toHaveBeenCalledWith("register_vote",{p_occurrence_id:occurrenceId,p_action:"REMOVE"});
  });
  it.each([
    ["23505",409],
    ["42501",403],
    ["22023",409],
    ["P0002",404],
    ["08006",500],
  ])("mapa SQLSTATE %s gera HTTP %s",async(code,statusCode)=>{
    const {repo}=fixture({error:{code,message:"Erro de banco"}});
    await expect(addVote(repo,occurrenceId)).rejects.toHaveProperty("statusCode",statusCode);
  });
  it("resultado vazio da RPC não é tratado como sucesso",async()=>{
    const {repo}=fixture();
    await expect(addVote(repo,occurrenceId)).rejects.toHaveProperty("statusCode",500);
  });
  it("consulta pública retorna apenas ID e contagem",async()=>{
    const {repo,from}=fixture({data:{id:occurrenceId,vote_count:12}});
    expect(await getVoteCount(repo,occurrenceId)).toEqual({occurrence_id:occurrenceId,vote_count:12});
    expect(from).toHaveBeenCalledWith("public_occurrences");
  });
  it("consulta de ocorrência não pública não retorna contagem",async()=>{
    const {repo}=fixture();
    await expect(getVoteCount(repo,occurrenceId)).rejects.toHaveProperty("statusCode",404);
  });
});
