import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { LocalQaStack, PNG, qaEnabled } from "../../support/qa-local-supabase.js";
import type { QaUser } from "../../support/qa-local-supabase.js";
import { STORAGE_BUCKET_NAME } from "../../../src/config/constants.js";

describe.skipIf(!qaEnabled)("QA-02 / Storage real, Auth e RLS (Supabase LOCAL)", () => {
  let qa: LocalQaStack;
  let owner: QaUser;
  let stranger: QaUser;
  let master: QaUser;
  let operational: QaUser;

  beforeAll(async () => {
    qa = LocalQaStack.connect();
    owner = await qa.user();
    stranger = await qa.user();
    master = await qa.user("MASTER");
    operational = await qa.user("OPERATIONAL");
  }, 90_000);

  afterAll(async () => {
    await qa?.cleanup();
  }, 30_000);

  it("RLS isola perfis e papéis de usuários diferentes", async () => {
    const own = await owner.client.from("profiles").select("id");
    const roles = await owner.client.from("user_roles").select("user_id,role,admin_level");
    expect(own.error).toBeNull();
    expect(own.data?.map((p) => p.id)).toEqual([owner.id]);
    expect(roles.error).toBeNull();
    expect(roles.data?.map((r) => r.user_id)).toEqual([owner.id]);
    expect(roles.data?.[0]?.role).toBe("CITIZEN");

    const unauthorized = await owner.client.from("user_roles")
      .update({ role: "ADMIN", admin_level: "MASTER" }).eq("user_id", owner.id);
    expect(unauthorized.error).not.toBeNull();

    const otherProfile = await stranger.client.from("profiles")
      .select("id").eq("id", owner.id);
    expect(otherProfile.error).toBeNull();
    expect(otherProfile.data).toEqual([]);
  });

  it("administrador operacional não tem poderes Master", async () => {
    const op = await operational.client.rpc("is_admin_master");
    const masterCheck = await master.client.rpc("is_admin_master");
    expect(op.error).toBeNull();
    expect(op.data).toBe(false);
    expect(masterCheck.error).toBeNull();
    expect(masterCheck.data).toBe(true);
    const denied = await operational.client.rpc("list_administrators");
    expect(denied.error?.code).toBe("42501");
    const allowed = await master.client.rpc("list_administrators");
    expect(allowed.error).toBeNull();
  });

  it("bucket privado bloqueia upload, leitura e assinatura sem autorização", async () => {
    const path = "temporary/" + owner.id + "/qa-" + randomUUID() + "/photo-1.png";
    qa.photoPaths.push(path);
    const saved = await qa.admin.storage.from(STORAGE_BUCKET_NAME).upload(
      path, PNG, { contentType: "image/png", upsert: false },
    );
    expect(saved.error, saved.error?.message).toBeNull();

    const deniedUpload = await qa.anonymous.storage.from(STORAGE_BUCKET_NAME).upload(
      "temporary/untrusted/" + randomUUID() + "/photo-1.png",
      PNG, { contentType: "image/png", upsert: false },
    );
    expect(deniedUpload.error).not.toBeNull();

    const deniedDownload = await qa.anonymous.storage.from(STORAGE_BUCKET_NAME).download(path);
    const deniedSigned = await stranger.client.storage.from(STORAGE_BUCKET_NAME)
      .createSignedUrl(path, 60);
    expect(deniedDownload.error).not.toBeNull();
    expect(deniedSigned.error).not.toBeNull();

    const signed = await qa.admin.storage.from(STORAGE_BUCKET_NAME).createSignedUrl(path, 60);
    expect(signed.error, signed.error?.message).toBeNull();
    expect(signed.data?.signedUrl).toContain("token=");
    const response = await fetch(signed.data!.signedUrl);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/image\/png/);
  }, 30_000);

  it("ADMIN operacional consegue consultar uma ocorrência para moderá-la", async () => {
    const created = await qa.createOccurrence(owner);
    const { data, error } = await operational.client.from("occurrences")
      .select("id,status,priority,author_id")
      .eq("id", created.occurrenceId)
      .maybeSingle();

    // QA-02: protege a rota PATCH /admin/occurrences/:id/start-analysis.
    // Sem GRANT SELECT no banco, o repositório retorna MODERATION_LOOKUP_FAILED.
    expect(error, error?.message).toBeNull();
    expect(data?.id).toBe(created.occurrenceId);
    expect(data?.status).toBe("RECEIVED");
  }, 30_000);

  it("notificações são persistidas e isoladas pelo destinatário", async () => {
    const { data, error } = await qa.admin.from("notifications")
      .insert({
        user_id: owner.id, title: "Aviso QA", message: "Aviso privado",
        type: "OCCURRENCE_STATUS_CHANGED",
      }).select("id").single();
    expect(error, error?.message).toBeNull();
    const id = data!.id as string;

    const own = await owner.client.from("notifications").select("id").eq("id", id);
    const hidden = await stranger.client.from("notifications").select("id").eq("id", id);
    expect(own.error).toBeNull();
    expect(own.data).toHaveLength(1);
    expect(hidden.error).toBeNull();
    expect(hidden.data).toHaveLength(0);

    await stranger.client.from("notifications").update({ read_at: new Date().toISOString() })
      .eq("id", id);
    const reread = await qa.admin.from("notifications").select("read_at").eq("id", id).single();
    expect(reread.data?.read_at).toBeNull();
  });
});
