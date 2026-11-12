import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createQaUser, ensureLocalQa, qaAnonClient, qaPng, qaServiceClient,
  removeQaUsers, type QaUser,
} from "../../helpers/qa-local.fixture.js";

const enabled = process.env.RUN_SUPABASE_INTEGRATION === "1";
const bucket = "occurrence-photos";

describe.runIf(enabled)("QA-02 / API1-64 — integração Auth, RLS, RPC e Storage REAL", () => {
  let admin: SupabaseClient;
  let citizenA: QaUser;
  let citizenB: QaUser;
  let master: QaUser;
  let operational: QaUser;
  let objectPath = "";
  let notificationId = "";
  let publicSignupId = "";

  beforeAll(async () => {
    ensureLocalQa();
    admin = qaServiceClient();
    citizenA = await createQaUser(admin, "Cidadão A");
    citizenB = await createQaUser(admin, "Cidadão B");
    master = await createQaUser(admin, "Master de QA", "MASTER");
    operational = await createQaUser(admin, "Operacional de QA", "OPERATIONAL");
  }, 30000);

  afterAll(async () => {
    if (!admin) return;
    if (objectPath) await admin.storage.from(bucket).remove([objectPath]);
    if (notificationId) await admin.from("notifications").delete().eq("id", notificationId);
    if (publicSignupId) await admin.auth.admin.deleteUser(publicSignupId);
    await removeQaUsers(admin, [citizenA, citizenB, master, operational].filter(Boolean));
  }, 30000);

  it("cadastro PÚBLICO Auth cria um cidadão ativo, nunca ADMIN", async () => {
    const email = `qa-public-${randomUUID()}@example.com`;
    const password = `QaPublic!${randomUUID()}`;
    const signup = await qaAnonClient().auth.signUp({
      email, password, options: {data: {name: "Cadastro público QA", role: "ADMIN"}},
    });
    expect(signup.error).toBeNull();
    expect(signup.data.user?.id).toBeTruthy();
    publicSignupId = signup.data.user!.id;
    const created = await admin.from("user_roles")
      .select("role,admin_level,is_active").eq("user_id",publicSignupId).single();
    expect(created.data).toMatchObject({
      role:"CITIZEN", admin_level:null, is_active:true,
    });
    const profile = await admin.from("profiles")
      .select("name").eq("id",publicSignupId).single();
    expect(profile.data?.name).toBe("Cadastro público QA");
  });

  it("gatilho Auth provisiona perfil e papel CITIZEN ativo", async () => {
    const profile = await citizenA.client.from("profiles")
      .select("id,name").eq("id", citizenA.id).single();
    const role = await citizenA.client.from("user_roles")
      .select("role,admin_level,is_active").eq("user_id", citizenA.id).single();
    expect(profile.error).toBeNull();
    expect(profile.data).toMatchObject({id:citizenA.id,name:"Cidadão A"});
    expect(role.data).toMatchObject({role:"CITIZEN",admin_level:null,is_active:true});
  });

  it("RLS: cidadão não vê perfil ou papel de outra pessoa", async () => {
    const otherProfile = await citizenA.client.from("profiles")
      .select("id").eq("id", citizenB.id);
    const otherRole = await citizenA.client.from("user_roles")
      .select("user_id").eq("user_id", citizenB.id);
    expect(otherProfile.error).toBeNull();
    expect(otherRole.error).toBeNull();
    expect(otherProfile.data).toEqual([]);
    expect(otherRole.data).toEqual([]);
  });

  it("RLS/ACL: cidadão não pode se promover a ADMIN", async () => {
    const attempted = await citizenA.client.from("user_roles")
      .update({role:"ADMIN",admin_level:"MASTER"}).eq("user_id",citizenA.id);
    expect(attempted.error).not.toBeNull();
    const verified = await admin.from("user_roles").select("role").eq("user_id",citizenA.id).single();
    expect(verified.data?.role).toBe("CITIZEN");
  });

  it("MASTER consulta administradores; OPERATIONAL não", async () => {
    const allowed = await master.client.rpc("list_administrators");
    const forbidden = await operational.client.rpc("list_administrators");
    expect(allowed.error).toBeNull();
    expect(Array.isArray(allowed.data)).toBe(true);
    expect(forbidden.error).not.toBeNull();
  });

  it("somente o cidadão destinatário lê sua notificação", async () => {
    const created = await admin.from("notifications").insert({
      user_id:citizenA.id,title:"Teste privado de QA",
      message:"Apenas o destinatário lê",type:"OCCURRENCE_STATUS_CHANGED",
    }).select("id").single();
    expect(created.error).toBeNull();
    notificationId = created.data!.id;
    const own = await citizenA.client.from("notifications")
      .select("id").eq("id", notificationId);
    const other = await citizenB.client.from("notifications")
      .select("id").eq("id", notificationId);
    expect(own.error).toBeNull();
    expect(own.data?.length).toBe(1);
    expect(other.error).toBeNull();
    expect(other.data).toEqual([]);
  });

  it("Storage privado: usuário alheio e anon não baixam fotografia", async () => {
    objectPath = `temporary/${citizenA.id}/qa-${Date.now()}/photo-1.png`;
    const uploaded = await admin.storage.from(bucket).upload(objectPath, qaPng, {
      contentType:"image/png", upsert:false,
    });
    expect(uploaded.error).toBeNull();
    const anon = await qaAnonClient().storage.from(bucket).download(objectPath);
    const other = await citizenB.client.storage.from(bucket).download(objectPath);
    expect(anon.error).not.toBeNull();
    expect(other.error).not.toBeNull();
  });

  it("Storage: usuário não gera signed URL de foto alheia; backend pode", async () => {
    const blocked = await citizenB.client.storage.from(bucket).createSignedUrl(objectPath, 60);
    const allowed = await admin.storage.from(bucket).createSignedUrl(objectPath, 60);
    expect(blocked.error).not.toBeNull();
    expect(allowed.error).toBeNull();
    expect(allowed.data?.signedUrl).toContain("token=");
  });

  it("RPC com SECURITY DEFINER rejeita cidadão em ação de administrador", async () => {
    const attempt = await citizenA.client.rpc("create_forwarding", {
      p_occurrence_id:"10000000-0000-4000-8000-000000000001",
      p_agency_id:"10000000-0000-4000-8000-000000000002",
      p_subject:"Tentativa não autorizada",
      p_observations:null,
    });
    expect(attempt.error).not.toBeNull();
    expect(attempt.error?.code).toBe("42501");
  });

  it("credencial inválida não dá acesso ao Auth", async () => {
    const fake = qaAnonClient();
    const result = await fake.auth.signInWithPassword({email:citizenA.email,password:"senha-incorreta"});
    expect(result.error).not.toBeNull();
  });
});
