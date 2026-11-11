export interface VoteCount {
  occurrence_id: string;
  vote_count: number;
}

export interface VoteRepository {
  register(id: string, action: "ADD" | "REMOVE"): Promise<VoteCount>;
  countPublic(id: string): Promise<VoteCount>;
}
