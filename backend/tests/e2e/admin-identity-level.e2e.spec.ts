import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { API, LocalQaStack, qaEnabled, type QaUser } from "../support/qa-local-supabase.js";

// Executado exclusivamente com Supabase LOCAL; LocalQaStack bloqueia URLs remotas.
describe.skipIf(!qaEnabled)("API1-100 /admin/me admin_level confiável com Auth e RLS reais", () => {
  let qa: LocalQaStack;
  let master: QaUser;
  let operational: QaUser;
  let citizen: QaUser;
  let inactiveAdmin: QaUser;

  beforeAll(async () => {
    qa = LocalQaStack.connect();
    master = await qa.user("MASTER");
    operational = await qa.user("OPERATIONAL");
    citizen = await qa.user();
    inactiveAdmin = await qa.user("OPERATIONAL");
    const { error } = await qa.admin.from("user_roles")
      .update({ is_active: false }).eq("user_id", inactiveAdmin.id);
    if (error) throw new Error("Falha fixture ADMIN inativo: " + error.message);
  }, 120_000);

  afterAll(async () => { await qa?.cleanup(); }, 30_000);

  it("retorna MASTER do user_roles e não claims fornecidas pelo cliente", async () => {
    const res = await request(qa.app).get(API + "/admin/me")
      .set(qa.as(master))
      .set("x-admin-level", "OPERATIONAL");
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body).toEqual({
      id: master.id, role: "ADMIN", is_active: true, admin_level: "MASTER",
    });
  });

  it("retorna OPERATIONAL e não eleva privilégios por cabeçalho", async () => {
    const res = await request(qa.app).get(API + "/admin/me")
      .set(qa.as(operational))
      .set("x-admin-level", "MASTER");
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body).toEqual({
      id: operational.id, role: "ADMIN", is_active: true, admin_level: "OPERATIONAL",
    });
  });

  it("mantém contrato /app/me sem campo admin_level e bloqueia cidadão no admin", async () => {
    const own = await request(qa.app).get(API + "/app/me").set(qa.as(citizen));
    expect(own.status, JSON.stringify(own.body)).toBe(200);
    expect(own.body).toEqual({
      id: citizen.id, role: "CITIZEN", is_active: true,
    });
    const denied = await request(qa.app).get(API + "/admin/me").set(qa.as(citizen));
    expect(denied.status).toBe(403);
    expect(denied.body).not.toHaveProperty("admin_level");
  });

  it("bloqueia administrador desativado mesmo com token ainda válido", async () => {
    const res = await request(qa.app).get(API + "/admin/me").set(qa.as(inactiveAdmin));
    expect(res.status).toBe(403);
    expect(res.body).not.toHaveProperty("admin_level");
  });

  it("bloqueia requisição sem token autenticado", async () => {
    const res = await request(qa.app).get(API + "/admin/me");
    expect(res.status).toBe(401);
  });

  it("RLS impede que o cidadão leia papel administrativo de terceiro", async () => {
    const { data, error } = await citizen.client.from("user_roles")
      .select("user_id,admin_level").eq("user_id", master.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
