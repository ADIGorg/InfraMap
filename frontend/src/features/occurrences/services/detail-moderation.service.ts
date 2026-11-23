import { z } from 'zod';
import { http } from '@/infrastructure/api/http-client';
import type { OccurrenceDetail } from './occurrence-detail.service';

const notes = z.string().trim().min(10, 'Informe pelo menos 10 caracteres.').max(2000);
export const actionSchemas = {
  'start-analysis': z.object({}),
  confirm: z.object({}),
  reject: z.object({ justification: notes, agencyResponse: notes.optional() }),
  priority: z.object({ priority: z.enum(['LOW', 'MEDIUM', 'HIGH']) }),
  'start-service': z.object({ actionNotes: notes }),
  resolve: z.object({ resolutionNotes: notes }),
  location: z.object({ lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180) }),
  classification: z.object({
    categoryId: z.uuid().optional(), description: z.string().trim().min(1).max(500).optional(),
  }).refine(value => !!value.categoryId || !!value.description, 'Informe categoria ou descrição.'),
  observations: z.object({
    content: z.string().trim().min(5, 'Informe pelo menos 5 caracteres.').max(2000),
    visibility: z.enum(['INTERNAL', 'CITIZEN_RESPONSE']),
  }),
};
export type ModerationAction = keyof typeof actionSchemas;
export type ModerationRequest = {
  [K in ModerationAction]: { action: K; body: z.infer<typeof actionSchemas[K]> }
}[ModerationAction];
export const actionLabels: Record<ModerationAction, string> = {
  'start-analysis': 'Iniciar análise', confirm: 'Confirmar ocorrência', reject: 'Rejeitar ocorrência',
  priority: 'Definir prioridade', 'start-service': 'Iniciar atendimento', resolve: 'Marcar como resolvida',
  location: 'Ajustar localização', classification: 'Corrigir classificação', observations: 'Salvar observação',
};
export function allowedActions(detail: OccurrenceDetail): ModerationAction[] {
  const actions: ModerationAction[] = ['observations'];
  if (detail.status === 'RECEIVED') actions.push('start-analysis');
  if (detail.status === 'UNDER_ANALYSIS') actions.push('confirm', 'reject');
  if (detail.status === 'CONFIRMED') actions.push('reject');
  if (detail.status === 'CONFIRMED' && detail.priority) actions.push('start-service');
  if (detail.status === 'IN_SERVICE') actions.push('resolve', 'reject');
  if (['CONFIRMED', 'IN_SERVICE', 'RESOLVED'].includes(detail.status)) actions.push('priority');
  if (!['RESOLVED', 'REJECTED'].includes(detail.status)) {
    actions.push('location');
    if (detail.status !== 'RECEIVED') actions.push('classification');
  }
  return actions;
}
export async function moderateOccurrence(id: string, request: ModerationRequest) {
  const method = ['start-analysis', 'priority', 'location', 'classification'].includes(request.action) ? 'PATCH' : 'POST';
  return http('/admin/occurrences/' + id + '/' + request.action, {
    method, body: actionSchemas[request.action].parse(request.body),
  });
}

