import type { VoteRepository } from "../../domain/repositories/vote.repository.js";

export const addVote = (repository: VoteRepository, id: string) => repository.register(id, "ADD");
