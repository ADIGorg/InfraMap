import type { Request, Response } from 'express';

interface RejectOccurrenceHandler {
  execute(userId: string, occurrenceId: string, justification: string): Promise<unknown>;
}

interface StartAnalysisHandler {
  execute(userId: string, occurrenceId: string): Promise<unknown>;
}

interface ConfirmOccurrenceHandler {
  execute(userId: string, occurrenceId: string): Promise<unknown>;
}

export class OccurrenceModerationController {
  constructor(
    private startAnalysisUseCase: StartAnalysisHandler,
    private confirmOccurrenceUseCase: ConfirmOccurrenceHandler,
    private rejectOccurrenceUseCase: RejectOccurrenceHandler
  ) {}

  async startAnalysis(req: Request, res: Response) {
    const occurrenceId = req.params.id;
    if (typeof occurrenceId !== 'string') {
      return res.status(400).json({ message: 'ID da ocorrência inválido.' });
    }

    await this.startAnalysisUseCase.execute(req.user!.id, occurrenceId);
    return res.status(200).json({ message: 'Análise iniciada com sucesso.' });
  }

  async confirm(req: Request, res: Response) {
    const occurrenceId = req.params.id;
    if (typeof occurrenceId !== 'string') {
      return res.status(400).json({ message: 'ID da ocorrência inválido.' });
    }

    await this.confirmOccurrenceUseCase.execute(req.user!.id, occurrenceId);
    return res.status(200).json({ message: 'Ocorrência confirmada com sucesso.' });
  }

  async reject(req: Request, res: Response) {
    const occurrenceId = req.params.id;
    if (typeof occurrenceId !== 'string') {
      return res.status(400).json({ message: 'ID da ocorrência inválido.' });
    }

    await this.rejectOccurrenceUseCase.execute(req.user!.id, occurrenceId, req.body.justification);
    return res.status(200).json({ message: 'Ocorrência rejeitada com sucesso.' });
  }
}