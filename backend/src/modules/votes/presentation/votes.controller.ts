import type { Request, Response } from "express";
import { supabasePublic } from "../../../infrastructure/supabase/public-client.js";
import { createUserSupabaseClient } from "../../../infrastructure/supabase/user-client.factory.js";
import { UnauthorizedError } from "../../../shared/errors/app-error.js";
import { addVote } from "../application/use-cases/add-vote.use-case.js";
import { removeVote } from "../application/use-cases/remove-vote.use-case.js";
import { getVoteCount } from "../application/use-cases/get-vote-count.use-case.js";
import { createVoteRepository } from "../infrastructure/repositories/supabase-vote.repository.js";

function occurrenceId(req: Request) {
  return (req.validated?.params as { id: string }).id;
}

function userRepository(req: Request) {
  if (!req.token) throw new UnauthorizedError();
  return createVoteRepository(createUserSupabaseClient(req.token));
}

export async function add(req: Request, res: Response) {
  res.status(201).json({ data: await addVote(userRepository(req), occurrenceId(req)) });
}

export async function remove(req: Request, res: Response) {
  res.json({ data: await removeVote(userRepository(req), occurrenceId(req)) });
}

export async function count(req: Request, res: Response) {
  res.json({ data: await getVoteCount(createVoteRepository(supabasePublic), occurrenceId(req)) });
}
