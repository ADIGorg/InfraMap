import { beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { API, PNG, harness, type QaHarness, type TestActor } from "./helpers/local-supabase.js";

describe("API1-65 / QA-03 — API + Supabase local, sem mocks de repository", () => {
  let h: QaHarness;
  let citizen: TestActor;
  let voter: TestActor;
  let operational: TestActor;
  let master: TestActor;

  beforeAll(async () => {
    h = harness();
    citizen = await h.createActor("cidadao");
    voter = await h.createActor("vizinho");
    operational = await h.createActor("operacional", "OPERATIONAL");
    master = await h.createActor("master", "MASTER");
  });

  it("cadastro real, login, isolamento e atualização de perfil", async () => {
    const me = await h.http().get(`${API}/identity/me`)
      .set("Authorization", h.bearer(citizen));
    expect(me.status, JSON.stringify(me.body)).toBe(200);
    expect(me.body.data.email).toBe(citizen.email);

    const invalid = await h.http().get(`${API}/identity/me`);
    expect(invalid.status).toBe(401);
    const updated = await h.http().patch(`${API}/identity/me`)
      .set("Authorization", h.bearer(citizen))
      .send({ name: "Cidadão QA Atualizado", phone: "75999990000" });
    expect(updated.status, JSON.stringify(updated.body)).toBe(200);
    expect(updated.body.data.name).toBe("Cidadão QA Atualizado");

    const attack = await h.http().patch(`${API}/identity/me`)
      .set("Authorization", h.bearer(voter)).send({ role: "ADMIN", is_active: true });
    expect(attack.status).toBe(400);

    const forbidden = await h.http().get(`${API}/admin/dashboard`)
      .set("Authorization", h.bearer(citizen));
    expect(forbidden.status).toBe(403);
  });

  it("cadastro com câmera simulada, IA mock, revisão, mapa, voto e URL assinada", async () => {
    const { occurrenceId, photoId, storagePath } = await h.createOccurrence(citizen, true);

    const mine = await h.http().get(`${API}/occurrences/mine`)
      .set("Authorization", h.bearer(citizen));
    expect(mine.status, JSON.stringify(mine.body)).toBe(200);
    expect(JSON.stringify(mine.body)).toContain(occurrenceId);

    const anotherCitizen = await h.http().get(`${API}/occurrences/mine/${occurrenceId}`)
      .set("Authorization", h.bearer(voter));
    expect(anotherCitizen.status).toBe(404);

    const premature = await h.http().get(`${API}/occurrences/public/${occurrenceId}`);
    expect(premature.status).toBe(404);

    const earlyPhoto = await h.http()
      .get(`${API}/occurrences/public/${occurrenceId}/photos/${photoId}`);
    expect(earlyPhoto.status).toBe(403);

    const notAdmin = await h.http().patch(`${API}/admin/occurrences/${occurrenceId}/start-analysis`)
      .set("Authorization", h.bearer(citizen));
    expect(notAdmin.status).toBe(403);

    const start = await h.http().patch(`${API}/admin/occurrences/${occurrenceId}/start-analysis`)
      .set("Authorization", h.bearer(operational));
    expect(start.status, JSON.stringify(start.body)).toBe(200);

    const confirm = await h.http().post(`${API}/admin/occurrences/${occurrenceId}/confirm`)
      .set("Authorization", h.bearer(operational));
    expect(confirm.status, JSON.stringify(confirm.body)).toBe(200);

    const publicDetail = await h.http().get(`${API}/occurrences/public/${occurrenceId}`);
    expect(publicDetail.status, JSON.stringify(publicDetail.body)).toBe(200);
    expect(publicDetail.body.data.status).toBe("CONFIRMED");
    const exposed = JSON.stringify(publicDetail.body);
    expect(exposed).not.toContain(citizen.id);
    expect(exposed).not.toContain(storagePath);
    expect(exposed).not.toContain("ai_analysis_id");

    const publicPhoto = await h.http()
      .get(`${API}/occurrences/public/${occurrenceId}/photos/${photoId}`);
    expect(publicPhoto.status, JSON.stringify(publicPhoto.body)).toBe(200);
    const signedUrl: string = publicPhoto.body.data.url;
    expect(["127.0.0.1", "localhost", "[::1]"]).toContain(new URL(signedUrl).hostname);
    const downloaded = await fetch(signedUrl);
    expect(downloaded.status).toBe(200);
    expect((await downloaded.arrayBuffer()).byteLength).toBeGreaterThan(0);

    const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const direct = await client.storage.from("occurrence-photos").download(storagePath);
    expect(direct.error, "O objeto do bucket privado não deve ter leitura anônima").not.toBeNull();
    const directUpload = await client.storage.from("occurrence-photos").upload(
      `temporary/anonymous-${occurrenceId}/photo-1.png`, PNG,
      { contentType: "image/png" },
    );
    expect(directUpload.error, "Acesso anônimo ao bucket privado deve ser recusado").not.toBeNull();

    const ownVote = await h.http().post(`${API}/occurrences/${occurrenceId}/votes`)
      .set("Authorization", h.bearer(citizen));
    expect(ownVote.status).toBe(403);

    const voted = await h.http().post(`${API}/occurrences/${occurrenceId}/votes`)
      .set("Authorization", h.bearer(voter));
    expect(voted.status, JSON.stringify(voted.body)).toBe(201);
    const duplicate = await h.http().post(`${API}/occurrences/${occurrenceId}/votes`)
      .set("Authorization", h.bearer(voter));
    expect(duplicate.status).toBe(409);
    const count = await h.http().get(`${API}/occurrences/${occurrenceId}/votes`);
    expect(count.status).toBe(200);
    expect(count.body.data.vote_count).toBe(1);

    const removed = await h.http().delete(`${API}/occurrences/${occurrenceId}/votes/me`)
      .set("Authorization", h.bearer(voter));
    expect(removed.status).toBe(200);
    expect(removed.body.data.vote_count).toBe(0);

    const notifications = await h.http().get(`${API}/notifications`)
      .set("Authorization", h.bearer(citizen));
    expect(notifications.status).toBe(200);
    expect(JSON.stringify(notifications.body)).toContain(occurrenceId);
    const otherNotifications = await h.http().get(`${API}/notifications`)
      .set("Authorization", h.bearer(voter));
    expect(otherNotifications.status).toBe(200);
    expect(JSON.stringify(otherNotifications.body)).not.toContain(occurrenceId);
  });

  it("regressão QA-03: prioridade deve ser definida pela API, sem erro SQL", async () => {
    const { occurrenceId } = await h.createOccurrence(citizen);
    await h.http().patch(`${API}/admin/occurrences/${occurrenceId}/start-analysis`)
      .set("Authorization", h.bearer(operational)).expect(200);
    await h.http().post(`${API}/admin/occurrences/${occurrenceId}/confirm`)
      .set("Authorization", h.bearer(operational)).expect(200);

    const response = await h.http().patch(`${API}/admin/occurrences/${occurrenceId}/priority`)
      .set("Authorization", h.bearer(operational)).send({ priority: "HIGH" });
    // Deve detectar o SQLSTATE 42601 da migration vigente, sem ignorá-lo.
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    const stored = await h.admin.from("occurrences").select("priority").eq("id", occurrenceId).single();
    expect(stored.data?.priority).toBe("HIGH");
  });

  it("fluxo de atendimento/resolução e bloqueio de foto pública após RESOLVED", async () => {
    const { occurrenceId, photoId } = await h.createOccurrence(citizen);
    await h.http().patch(`${API}/admin/occurrences/${occurrenceId}/start-analysis`)
      .set("Authorization", h.bearer(operational)).expect(200);
    await h.http().post(`${API}/admin/occurrences/${occurrenceId}/confirm`)
      .set("Authorization", h.bearer(operational)).expect(200);

    // Fixture local para continuar verificando os demais endpoints enquanto
    // a RPC update_occurrence_priority está com bug. O teste anterior permanece vermelho.
    const seeded = await h.admin.from("occurrences")
      .update({ priority: "HIGH" }).eq("id", occurrenceId).select("id").single();
    expect(seeded.error).toBeNull();

    const service = await h.http().post(`${API}/admin/occurrences/${occurrenceId}/start-service`)
      .set("Authorization", h.bearer(operational))
      .send({ actionNotes: "Equipe executa reparo na via" });
    expect(service.status, JSON.stringify(service.body)).toBe(200);

    const resolved = await h.http().post(`${API}/admin/occurrences/${occurrenceId}/resolve`)
      .set("Authorization", h.bearer(operational)).send({ resolutionNotes: "Reparo concluído" });
    expect(resolved.status, JSON.stringify(resolved.body)).toBe(200);

    const hidden = await h.http().get(`${API}/occurrences/public/${occurrenceId}`);
    expect(hidden.status).toBe(404);
    const photo = await h.http().get(`${API}/occurrences/public/${occurrenceId}/photos/${photoId}`);
    expect(photo.status).toBe(403);
    const mine = await h.http().get(`${API}/occurrences/mine/${occurrenceId}`)
      .set("Authorization", h.bearer(citizen));
    expect(mine.status).toBe(200);
    expect(mine.body.data.status).toBe("RESOLVED");
  });

  it("rejeição exige motivo e não divulga ocorrência ao público", async () => {
    const { occurrenceId, photoId } = await h.createOccurrence(citizen);
    const premature = await h.http().post(`${API}/admin/occurrences/${occurrenceId}/reject`)
      .set("Authorization", h.bearer(operational)).send({ justification: "Não aplicável após vistoria" });
    expect(premature.status).toBe(409);
    await h.http().patch(`${API}/admin/occurrences/${occurrenceId}/start-analysis`)
      .set("Authorization", h.bearer(operational)).expect(200);

    const invalid = await h.http().post(`${API}/admin/occurrences/${occurrenceId}/reject`)
      .set("Authorization", h.bearer(operational)).send({ justification: "curta" });
    expect(invalid.status).toBe(400);
    const rejected = await h.http().post(`${API}/admin/occurrences/${occurrenceId}/reject`)
      .set("Authorization", h.bearer(operational))
      .send({ justification: "Ocorrência duplicada após verificação em campo" });
    expect(rejected.status, JSON.stringify(rejected.body)).toBe(200);
    const myDetail = await h.http().get(`${API}/occurrences/mine/${occurrenceId}`)
      .set("Authorization", h.bearer(citizen));
    expect(myDetail.status).toBe(200);
    expect(myDetail.body.data.status).toBe("REJECTED");
    await h.http().get(`${API}/occurrences/public/${occurrenceId}`).expect(404);
    await h.http().get(`${API}/occurrences/public/${occurrenceId}/photos/${photoId}`).expect(403);
  });

  it("admin operacional consulta dashboard; só Master gere contas/órgãos e encaminhamento simulado", async () => {
    const forbidden = await h.http().get(`${API}/admin/admins`)
      .set("Authorization", h.bearer(operational));
    expect(forbidden.status).toBe(403);
    const allowed = await h.http().get(`${API}/admin/admins`)
      .set("Authorization", h.bearer(master));
    expect(allowed.status, JSON.stringify(allowed.body)).toBe(200);
    const dashboard = await h.http().get(`${API}/admin/dashboard`)
      .set("Authorization", h.bearer(operational));
    expect(dashboard.status, JSON.stringify(dashboard.body)).toBe(200);

    const agency = await h.http().post(`${API}/admin/agencies`)
      .set("Authorization", h.bearer(master))
      .send({ name: "QA Departamento de Obras", email: "qa-obras@example.com" });
    expect(agency.status, JSON.stringify(agency.body)).toBe(201);
    const agencyId: string = agency.body.data.id;

    const { occurrenceId } = await h.createOccurrence(citizen);
    await h.http().patch(`${API}/admin/occurrences/${occurrenceId}/start-analysis`)
      .set("Authorization", h.bearer(operational)).expect(200);
    await h.http().post(`${API}/admin/occurrences/${occurrenceId}/confirm`)
      .set("Authorization", h.bearer(operational)).expect(200);

    const forwarded = await h.http().post(`${API}/admin/occurrences/${occurrenceId}/forwardings`)
      .set("Authorization", h.bearer(operational))
      .send({ agency_id: agencyId, observations: "Encaminhamento local de teste" });
    expect(forwarded.status, JSON.stringify(forwarded.body)).toBe(201);
    expect(forwarded.body.data.status).toBe("SENT");
    expect(forwarded.body.data.recipientEmail).toBe("qa-obras@example.com");
    const persisted = await h.admin.from("forwardings").select("status")
      .eq("id", forwarded.body.data.id).single();
    expect(persisted.data?.status).toBe("SENT");

    const citizenCannotForward = await h.http().post(`${API}/admin/occurrences/${occurrenceId}/forwardings`)
      .set("Authorization", h.bearer(citizen))
      .send({ agency_id: agencyId });
    expect(citizenCannotForward.status).toBe(403);
  });
});
