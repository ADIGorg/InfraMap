import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { API, LocalQaStack, qaEnabled } from "../support/qa-local-supabase.js";
import type { QaUser } from "../support/qa-local-supabase.js";

describe.skipIf(!qaEnabled)("QA-03 / fluxo cidadão → IA mock → cadastro → moderação", () => {
  let qa: LocalQaStack;
  let owner: QaUser;
  let voter: QaUser;
  let master: QaUser;
  let operator: QaUser;
  let occurrenceId = "";
  let photoId = "";

  beforeAll(async () => {
    qa = LocalQaStack.connect();
    owner = await qa.user(null, true);
    voter = await qa.user();
    master = await qa.user("MASTER");
    operator = await qa.user("OPERATIONAL");
    const occurrence = await qa.createOccurrence(owner);
    occurrenceId = occurrence.occurrenceId;
    const { data, error } = await qa.admin.from("occurrence_photos")
      .select("id").eq("occurrence_id", occurrenceId).single();
    if (error || !data) throw new Error("Foto final não encontrada: " + error?.message);
    photoId = data.id;
  }, 120_000);

  afterAll(async () => { await qa?.cleanup(); }, 30_000);

  it("cadastro/login cria cidadão e permite consultar/editar somente o próprio perfil", async () => {
    const me = await request(qa.app).get(API + "/identity/me").set(qa.as(owner));
    expect(me.status, JSON.stringify(me.body)).toBe(200);
    expect(me.body.data.email).toBe(owner.email);
    const updated = await request(qa.app).patch(API + "/identity/me")
      .set(qa.as(owner)).send({ name: "Cidadão QA Editado", phone: "75988887777" });
    expect(updated.status, JSON.stringify(updated.body)).toBe(200);
    const other = await request(qa.app).get(API + "/identity/me").set(qa.as(voter));
    expect(other.status).toBe(200);
    expect(other.body.data.email).toBe(voter.email);
    expect(JSON.stringify(other.body)).not.toContain("Cidadão QA Editado");
  });

  it("análise consumida cria RECEIVED e não permite nova finalização", async () => {
    const { data: occurrence, error } = await qa.admin.from("occurrences")
      .select("status,priority,ai_analysis_id").eq("id", occurrenceId).single();
    expect(error).toBeNull();
    expect(occurrence?.status).toBe("RECEIVED");
    expect(occurrence?.priority).toBeNull();

    const repeated = await request(qa.app).post(API + "/occurrences/finalize")
      .set(qa.as(owner)).send({
        aiAnalysisId: occurrence?.ai_analysis_id,
        categoryId: await qa.category(),
        description: "Tentativa de duplicar",
        location: { lat: -12.26, lng: -38.97 },
        categorySource: "AI_EDITED",
        descriptionSource: "AI_EDITED",
        photos: [{
          storagePath: "temporary/duplicate/photo-1.png",
          mimeType: "image/png", sizeBytes: 100,
        }],
      });
    expect(repeated.status).toBeGreaterThanOrEqual(400);
    expect((await qa.admin.from("occurrences").select("id")
      .eq("ai_analysis_id", occurrence?.ai_analysis_id)).data).toHaveLength(1);
  });

  it("RECEIVED é privado; só o autor acessa a sua ocorrência", async () => {
    const pub = await request(qa.app).get(API + "/occurrences/public/" + occurrenceId);
    expect(pub.status).toBe(404);
    const wrong = await request(qa.app).get(API + "/occurrences/mine/" + occurrenceId)
      .set(qa.as(voter));
    expect([403, 404]).toContain(wrong.status);
    const mine = await request(qa.app).get(API + "/occurrences/mine/" + occurrenceId)
      .set(qa.as(owner));
    expect(mine.status, JSON.stringify(mine.body)).toBe(200);
    expect(mine.body.data.id).toBe(occurrenceId);
    const publicPhoto = await request(qa.app)
      .get(API + "/occurrences/public/" + occurrenceId + "/photos/" + photoId);
    expect(publicPhoto.status).toBe(403);
  });

  it("cidadão não modera; admin operacional inicia e confirma a ocorrência", async () => {
    const denied = await request(qa.app).patch(API + "/admin/occurrences/" + occurrenceId + "/start-analysis")
      .set(qa.as(owner));
    expect(denied.status).toBe(403);

    const started = await request(qa.app).patch(API + "/admin/occurrences/" + occurrenceId + "/start-analysis")
      .set(qa.as(operator));
    expect(started.status, JSON.stringify(started.body)).toBe(200);
    const confirmed = await request(qa.app).post(API + "/admin/occurrences/" + occurrenceId + "/confirm")
      .set(qa.as(operator));
    expect(confirmed.status, JSON.stringify(confirmed.body)).toBe(200);
    const invalid = await request(qa.app).post(API + "/admin/occurrences/" + occurrenceId + "/confirm")
      .set(qa.as(operator));
    expect(invalid.status).toBe(409);
  });

  it("público vê ocorrência confirmada com localização aproximada e URL temporária", async () => {
    const pub = await request(qa.app).get(API + "/occurrences/public/" + occurrenceId);
    expect(pub.status, JSON.stringify(pub.body)).toBe(200);
    expect(pub.body.data.status).toBe("CONFIRMED");
    expect(Array.isArray(pub.body.data.photoUrls)).toBe(true);
    expect(pub.body.data.photoUrls).toHaveLength(1);
    expect(pub.body.data.photoUrls[0].url).toContain("token=");
    for (const forbidden of ["authorId", "author_id", "locationOriginal", "location_original", "storagePath", "storage_path", "ai_analysis_id"]) {
      expect(Object.keys(pub.body.data)).not.toContain(forbidden);
    }
    const publicPhoto = await request(qa.app)
      .get(API + "/occurrences/public/" + occurrenceId + "/photos/" + photoId);
    expect(publicPhoto.status, JSON.stringify(publicPhoto.body)).toBe(200);
    expect(publicPhoto.body.data.url).toContain("token=");
  });

  it("voto de terceiro é único e removível; autor não pode votar", async () => {
    const mine = await request(qa.app).post(API + "/occurrences/" + occurrenceId + "/votes")
      .set(qa.as(owner));
    expect(mine.status).toBe(403);
    const yes = await request(qa.app).post(API + "/occurrences/" + occurrenceId + "/votes")
      .set(qa.as(voter));
    expect(yes.status, JSON.stringify(yes.body)).toBe(201);
    const duplicate = await request(qa.app).post(API + "/occurrences/" + occurrenceId + "/votes")
      .set(qa.as(voter));
    expect(duplicate.status).toBe(409);
    const count = await request(qa.app).get(API + "/occurrences/" + occurrenceId + "/votes");
    expect(count.status).toBe(200);
    expect(count.body.data.vote_count).toBe(1);
    const removed = await request(qa.app).delete(API + "/occurrences/" + occurrenceId + "/votes/me")
      .set(qa.as(voter));
    expect(removed.status).toBe(200);
  });

  it("admin registra observação interna e resposta; cidadão recebe notificação", async () => {
    for (const visibility of ["INTERNAL", "CITIZEN_RESPONSE"]) {
      const response = await request(qa.app)
        .post(API + "/admin/occurrences/" + occurrenceId + "/observations")
        .set(qa.as(operator)).send({
          content: "Atualização do trabalho QA", visibility,
        });
      expect(response.status, JSON.stringify(response.body)).toBe(201);
    }
    const detail = await request(qa.app).get(API + "/occurrences/mine/" + occurrenceId)
      .set(qa.as(owner));
    expect(detail.status).toBe(200);
    const json = JSON.stringify(detail.body);
    expect(json).not.toContain("OBSERVATION_INTERNAL_ADDED");
    const notifications = await request(qa.app).get(API + "/notifications")
      .set(qa.as(owner));
    expect(notifications.status, JSON.stringify(notifications.body)).toBe(200);
    expect(notifications.body.data.some(
      (n: { type: string }) => n.type === "CITIZEN_RESPONSE",
    )).toBe(true);
    const otherNotifications = await request(qa.app).get(API + "/notifications")
      .set(qa.as(voter));
    expect(JSON.stringify(otherNotifications.body)).not.toContain("Atualização do trabalho QA");
  });

  it("admin define prioridade, inicia atendimento e conclui; RESOLVED é terminal", async () => {
    const priority = await request(qa.app)
      .patch(API + "/admin/occurrences/" + occurrenceId + "/priority")
      .set(qa.as(operator)).send({ priority: "HIGH" });
    expect(priority.status, JSON.stringify(priority.body)).toBe(200);
    const service = await request(qa.app)
      .post(API + "/admin/occurrences/" + occurrenceId + "/start-service")
      .set(qa.as(operator)).send({ actionNotes: "Equipe iniciou reparação do esgoto" });
    expect(service.status, JSON.stringify(service.body)).toBe(200);
    const resolved = await request(qa.app)
      .post(API + "/admin/occurrences/" + occurrenceId + "/resolve")
      .set(qa.as(operator)).send({ resolutionNotes: "Reparação concluída" });
    expect(resolved.status, JSON.stringify(resolved.body)).toBe(200);
    const repeated = await request(qa.app)
      .post(API + "/admin/occurrences/" + occurrenceId + "/resolve")
      .set(qa.as(operator)).send({});
    expect(repeated.status).toBe(409);
    const pub = await request(qa.app).get(API + "/occurrences/public/" + occurrenceId);
    expect(pub.status).toBe(404);
  });

  it("caminho alternativo: admin rejeita com justificativa e não permite reabrir terminal", async () => {
    const rejected = await qa.createOccurrence(owner);
    const path = API + "/admin/occurrences/" + rejected.occurrenceId;
    expect((await request(qa.app).patch(path + "/start-analysis")
      .set(qa.as(operator))).status).toBe(200);
    const short = await request(qa.app).post(path + "/reject")
      .set(qa.as(operator)).send({ justification: "curta" });
    expect(short.status).toBe(400);
    const rejectedResponse = await request(qa.app).post(path + "/reject")
      .set(qa.as(operator)).send({ justification: "Fotografia não corresponde ao local." });
    expect(rejectedResponse.status, JSON.stringify(rejectedResponse.body)).toBe(200);
    const repeated = await request(qa.app).patch(path + "/start-analysis")
      .set(qa.as(operator));
    expect(repeated.status).toBe(409);
    expect((await request(qa.app).get(API + "/occurrences/public/" + rejected.occurrenceId)).status).toBe(404);
  });

  it("Master tem acesso a gestão; operacional é bloqueado", async () => {
    const masterList = await request(qa.app).get(API + "/admin/admins").set(qa.as(master));
    expect(masterList.status, JSON.stringify(masterList.body)).toBe(200);
    const operatorList = await request(qa.app).get(API + "/admin/admins").set(qa.as(operator));
    expect(operatorList.status).toBe(403);
    const dashboard = await request(qa.app).get(API + "/admin/dashboard").set(qa.as(operator));
    expect(dashboard.status, JSON.stringify(dashboard.body)).toBe(200);
  });
});
