import type { Request, Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";

import { UnauthorizedError } from "../../../shared/errors/app-error.js";

import { SupabaseOccurrenceModerationRepository } from "../infrastructure/repositories/supabase-moderation.repository.js";

import { StartAnalysisUseCase } from "../application/use-cases/start-analysis.use-case.js";
import { ConfirmOccurrenceUseCase } from "../application/use-cases/confirm-occurrence.use-case.js";
import { RejectOccurrenceUseCase } from "../application/use-cases/reject-occurrence.use-case.js";
import { SetPriorityUseCase } from "../application/use-cases/set-priority.use-case.js";
import { StartServiceUseCase } from "../application/use-cases/start-service.use-case.js";
import { ResolveOccurrenceUseCase } from "../application/use-cases/resolve-occurrence.use-case.js";
import { CreateObservationUseCase } from "../application/use-cases/create-observation.use-case.js";
import { AdjustLocationUseCase } from "../application/use-cases/adjust-location.use-case.js";
import { CorrectClassificationUseCase } from "../application/use-cases/correct-classification.use-case.js";

export type CreateUserClient = (accessToken: string) => SupabaseClient;

export class OccurrenceModerationController {
  constructor(private readonly createUserClient: CreateUserClient) {}

  // Helpers
  private repo(req: Request) {
    if (!req.token) throw new UnauthorizedError();
    return new SupabaseOccurrenceModerationRepository(
      this.createUserClient(req.token),
    );
  }

  private occurrenceId(req: Request): string | null {
    const id = req.params.id;
    return typeof id === "string" && id.length > 0 ? id : null;
  }

  // ============================================================
  // MOD-01
  // ============================================================
  async startAnalysis(req: Request, res: Response) {
    const id = this.occurrenceId(req);
    if (!id) return res.status(400).json({ message: "ID da ocorrência inválido." });

    await new StartAnalysisUseCase(this.repo(req)).execute(id);
    return res.status(200).json({ message: "Análise iniciada com sucesso." });
  }

  async confirm(req: Request, res: Response) {
    const id = this.occurrenceId(req);
    if (!id) return res.status(400).json({ message: "ID da ocorrência inválido." });

    await new ConfirmOccurrenceUseCase(this.repo(req)).execute(id);
    return res.status(200).json({ message: "Ocorrência confirmada com sucesso." });
  }

  async reject(req: Request, res: Response) {
    const id = this.occurrenceId(req);
    if (!id) return res.status(400).json({ message: "ID da ocorrência inválido." });

    const body = req.validated?.body as { justification: string };
    await new RejectOccurrenceUseCase(this.repo(req)).execute(id, body.justification);
    return res.status(200).json({ message: "Ocorrência rejeitada com sucesso." });
  }

  // ============================================================
  // MOD-02
  // ============================================================
  async setPriority(req: Request, res: Response) {
    const id = this.occurrenceId(req);
    if (!id) return res.status(400).json({ message: "ID da ocorrência inválido." });

    const body = req.validated?.body as { priority: string };
    await new SetPriorityUseCase(this.repo(req)).execute(id, body.priority);
    return res.status(200).json({ message: "Prioridade definida com sucesso." });
  }

  async startService(req: Request, res: Response) {
    const id = this.occurrenceId(req);
    if (!id) return res.status(400).json({ message: "ID da ocorrência inválido." });

    const body = req.validated?.body as { actionNotes: string };
    await new StartServiceUseCase(this.repo(req)).execute(id, body.actionNotes);
    return res.status(200).json({ message: "Atendimento iniciado com sucesso." });
  }

  async resolve(req: Request, res: Response) {
    const id = this.occurrenceId(req);
    if (!id) return res.status(400).json({ message: "ID da ocorrência inválido." });

    const body = req.validated?.body as { resolutionNotes?: string };
    await new ResolveOccurrenceUseCase(this.repo(req)).execute(id, body.resolutionNotes);
    return res.status(200).json({ message: "Ocorrência resolvida com sucesso." });
  }

  // ============================================================
  // MOD-03
  // ============================================================
  async createObservation(req: Request, res: Response) {
    const id = this.occurrenceId(req);
    if (!id) return res.status(400).json({ message: "ID da ocorrência inválido." });

    const body = req.validated?.body as { content: string; visibility: string };
    const result = await new CreateObservationUseCase(this.repo(req)).execute(
      id,
      body.content,
      body.visibility,
    );
    return res.status(201).json({
      message: "Observação registrada com sucesso.",
      data: result,
    });
  }

  // ============================================================
  // MOD-04
  // ============================================================
  async adjustLocation(req: Request, res: Response) {
    const id = this.occurrenceId(req);
    if (!id) return res.status(400).json({ message: "ID da ocorrência inválido." });

    const body = req.validated?.body as { lat: number; lng: number };
    await new AdjustLocationUseCase(this.repo(req)).execute(id, {
      lat: body.lat,
      lng: body.lng,
    });
    return res.status(200).json({ message: "Localização ajustada com sucesso." });
  }

  async correctClassification(req: Request, res: Response) {
    const id = this.occurrenceId(req);
    if (!id) return res.status(400).json({ message: "ID da ocorrência inválido." });

    const body = req.validated?.body as {
      categoryId?: string;
      description?: string;
    };
    await new CorrectClassificationUseCase(this.repo(req)).execute(
      id,
      body.categoryId ?? null,
      body.description ?? null,
    );
    return res.status(200).json({ message: "Classificação corrigida com sucesso." });
  }
}