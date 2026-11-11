import type { Request, Response } from 'express';

type FinalizeOccurrenceUseCase = {
  execute(userId: string, input: unknown): Promise<unknown>;
};

export class FinalizeOccurrenceController {
  constructor(private readonly useCase: FinalizeOccurrenceUseCase) {}

  async handle(req: Request, res: Response) {
    const result = await this.useCase.execute(req.user!.id, req.body);

    return res.status(201).json({
      message: 'Ocorrência registrada com sucesso.',
      data: result,
    });
  }
}