// src/modules/forwardings/forwardings.controller.ts

import type { Request, Response } from "express";
import type { z } from "zod";

import { createUserSupabaseClient } from "../../infrastructure/supabase/user-client.factory.js";
import { createSupabaseAdminClient } from "../../infrastructure/supabase/admin-client.js";
import { createEmailSender } from "../../infrastructure/email/email-sender.factory.js";

import { UnauthorizedError } from "../../shared/errors/app-error.js";

import {
  listForwardingsByOccurrence,
} from "./forwardings.repository.js";
import { forwardOccurrence } from "./forwardings.service.js";

import type {
  forwardOccurrenceBodySchema,
  forwardOccurrenceParamsSchema,
} from "./forwardings.schema.js";

export async function forward(req: Request, res: Response): Promise<void> {
  if (!req.user || !req.token) throw new UnauthorizedError();

  const { id } = req.validated?.params as z.infer<
    typeof forwardOccurrenceParamsSchema
  >;
  const body = req.validated?.body as z.infer<
    typeof forwardOccurrenceBodySchema
  >;

  const userClient = createUserSupabaseClient(req.token);
  const emailSender = createEmailSender();

  const result = await forwardOccurrence(userClient, emailSender, id, {
    agencyId: body.agency_id,
    observations: body.observations,
  });

  // 201 mesmo em FAILED: a linha foi criada e o resultado foi registrado.
  // O cliente decide se tenta de novo consultando a lista.
  res.status(201).json({ data: result });
}

export async function list(req: Request, res: Response): Promise<void> {
  if (!req.user || !req.token) throw new UnauthorizedError();

  const { id } = req.validated?.params as z.infer<
    typeof forwardOccurrenceParamsSchema
  >;

  const userClient = createUserSupabaseClient(req.token);
  const adminClient = createSupabaseAdminClient();

  const data = await listForwardingsByOccurrence(userClient, adminClient, id);
  res.json({ data });
}