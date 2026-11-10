import type { Request, Response } from 'express';

type ListUC = { execute(userId: string, filters: unknown): Promise<unknown> };
type GetUC = { execute(userId: string, id: string): Promise<unknown> };

export class MyOccurrenceController {
  constructor(private readonly listUC: ListUC, private readonly getUC: GetUC) {}

  async list(req: Request, res: Response) {
    const result = await this.listUC.execute(req.user!.id, req.query);
    return res.status(200).json(result);
  }

  async detail(req: Request, res: Response) {
    const result = await this.getUC.execute(req.user!.id, req.params.id as string);
    return res.status(200).json({ data: result });
  }
}