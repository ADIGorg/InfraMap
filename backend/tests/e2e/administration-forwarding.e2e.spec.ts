import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { API, LocalQaStack, qaEnabled } from "../support/qa-local-supabase.js";
import type { QaUser } from "../support/qa-local-supabase.js";

describe.skipIf(!qaEnabled)("QA-03 / encaminhamento, dashboard e gestão MASTER", () => {
  let qa: LocalQaStack;
  let citizen: QaUser;
  let master: QaUser;
  let operator: QaUser;
  let occurrenceId: string;
  let agencyId: string;

  beforeAll(async () => {
    qa = LocalQaStack.connect();
    citizen = await qa.user();
    master = await qa.user("MASTER");
    operator = await qa.user("OPERATIONAL");
    occurrenceId = (await qa.createOccurrence(citizen)).occurrenceId;
    const path = API + "/admin/occurrences/" + occurrenceId;
    const started = await request(qa.app).patch(path + "/start-analysis")
      .set(qa.as(operator));
    if (started.status !== 200) throw new Error("Início de análise: " + JSON.stringify(started.body));
    const confirmed = await request(qa.app).post(path + "/confirm").set(qa.as(operator));
    if (confirmed.status !== 200) throw new Error("Confirmação: " + JSON.stringify(confirmed.body));
  }, 120_000);

  afterAll(async () => { await qa?.cleanup(); }, 30_000);

  it("apenas MASTER cria órgãos e administradores", async () => {
    const payload = {
      name: "Secretaria Municipal QA", email: "orgao-" + randomUUID() + "@example.com",
      description: "Órgão exclusivo da base de testes",
    };
    const denied = await request(qa.app).post(API + "/admin/agencies")
      .set(qa.as(operator)).send(payload);
    expect(denied.status).toBe(403);
    const agency = await request(qa.app).post(API + "/admin/agencies")
      .set(qa.as(master)).send(payload);
    expect(agency.status, JSON.stringify(agency.body)).toBe(201);
    agencyId = agency.body.data.id;

    const account = await request(qa.app).post(API + "/admin/admins")
      .set(qa.as(master)).send({
        name: "Admin QA Operacional", email: "qa-admin-" + randomUUID() + "@example.com",
        password: "QA-Admin!2026", admin_level: "OPERATIONAL",
      });
    expect(account.status, JSON.stringify(account.body)).toBe(201);
    const newAdminId: string = account.body.data.id;
    qa.createdUsers.push(newAdminId);
    const demoted = await request(qa.app).patch(API + "/admin/admins/" + newAdminId)
      .set(qa.as(master)).send({ is_active: false });
    expect(demoted.status, JSON.stringify(demoted.body)).toBe(200);
    const operatorDenied = await request(qa.app).patch(API + "/admin/admins/" + newAdminId)
      .set(qa.as(operator)).send({ is_active: true });
    expect(operatorDenied.status).toBe(403);
  });

  it("encaminha apenas ocorrência CONFIRMED para órgão ativo, com provider mock", async () => {
    if (!agencyId) throw new Error("Pré-condição: órgão de teste não foi criado.");
    const path = API + "/admin/occurrences/" + occurrenceId + "/forwardings";
    const denied = await request(qa.app).post(path).set(qa.as(citizen))
      .send({ agency_id: agencyId });
    expect(denied.status).toBe(403);

    const forwarded = await request(qa.app).post(path).set(qa.as(operator))
      .send({ agency_id: agencyId, observations: "Verificar com prioridade" });
    expect(forwarded.status, JSON.stringify(forwarded.body)).toBe(201);
    expect(forwarded.body.data.status).toBe("SENT");
    expect(forwarded.body.data.recipientEmail).toContain("@example.com");

    const list = await request(qa.app).get(path).set(qa.as(operator));
    expect(list.status, JSON.stringify(list.body)).toBe(200);
    expect(list.body.data.some((row: { id: string }) =>
      row.id === forwarded.body.data.id)).toBe(true);

    const current = await qa.admin.from("occurrences").select("status")
      .eq("id", occurrenceId).single();
    expect(current.data?.status).toBe("CONFIRMED");
    const history = await qa.admin.from("occurrence_history")
      .select("action").eq("occurrence_id", occurrenceId)
      .in("action", ["FORWARDED_TO_AGENCY", "FORWARDING_SENT"]);
    expect(history.error).toBeNull();
    expect(history.data?.map((x) => x.action).sort())
      .toEqual(["FORWARDED_TO_AGENCY", "FORWARDING_SENT"]);
  });
});
