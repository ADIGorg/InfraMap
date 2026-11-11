import type { VoteRepository } from "../../domain/repositories/vote.repository.js";

export const getVoteCount = (repository: VoteRepository, id: string) => repository.countPublic(id);
