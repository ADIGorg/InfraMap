import { z } from 'zod';
import { http } from '@/infrastructure/api/http-client';

// Contrato real do GET /admin/occurrences/:id/forwardings/:forwardingId/messages.
// O backend entrega nomes em snake_case; o frontend utiliza camelCase.
const forwardingReplySchema = z.object({
  id: z.uuid(),
  forwarding_id: z.uuid(),
  message_id: z.string().min(1),
  sender_email: z.string().min(1),
  recipient_email: z.string(),
  subject: z.string(),
  body_text: z.string(),
  received_at: z.iso.datetime({ offset: true }),
});

export interface ForwardingReply {
  id: string;
  forwardingId: string;
  messageId: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  bodyText: string;
  receivedAt: string;
}

export async function getForwardingReplies(
  occurrenceId: string,
  forwardingId: string,
  signal?: AbortSignal,
): Promise<ForwardingReply[]> {
  const payload = await http<unknown>(
    `/admin/occurrences/${occurrenceId}/forwardings/${forwardingId}/messages`,
    { signal },
  );

  const { data } = z.object({
    data: z.array(forwardingReplySchema),
  }).parse(payload);

  return data.map(message => ({
    id: message.id,
    forwardingId: message.forwarding_id,
    messageId: message.message_id,
    senderEmail: message.sender_email,
    recipientEmail: message.recipient_email,
    subject: message.subject,
    bodyText: message.body_text,
    receivedAt: message.received_at,
  }));
}
