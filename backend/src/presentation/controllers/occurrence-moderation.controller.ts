import { type Request, type Response } from 'express';
type StartAnalysisUseCase = {
  execute(userId: string, occurrenceId: string): Promise<unknown>;
};
type ConfirmOccurrenceUseCase = {
  execute(userId: string, occurrenceId: string): Promise<unknown>;
};
type RejectOccurrenceUseCase = {
  execute(userId: string, occurrenceId: string, justification: string): Promise<unknown>;
};
type StartServiceUseCase = {
  execute(userId: string, occurrenceId: string, actionNotes: string): Promise<unknown>;
};
type SetPriorityUseCase = {
  execute(userId: string, occurrenceId: string, priority: unknown): Promise<unknown>;
};
type ResolveOccurrenceUseCase = {
  execute(userId: string, occurrenceId: string, resolutionNotes: string): Promise<unknown>;
};

type CreateObservationUseCase = {
  execute(
    userId: string,
    occurrenceId: string,
    content: string,
    visibility: unknown
  ): Promise<unknown>;
};

export class OccurrenceModerationController {
  constructor(
    private startAnalysisUseCase: StartAnalysisUseCase,
    private confirmOccurrenceUseCase: ConfirmOccurrenceUseCase,
    private rejectOccurrenceUseCase: RejectOccurrenceUseCase,
    private setPriorityUseCase: SetPriorityUseCase,
    private startServiceUseCase: StartServiceUseCase,
    private resolveOccurrenceUseCase: ResolveOccurrenceUseCase,
    private createObservationUseCase: CreateObservationUseCase
  ) {}

  async createObservation(req: Request, res: Response) {
    const occurrenceId = req.params.id;
    if (typeof occurrenceId !== 'string') {
      return res.status(400).json({ message: 'ID da ocorrência inválido.' });
    }

    const result = await this.createObservationUseCase.execute(
      req.user!.id,
      occurrenceId,
      req.body.content,
      req.body.visibility
    );
    return res.status(201).json({
      message: 'Observação registrada com sucesso.',
      data: result,
    });
  }

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

    await this.rejectOccurrenceUseCase.execute(
      req.user!.id,
      occurrenceId,
      req.body.justification
    );
    return res.status(200).json({ message: 'Ocorrência rejeitada com sucesso.' });
  }

  // MOD-02
  async setPriority(req: Request, res: Response) {
    const occurrenceId = req.params.id;
    if (typeof occurrenceId !== 'string') {
      return res.status(400).json({ message: 'ID da ocorrência inválido.' });
    }

    await this.setPriorityUseCase.execute(
      req.user!.id,
      occurrenceId,
      req.body.priority
    );
    return res.status(200).json({ message: 'Prioridade definida com sucesso.' });
  }

  async startService(req: Request, res: Response) {
    const occurrenceId = req.params.id;
    if (typeof occurrenceId !== 'string') {
      return res.status(400).json({ message: 'ID da ocorrência inválido.' });
    }

    await this.startServiceUseCase.execute(
      req.user!.id,
      occurrenceId,
      req.body.actionNotes
    );
    return res.status(200).json({ message: 'Atendimento iniciado com sucesso.' });
  }

  async resolve(req: Request, res: Response) {
    const occurrenceId = req.params.id;
    if (typeof occurrenceId !== 'string') {
      return res.status(400).json({ message: 'ID da ocorrência inválido.' });
    }

    await this.resolveOccurrenceUseCase.execute(
      req.user!.id,
      occurrenceId,
      req.body.resolutionNotes
    );
    return res.status(200).json({ message: 'Ocorrência resolvida com sucesso.' });
  }
}