import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError, NotFoundError } from "../../shared/errors/app-error.js";

/** A leitura usa cliente do usuário e portanto respeita a policy is_admin(). */
export async function listForwardingReplies(
  userClient: SupabaseClient,
  occurrenceId: string,
  forwardingId: string,
) {
  const { data: forwarding, error: forwardingError } = await userClient
    .from("forwardings")
    .select("id")
    .eq("id", forwardingId)
    .eq("occurrence_id", occurrenceId)
    .maybeSingle();
  if (forwardingError) throw new AppError(500, "FORWARDING_LOOKUP_FAILED", "Erro ao consultar encaminhamento.");
  if (!forwarding) throw new NotFoundError("Encaminhamento não encontrado.");

  const { data, error } = await userClient
    .from("forwarding_messages")
    .select("id,forwarding_id,message_id,sender_email,recipient_email,subject,body_text,received_at")
    .eq("forwarding_id", forwardingId)
    .order("received_at", { ascending: true })
    .limit(100);
  if (error) throw new AppError(500, "FORWARDING_REPLIES_FAILED", "Erro ao consultar respostas.");
  return data ?? [];
}
