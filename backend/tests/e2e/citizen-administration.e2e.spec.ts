import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createQaUser, ensureLocalQa, qaPng, qaServiceClient,
  removeQaUsers, type QaUser,
} from "../helpers/qa-local.fixture.js";

const enabled = process.env.RUN_E2E === "1";
const root = "/api/v1";

/**
 * QA-03 / API1-65
 * API real (Express + auth JWT) -> Supabase local (Auth/Postgres/RPC/Storage).
 * O provider de IA e o de e-mail são MOCK (sem serviços externos pagos).
 * IMPORTANTE: falhas reais da main são reportadas, não simuladas como sucesso.
 */
describe.runIf(enabled).sequential("QA-03 — jornada completa real", () => {
  let app: Express;
  let service: SupabaseClient;
  let citizen: QaUser;
  let voter: QaUser;
  let master: QaUser;
  let operator: QaUser;
  const createdIds: string[] = [];
  const createdStorage: string[] = [];
  let analysisId = "";
  let occurrenceId = "";
  let categoryId = "";
  let agencyId = "";
  let photoId = "";

  const auth = (token: string) => ({Authorization: `Bearer ${token}`});

  async function uploadAnalyzeFinalize(user: QaUser, description: string): Promise<string> {
    const upload = await request(app).post(`${root}/ai-analyses`)
      .set(auth(user.token))
      .attach("photos", qaPng, {filename:"evidence.png",contentType:"image/png"});
    expect(upload.status, JSON.stringify(upload.body)).toBe(201);
    const id = upload.body.data?.id as string;
    expect(id).toMatch(/^[a-f\d-]{36}$/i);

    const analyze = await request(app).post(`${root}/ai-analyses/${id}/analyze`)
      .set(auth(user.token));
    expect(analyze.status, JSON.stringify(analyze.body)).toBe(202);

    let done = "";
    for (let attempt = 0; attempt < 70; attempt++) {
      const state = await request(app).get(`${root}/ai-analyses/${id}`)
        .set(auth(user.token));
      expect(state.status).toBe(200);
      done = state.body.data?.status ?? "";
      if (done === "COMPLETED" || done === "FAILED") break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    expect(done, "a análise mock precisa concluir com sucesso").toBe("COMPLETED");

    const record = await service.from("ai_analyses")
      .select("input_photo_paths,suggested_category_id").eq("id",id).single();
    expect(record.error).toBeNull();
    const photoPaths = record.data?.input_photo_paths as string[] | undefined;
    expect(photoPaths?.length).toBe(1);
    createdStorage.push(...(photoPaths ?? []));
    const category = record.data?.suggested_category_id as string;
    const finalized = await request(app).post(`${root}/occurrences/finalize`)
      .set(auth(user.token)).send({
        aiAnalysisId:id,
        categoryId:category,
        description,
        location:{lat:-12.2669,lng:-38.9776},
        categorySource:"AI_EDITED",
        descriptionSource:"AI_EDITED",
        photos:[{storagePath:photoPaths![0],mimeType:"image/png",sizeBytes:qaPng.length}],
      });
    expect(finalized.status, JSON.stringify(finalized.body)).toBe(201);
    const occurrence = finalized.body.data?.id as string;
    expect(occurrence).toMatch(/^[a-f\d-]{36}$/i);
    createdIds.push(occurrence);
    createdStorage.push(`occurrences/${occurrence}/photo-1.png`);
    return occurrence;
  }

  beforeAll(async () => {
    ensureLocalQa();
    service = qaServiceClient();
    // Import tardio: a CLI injeta credenciais locais antes de carregar env.ts.
    const { createApp } = await import("../../src/app.js");
    app = createApp();
    citizen = await createQaUser(service, "Cidadão E2E");
    voter = await createQaUser(service, "Eleitor E2E");
    master = await createQaUser(service, "Master E2E", "MASTER");
    operator = await createQaUser(service, "Operacional E2E", "OPERATIONAL");
  }, 60000);

  afterAll(async () => {
    if (!service) return;
    if (createdStorage.length) {
      await service.storage.from("occurrence-photos").remove([...new Set(createdStorage)]);
    }
    // Remover dependências da ocorrência antes de apagar contas;
    // todo o banco é exclusivo da stack local para QA.
    if (createdIds.length) {
      for (const table of ["notifications","votes","observations","forwardings",
        "occurrence_history","occurrence_photos"]) {
        await service.from(table).delete().in("occurrence_id",createdIds);
      }
      await service.from("occurrences").delete().in("id",createdIds);
    }
    if (analysisId) await service.from("ai_analyses").delete().eq("id",analysisId);
    await removeQaUsers(service,[citizen,voter,master,operator].filter(Boolean));
  }, 60000);

  it("cadastro/login, identidade pessoal e alteração limitada do perfil", async () => {
    const me = await request(app).get(`${root}/identity/me`).set(auth(citizen.token));
    expect(me.status).toBe(200);
    expect(me.body.data?.id).toBe(citizen.id);
    const updated = await request(app).patch(`${root}/identity/me`)
      .set(auth(citizen.token)).send({name:"Cidadão QA E2E"});
    expect(updated.status).toBe(200);
    const blocked = await request(app).patch(`${root}/identity/me`)
      .set(auth(citizen.token)).send({role:"ADMIN",admin_level:"MASTER"});
    expect(blocked.status).toBe(400);
    const anonymous = await request(app).get(`${root}/identity/me`);
    expect(anonymous.status).toBe(401);
  });

  it("upload real, análise mock, revisão humana e registro atômico", async () => {
    const categories = await request(app).get(`${root}/categories`);
    expect(categories.status).toBe(200);
    expect(categories.body.data?.length).toBeGreaterThanOrEqual(7);
    categoryId = categories.body.data[0].id;

    const upload = await request(app).post(`${root}/ai-analyses`)
      .set(auth(citizen.token))
      .attach("photos",qaPng,{filename:"evidence.png",contentType:"image/png"});
    expect(upload.status,JSON.stringify(upload.body)).toBe(201);
    analysisId = upload.body.data?.id;
    expect(analysisId).toMatch(/^[a-f\d-]{36}$/i);

    const unauthorized = await request(app).get(`${root}/ai-analyses/${analysisId}`)
      .set(auth(voter.token));
    expect(unauthorized.status).toBe(404);

    const processing = await request(app).post(`${root}/ai-analyses/${analysisId}/analyze`)
      .set(auth(citizen.token));
    expect(processing.status,JSON.stringify(processing.body)).toBe(202);

    let status = "";
    for (let i=0;i<70;i++) {
      const result = await request(app).get(`${root}/ai-analyses/${analysisId}`)
        .set(auth(citizen.token));
      status = result.body.data?.status ?? "";
      if (status==="COMPLETED" || status==="FAILED") break;
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    expect(status).toBe("COMPLETED");

    const draft = await service.from("ai_analyses")
      .select("input_photo_paths,suggested_category_id").eq("id",analysisId).single();
    expect(draft.error).toBeNull();
    const paths = draft.data?.input_photo_paths as string[];
    createdStorage.push(...paths);
    expect(paths).toHaveLength(1);
    const registration = await request(app).post(`${root}/occurrences/finalize`)
      .set(auth(citizen.token)).send({
        aiAnalysisId:analysisId,
        categoryId:draft.data?.suggested_category_id ?? categoryId,
        description:"Buraco na rua identificado por cidadão",
        location:{lat:-12.2669,lng:-38.9776},
        categorySource:"AI_EDITED",
        descriptionSource:"AI_EDITED",
        photos:[{storagePath:paths[0],mimeType:"image/png",sizeBytes:qaPng.length}],
      });
    expect(registration.status,JSON.stringify(registration.body)).toBe(201);
    occurrenceId=registration.body.data?.id;
    createdIds.push(occurrenceId);
    createdStorage.push(`occurrences/${occurrenceId}/photo-1.png`);
    const row = await service.from("occurrences")
      .select("status,priority").eq("id",occurrenceId).single();
    expect(row.data).toMatchObject({status:"RECEIVED",priority:null});
    const photo = await service.from("occurrence_photos")
      .select("id").eq("occurrence_id",occurrenceId).single();
    photoId=photo.data?.id ?? "";
    expect(photoId).not.toBe("");
  }, 30000);

  it("visibilidade: registro privado para público e terceiros, mas visível ao autor", async () => {
    const mine = await request(app).get(`${root}/occurrences/mine/${occurrenceId}`)
      .set(auth(citizen.token));
    expect(mine.status,JSON.stringify(mine.body)).toBe(200);
    const third = await request(app).get(`${root}/occurrences/mine/${occurrenceId}`)
      .set(auth(voter.token));
    expect(third.status).toBe(404);
    const publicDetail = await request(app).get(`${root}/occurrences/public/${occurrenceId}`);
    expect(publicDetail.status).toBe(404);
    const publicPhoto = await request(app).get(`${root}/occurrences/public/${occurrenceId}/photos/${photoId}`);
    expect([403,404]).toContain(publicPhoto.status);
  });

  it("administrador analisa e confirma; foto pública vira URL assinada", async () => {
    const citizenCannotModerate = await request(app)
      .patch(`${root}/admin/occurrences/${occurrenceId}/start-analysis`)
      .set(auth(citizen.token));
    expect(citizenCannotModerate.status).toBe(403);
    const analysis = await request(app).patch(`${root}/admin/occurrences/${occurrenceId}/start-analysis`)
      .set(auth(operator.token));
    expect([200,204]).toContain(analysis.status);
    const confirmation = await request(app).post(`${root}/admin/occurrences/${occurrenceId}/confirm`)
      .set(auth(operator.token));
    expect([200,204]).toContain(confirmation.status);
    const detail = await request(app).get(`${root}/occurrences/public/${occurrenceId}`);
    expect(detail.status,JSON.stringify(detail.body)).toBe(200);
    expect(JSON.stringify(detail.body)).not.toContain("storagePath");
    expect(detail.body.data?.photoUrls?.[0]?.url).toBeTruthy();
    const publicPhoto = await request(app).get(`${root}/occurrences/public/${occurrenceId}/photos/${photoId}`);
    expect(publicPhoto.status).toBe(200);
  });

  it("voto de outro cidadão, bloqueio de auto-voto/duplicidade e retirada", async () => {
    const self = await request(app).post(`${root}/occurrences/${occurrenceId}/votes`)
      .set(auth(citizen.token));
    expect([400,403,409]).toContain(self.status);
    const first = await request(app).post(`${root}/occurrences/${occurrenceId}/votes`)
      .set(auth(voter.token));
    expect(first.status).toBe(201);
    const duplicate = await request(app).post(`${root}/occurrences/${occurrenceId}/votes`)
      .set(auth(voter.token));
    expect([400,409]).toContain(duplicate.status);
    const removed = await request(app).delete(`${root}/occurrences/${occurrenceId}/votes/me`)
      .set(auth(voter.token));
    expect(removed.status).toBe(200);
  });

  it("observações, notificações persistentes e histórico segregado", async () => {
    const secret = await request(app).post(`${root}/admin/occurrences/${occurrenceId}/observations`)
      .set(auth(operator.token)).send({content:"Observação exclusiva dos administradores",visibility:"INTERNAL"});
    expect([200,201]).toContain(secret.status);
    const reply = await request(app).post(`${root}/admin/occurrences/${occurrenceId}/observations`)
      .set(auth(operator.token)).send({content:"Vistoria programada para esta semana",visibility:"CITIZEN_RESPONSE"});
    expect([200,201]).toContain(reply.status);
    const mine = await request(app).get(`${root}/occurrences/mine/${occurrenceId}`)
      .set(auth(citizen.token));
    expect(mine.status).toBe(200);
    expect(JSON.stringify(mine.body)).not.toContain("Observação exclusiva dos administradores");
    const notifs = await request(app).get(`${root}/notifications`)
      .set(auth(citizen.token));
    expect(notifs.status).toBe(200);
    const wrong = await request(app).get(`${root}/notifications`).set(auth(voter.token));
    expect(wrong.status).toBe(200);
    expect(JSON.stringify(wrong.body)).not.toContain("Vistoria programada para esta semana");
  });

  it("Master administra órgãos; operacional vê órgãos, mas não os gerencia", async () => {
    const forbidden = await request(app).post(`${root}/admin/agencies`)
      .set(auth(operator.token)).send({name:"Órgão QA",email:"qa-agency@example.com"});
    expect(forbidden.status).toBe(403);
    const created = await request(app).post(`${root}/admin/agencies`)
      .set(auth(master.token)).send({name:"Órgão QA Obras",email:"qa-agency@example.com"});
    expect(created.status,JSON.stringify(created.body)).toBe(201);
    agencyId = created.body.data?.id;
    expect(agencyId).toMatch(/^[a-f\d-]{36}$/i);
    const listed = await request(app).get(`${root}/admin/agencies`)
      .set(auth(operator.token));
    expect(listed.status).toBe(200);
  });

  it("encaminhamento CONFIRMED com e-mail mock gera SENT + histórico", async () => {
    const forwarded = await request(app).post(`${root}/admin/occurrences/${occurrenceId}/forwardings`)
      .set(auth(operator.token))
      .send({agency_id:agencyId,observations:"Por favor realizar inspeção"});
    expect(forwarded.status,JSON.stringify(forwarded.body)).toBe(201);
    expect(forwarded.body.data?.status).toBe("SENT");
    const list = await request(app).get(`${root}/admin/occurrences/${occurrenceId}/forwardings`)
      .set(auth(operator.token));
    expect(list.status).toBe(200);
    expect(list.body.data?.length).toBeGreaterThan(0);
  });

  it("prioridade, atendimento e resolução preservam estados/histórico", async () => {
    const priority = await request(app).patch(`${root}/admin/occurrences/${occurrenceId}/priority`)
      .set(auth(operator.token)).send({priority:"HIGH"});
    expect(priority.status,JSON.stringify(priority.body)).toBe(200);
    const service = await request(app).post(`${root}/admin/occurrences/${occurrenceId}/start-service`)
      .set(auth(operator.token)).send({actionNotes:"Equipe acionada para reparo emergencial"});
    expect([200,204]).toContain(service.status);
    const resolved = await request(app).post(`${root}/admin/occurrences/${occurrenceId}/resolve`)
      .set(auth(operator.token)).send({resolutionNotes:"Trecho reparado"});
    expect([200,204]).toContain(resolved.status);
    const detail = await request(app).get(`${root}/occurrences/public/${occurrenceId}`);
    expect(detail.status).toBe(404);
    const status = await request(app).get(`${root}/occurrences/mine/${occurrenceId}`)
      .set(auth(citizen.token));
    expect(status.body.data?.status).toBe("RESOLVED");
  });

  it("caminho alternativo: rejeição com justificativa mantém ocorrência privada", async () => {
    const rejectedId = await uploadAnalyzeFinalize(citizen, "Ocorrência rejeitada E2E");
    await request(app).patch(`${root}/admin/occurrences/${rejectedId}/start-analysis`)
      .set(auth(operator.token)).expect(200);
    const rejected = await request(app).post(`${root}/admin/occurrences/${rejectedId}/reject`)
      .set(auth(operator.token)).send({justification:"Foto duplicada em outro registro"});
    expect([200,204]).toContain(rejected.status);
    const pub = await request(app).get(`${root}/occurrences/public/${rejectedId}`);
    expect(pub.status).toBe(404);
  }, 30000);

  it("dashboard e gestão MASTER versus OPERATIONAL", async () => {
    const dashboard = await request(app).get(`${root}/admin/dashboard`)
      .set(auth(operator.token));
    expect(dashboard.status).toBe(200);
    const blocked = await request(app).get(`${root}/admin/admins`)
      .set(auth(operator.token));
    expect(blocked.status).toBe(403);
    const masterList = await request(app).get(`${root}/admin/admins`)
      .set(auth(master.token));
    expect(masterList.status).toBe(200);
  });
});
