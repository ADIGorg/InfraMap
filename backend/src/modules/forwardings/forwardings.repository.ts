// src/modules/forwardings/forwardings.repository.ts

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../.././shared/errors/app-error.js";

// ============================================================
// Types
// ============================================================
export interface AgencySummary {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
}

export interface OccurrenceForEmail {
  id: string;
  status: string;
  categoryCode: string;
  categoryName: string;
  description: string;
  location: { lat: number; lng: number };
  createdAt: string;
}

export interface ForwardingRow {
  id: string;
  occurrenceId: string;
  agencyId: string;
  adminId: string;
  recipientEmail: string;
  subject: string;
  observations: string | null;
  status: "PENDING" | "SENT" | "FAILED";
  providerMessageId: string | null;
  errorCode: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface ForwardingListItem extends ForwardingRow {
  agencyName: string;
  adminName: string;
}

// ============================================================
// Error mapping
// ============================================================
function mapPgError(error: { code?: string; message: string }): never {
  if (error.code === "42501") throw new ForbiddenError(error.message);
  if (error.code === "P0002") throw new NotFoundError(error.message);
  if (error.code === "22023" || error.code === "23505") {
    throw new ConflictError(error.message);
  }
  throw new AppError(
    500,
    "FORWARDING_PERSIST_FAILED",
    "Não foi possível registrar o encaminhamento.",
  );
}

function parseGeoPoint(raw: unknown): { lat: number; lng: number } {
  const g = raw as { type?: string; coordinates?: [number, number] } | null;
  if (g?.type === "Point" && g.coordinates) {
    return { lng: g.coordinates[0], lat: g.coordinates[1] };
  }
  return { lat: 0, lng: 0 };
}

function mapForwardingRow(r: Record<string, unknown>): ForwardingRow {
  return {
    id: r.id as string,
    occurrenceId: r.occurrence_id as string,
    agencyId: r.agency_id as string,
    adminId: r.admin_id as string,
    recipientEmail: r.recipient_email as string,
    subject: r.subject as string,
    observations: (r.observations as string | null) ?? null,
    status: r.status as ForwardingRow["status"],
    providerMessageId: (r.provider_message_id as string | null) ?? null,
    errorCode: (r.error_code as string | null) ?? null,
    createdAt: r.created_at as string,
    sentAt: (r.sent_at as string | null) ?? null,
  };
}

// ============================================================
// Reads
// ============================================================
export async function findAgency(
  userClient: SupabaseClient,
  agencyId: string,
): Promise<AgencySummary | null> {
  const { data, error } = await userClient
    .from("agencies")
    .select("id, name, email, is_active")
    .eq("id", agencyId)
    .maybeSingle();

  if (error) {
    throw new AppError(500, "AGENCY_LOOKUP_FAILED", "Falha ao consultar órgão.");
  }
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    isActive: data.is_active,
  };
}

export async function getOccurrenceForEmail(
  userClient: SupabaseClient,
  occurrenceId: string,
): Promise<OccurrenceForEmail | null> {
  const { data, error } = await userClient.rpc("get_occurrence_detail", {
    p_id: occurrenceId,
  });

  if (error) {
    if (
      error.message.includes("Acesso negado") ||
      error.message.includes("Ocorrência não encontrada")
    ) {
      return null;
    }
    throw new AppError(
      500,
      "OCCURRENCE_LOOKUP_FAILED",
      "Falha ao consultar ocorrência.",
    );
  }
  if (!data) return null;

  const d = data as Record<string, unknown>;
  return {
    id: d.id as string,
    status: d.status as string,
    categoryCode: d.category_code as string,
    categoryName: d.category_name as string,
    description: d.description as string,
    location: parseGeoPoint(d.location),
    createdAt: d.created_at as string,
  };
}

export async function listForwardingsByOccurrence(
  userClient: SupabaseClient,
  adminClient: SupabaseClient,
  occurrenceId: string,
): Promise<ForwardingListItem[]> {
  // Query 1 — RLS valida admin (policy forwardings_select_admin).
  const { data: rows, error } = await userClient
    .from("forwardings")
    .select(
      "id, occurrence_id, agency_id, admin_id, recipient_email, subject, observations, status, provider_message_id, error_code, created_at, sent_at",
    )
    .eq("occurrence_id", occurrenceId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new AppError(
      500,
      "FORWARDING_LOOKUP_FAILED",
      "Falha ao consultar encaminhamentos.",
    );
  }
  if (!rows || rows.length === 0) return [];

  // Query 2 — nomes dos admins (adminClient; RLS de profiles bloqueia nomes de outros).
  const adminIds = [...new Set(rows.map((r) => r.admin_id as string))];
  const { data: profiles, error: profileError } = await adminClient
    .from("profiles")
    .select("id, name")
    .in("id", adminIds);

  if (profileError) {
    throw new AppError(500, "PROFILE_LOOKUP_FAILED", "Falha ao consultar nomes.");
  }

  const adminNameById = new Map(
    (profiles ?? []).map((p) => [p.id as string, p.name as string] as const),
  );

  // Query 3 — nomes dos órgãos (adminClient; RLS de agencies é admin-only
  // mas o userClient já passou por authorizeRole, então também funcionaria;
  // usar adminClient mantém consistência com a Query 2 e evita depender de RLS).
  const agencyIds = [...new Set(rows.map((r) => r.agency_id as string))];
  const { data: agencies, error: agencyError } = await adminClient
    .from("agencies")
    .select("id, name")
    .in("id", agencyIds);

  if (agencyError) {
    throw new AppError(500, "AGENCY_LOOKUP_FAILED", "Falha ao consultar órgãos.");
  }

  const agencyNameById = new Map(
    (agencies ?? []).map((a) => [a.id as string, a.name as string] as const),
  );

  return rows.map((r) => {
    const base = mapForwardingRow(r as Record<string, unknown>);
    return {
      ...base,
      agencyName: agencyNameById.get(base.agencyId) ?? "Órgão",
      adminName: adminNameById.get(base.adminId) ?? "Usuário",
    };
  });
}

// ============================================================
// RPCs
// ============================================================
export async function createForwarding(
  userClient: SupabaseClient,
  occurrenceId: string,
  agencyId: string,
  subject: string,
  observations: string | null,
): Promise<string> {
  const { data, error } = await userClient.rpc("create_forwarding", {
    p_occurrence_id: occurrenceId,
    p_agency_id:     agencyId,
    p_subject:       subject,
    p_observations:  observations,
  });
  if (error) mapPgError(error);
  return data as string;
}

export async function recordForwardingResult(
  userClient: SupabaseClient,
  forwardingId: string,
  result: {
    status: "SENT" | "FAILED";
    providerMessageId?: string;
    errorCode?: string;
  },
): Promise<ForwardingRow> {
  const { data, error } = await userClient.rpc("record_forwarding_result", {
    p_forwarding_id:       forwardingId,
    p_status:              result.status,
    p_provider_message_id: result.providerMessageId ?? null,
    p_error_code:          result.errorCode ?? null,
  });
  if (error) mapPgError(error);
  return mapForwardingRow(data as Record<string, unknown>);
}