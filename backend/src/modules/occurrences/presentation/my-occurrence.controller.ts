import type { Request, Response } from 'express';
import { toOccurrenceListFilters } from "./occurrence-query.mapper.js";

type ListUC = { execute(userId: string, filters: unknown): Promise<unknown> };
type GetUC = { execute(userId: string, id: string): Promise<unknown> };

export class MyOccurrenceController {
  constructor(private readonly listUC: ListUC, private readonly getUC: GetUC) {}

  async list(req: Request, res: Response) {
    const result = await this.listUC.execute(req.user!.id, toOccurrenceListFilters(req.validated?.query as Parameters<typeof toOccurrenceListFilters>[0]));
    return res.status(200).json(result);
  }

  async detail(req: Request, res: Response) {
    const result = await this.getUC.execute(req.user!.id, req.params.id as string);
    return res.status(200).json({ data: result });
  }
}