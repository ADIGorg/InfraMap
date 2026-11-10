import type { Request, Response } from 'express';

type ListUC = { execute(filters: unknown): Promise<unknown> };
type GetUC = { execute(id: string): Promise<unknown> };

export class AdminOccurrenceQueryController {
  constructor(private readonly listUC: ListUC, private readonly getUC: GetUC) {}

  async list(req: Request, res: Response) {
    const result = await this.listUC.execute(req.query);
    return res.status(200).json(result);
  }

  async detail(req: Request, res: Response) {
    const result = await this.getUC.execute(req.params.id as string);
    return res.status(200).json({ data: result });
  }
}