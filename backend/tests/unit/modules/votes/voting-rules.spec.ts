import { describe, expect, it, vi } from "vitest";
import { addVote } from "../../../../src/modules/votes/application/use-cases/add-vote.use-case.js";
import { removeVote } from "../../../../src/modules/votes/application/use-cases/remove-vote.use-case.js";
import { createVoteRepository } from "../../../../src/modules/votes/infrastructure/repositories/supabase-vote.repository.js";
import type { VoteRepository } from "../../../../src/modules/votes/domain/repositories/vote.repository.js";
import type { SupabaseClient } from "@supabase/supabase-js";

const occurrenceId = "10000000-0000-4000-8000-000000007010";

function setup(error: { code?: string; message: string } | null = null) {
  const single = vi.fn().mockResolvedValue(error
    ? { data: null, error }
    : { data: { occurrence_id: occurrenceId, new_count: 1 }, error: null });
  const rpc = vi.fn().mockReturnValue({ single });
  const repository = createVoteRepository({ rpc } as unknown as SupabaseClient);
  return { repository, rpc, single };
}

describe("QA-01 / RN059: votos, remoção e autorização", () => {
  it("adiciona voto pelo comando transacional ADD", async () => {
    const { repository, rpc } = setup();
    await expect(addVote(repository, occurrenceId)).resolves.toEqual({
      occurrence_id: occurrenceId, vote_count: 1,
    });
    expect(rpc).toHaveBeenCalledWith("register_vote", {
      p_occurrence_id: occurrenceId, p_action: "ADD",
    });
  });

  it("remove somente pelo comando REMOVE", async () => {
    const { repository, rpc } = setup();
    await removeVote(repository, occurrenceId);
    expect(rpc).toHaveBeenCalledWith("register_vote", {
      p_occurrence_id: occurrenceId, p_action: "REMOVE",
    });
  });

  it.each([
    ["42501", 403, "voto próprio, perfil ou conta não autorizada"],
    ["23505", 409, "voto duplicado"],
    ["22023", 409, "ocorrência em estado não elegível"],
    ["P0002", 404, "ocorrência/voto inexistente"],
  ])("mapeia SQLSTATE %s para HTTP %i (%s)", async (code, status) => {
    const { repository } = setup({ code, message: "Falha esperada de autorização" });
    await expect(addVote(repository, occurrenceId)).rejects.toMatchObject({
      statusCode: status,
    });
  });

  it("não engole erro inesperado do PostgreSQL", async () => {
    const { repository } = setup({ code: "XX000", message: "Erro interno" });
    await expect(addVote(repository, occurrenceId)).rejects.toMatchObject({
      statusCode: 500,
    });
  });

  it("casos de uso não manipulam contadores em memória", async () => {
    const repo: VoteRepository = {
      register: vi.fn().mockResolvedValue({ occurrence_id: occurrenceId, vote_count: 14 }),
      countPublic: vi.fn(),
    };
    expect((await addVote(repo, occurrenceId)).vote_count).toBe(14);
    expect(repo.register).toHaveBeenCalledWith(occurrenceId, "ADD");
  });
});
