import { z } from "zod";

export const voteParams = z.object({ id: z.uuid() });
