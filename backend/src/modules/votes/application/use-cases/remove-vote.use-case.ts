import type { VoteRepository } from "../../domain/repositories/vote.repository.js";

export const removeVote = (repository: VoteRepository, id: string) => repository.register(id, "REMOVE");
