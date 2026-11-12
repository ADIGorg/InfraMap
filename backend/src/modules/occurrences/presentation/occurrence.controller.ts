import type { Request, Response } from "express";
import type { FinalizeOccurrenceUseCase } from "../application/use-cases/finalize-occurrence.use-case.js";
import type { FinalizeOccurrenceInput } from "../domain/repositories/occurrence.repository.js";

export class FinalizeOccurrenceController {
  constructor(private readonly useCase: FinalizeOccurrenceUseCase) {}

  async handle(req: Request, res: Response): Promise<void> {
    const body = req.validated?.body as FinalizeOccurrenceInput;
    const result = await this.useCase.execute(req.user!.id, body);
    res.status(201).json({
      message: "Ocorrência registrada com sucesso.",
      data: result,
    });
  }
}
