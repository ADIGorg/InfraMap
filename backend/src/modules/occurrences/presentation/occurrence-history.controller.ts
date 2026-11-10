import type { Request, Response } from 'express';

interface GetOccurrenceHistoryUseCase {
  execute(
    requester: { userId: string; role: 'CITIZEN' | 'ADMIN' },
    occurrenceId: string
  ): Promise<unknown>;
}

export class OccurrenceHistoryController {
  constructor(private readonly getOccurrenceHistoryUseCase: GetOccurrenceHistoryUseCase) {}

  async handle(req: Request, res: Response) {
    const occurrenceId = req.params.id;

    if (typeof occurrenceId !== 'string') {
      return res.status(400).json({ message: 'Invalid occurrence ID' });
    }

    const requester = {
      userId: req.user!.id,
      role: req.user!.role as 'CITIZEN' | 'ADMIN',
    };

    const events = await this.getOccurrenceHistoryUseCase.execute(
      requester,
      occurrenceId
    );

    return res.status(200).json({ data: events });
  }
}