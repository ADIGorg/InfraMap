import { beforeAll, afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { API, LocalQaStack, qaEnabled, type QaUser } from "../support/qa-local-supabase.js";

// Test writes are HARD-BLOCKED unless SUPABASE_URL points to localhost.
describe.skipIf(!qaEnabled)("API1-102 / RN017 — consentimento de fotos com Storage e Auth locais", () => {
  let qa: LocalQaStack;
  let owner: QaUser;
  let stranger: QaUser;
  let operator: QaUser;
  let privateId = "";
  let publicId = "";
  let privatePhotoId = "";
  let publicPhotoId = "";
  let privateStoragePath = "";

  beforeAll(async () => {
    qa = LocalQaStack.connect();
    owner = await qa.user();
    stranger = await qa.user();
    operator = await qa.user("OPERATIONAL");

    const privateOccurrence = await qa.createOccurrence(owner, false);
    const publicOccurrence = await qa.createOccurrence(owner, true);
    privateId = privateOccurrence.occurrenceId;
    publicId = publicOccurrence.occurrenceId;

    const { data: photos, error } = await qa.admin.from("occurrence_photos")
      .select("id, occurrence_id, storage_path")
      .in("occurrence_id", [privateId, publicId]);
    if (error || photos?.length !== 2) throw new Error("Fotos da fixture não encontradas.");
    privatePhotoId = photos.find(p => p.occurrence_id === privateId)!.id;
    publicPhotoId = photos.find(p => p.occurrence_id === publicId)!.id;
    privateStoragePath = photos.find(p => p.occurrence_id === privateId)!.storage_path;

    for (const id of [privateId, publicId]) {
      const start = await request(qa.app).patch(API + "/admin/occurrences/" + id + "/start-analysis")
        .set(qa.as(operator));
      expect(start.status, JSON.stringify(start.body)).toBe(200);
      const confirmed = await request(qa.app).post(API + "/admin/occurrences/" + id + "/confirm")
        .set(qa.as(operator));
      expect(confirmed.status, JSON.stringify(confirmed.body)).toBe(200);
    }
  }, 120_000);

  afterAll(async () => { await qa?.cleanup(); }, 30_000);

  it("grava escolha TRUE com timestamp/versionamento, e FALSE sem consentimento público", async () => {
    const { data, error } = await qa.admin.from("occurrences")
      .select("id,photo_public_consent,photo_public_consent_at,photo_consent_notice_version")
      .in("id", [privateId, publicId]);
    expect(error).toBeNull();
    const hidden = data?.find(o => o.id === privateId);
    const shown = data?.find(o => o.id === publicId);
    expect(hidden).toMatchObject({
      photo_public_consent: false,
      photo_public_consent_at: null,
      photo_consent_notice_version: null,
    });
    expect(shown?.photo_public_consent).toBe(true);
    expect(shown?.photo_public_consent_at).toEqual(expect.any(String));
    expect(shown?.photo_consent_notice_version).toBe("RN017-2026-11-15");
  });

  it("anônimo consulta detalhe da ocorrência privada SEM URL, path ou consentimento interno", async () => {
    const response = await request(qa.app)
      .get(API + "/occurrences/public/" + privateId);
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body.data.photoUrls).toEqual([]);
    const raw = JSON.stringify(response.body);
    expect(raw).not.toContain(privateStoragePath);
    expect(raw).not.toContain("photoPublicConsent");
    expect(raw).not.toContain("photo_public_consent");
  });

  it("anônimo não obtém URL assinada direta para foto PRIVADA", async () => {
    const response = await request(qa.app).get(
      API + "/occurrences/public/" + privateId + "/photos/" + privatePhotoId,
    );
    expect(response.status).toBe(403);
    expect(response.body).not.toHaveProperty("data.url");
  });

  it("outro cidadão não lê metadados nem obtém URL assinada de foto privada", async () => {
    const { data, error } = await stranger.client.from("occurrence_photos")
      .select("id").eq("occurrence_id", privateId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
    const response = await request(qa.app).get(
      API + "/occurrences/mine/" + privateId + "/photos/" + privatePhotoId,
    ).set(qa.as(stranger));
    expect(response.status).toBeGreaterThanOrEqual(400);

    const storage = await stranger.client.storage
      .from("occurrence-photos").createSignedUrl(privateStoragePath, 60);
    expect(storage.error).not.toBeNull();
  });

  it("autor e ADMIN ativo continuam tendo acesso à foto privada", async () => {
    const own = await request(qa.app).get(
      API + "/occurrences/mine/" + privateId + "/photos/" + privatePhotoId,
    ).set(qa.as(owner));
    expect(own.status, JSON.stringify(own.body)).toBe(200);
    expect(own.body.data.url).toContain("token=");

    const admin = await request(qa.app).get(
      API + "/admin/occurrences/" + privateId + "/photos/" + privatePhotoId,
    ).set(qa.as(operator));
    expect(admin.status, JSON.stringify(admin.body)).toBe(200);
    expect(admin.body.data.url).toContain("token=");
  });

  it("foto com consentimento TRUE aparece no detalhe público e em URL assinada direta", async () => {
    const detail = await request(qa.app).get(API + "/occurrences/public/" + publicId);
    expect(detail.status, JSON.stringify(detail.body)).toBe(200);
    expect(detail.body.data.photoUrls).toHaveLength(1);
    expect(detail.body.data.photoUrls[0].url).toContain("token=");

    const photoUrl = await request(qa.app).get(
      API + "/occurrences/public/" + publicId + "/photos/" + publicPhotoId,
    );
    expect(photoUrl.status, JSON.stringify(photoUrl.body)).toBe(200);
    expect(photoUrl.body.data.url).toContain("token=");
    expect(photoUrl.headers["cache-control"]).toContain("no-store");
  });

  it("RLS permite metadados de foto pública a outro usuário autenticado somente após opt-in", async () => {
    const { data, error } = await stranger.client.from("occurrence_photos")
      .select("id").eq("occurrence_id", publicId);
    expect(error).toBeNull();
    expect(data).toEqual([{ id: publicPhotoId }]);
  });
});
