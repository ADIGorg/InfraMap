import { randomUUID } from "node:crypto";
import request from "supertest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createApp } from "../../src/app.js";
import { STORAGE_BUCKET_NAME } from "../../src/config/constants.js";

export const API = "/api/v1";
export const qaEnabled = process.env.RUN_SUPABASE_E2E === "1";
export const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lX8AAAAASUVORK5CYII=",
  "base64",
);

export interface QaUser {
  id: string;
  email: string;
  token: string;
  role: "CITIZEN" | "ADMIN";
  level: "MASTER" | "OPERATIONAL" | null;
  client: SupabaseClient;
}

export class LocalQaStack {
  readonly app = createApp();
  readonly admin: SupabaseClient;
  readonly anonymous: SupabaseClient;
  readonly createdUsers: string[] = [];
  readonly photoPaths: string[] = [];

  private constructor(
    readonly url: string,
    readonly publishableKey: string,
    readonly secretKey: string,
  ) {
    const options = { auth: { autoRefreshToken: false, persistSession: false } };
    this.admin = createClient(url, secretKey, options);
    this.anonymous = createClient(url, publishableKey, options);
  }

  static connect(): LocalQaStack {
    const url = process.env.SUPABASE_URL ?? "";
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
    const secretKey = process.env.SUPABASE_SECRET_KEY ?? "";

    let hostname: string;
    try {
      hostname = new URL(url).hostname;
    } catch {
      throw new Error("QA-02/03: SUPABASE_URL inválida.");
    }
    // Hard fail before *any* write: test users, DB and Storage must be local.
    if (!["localhost", "127.0.0.1", "[::1]", "::1"].includes(hostname)) {
      throw new Error("QA-02/03: testes que escrevem dados são PROIBIDOS fora do Supabase local.");
    }
    if (process.env.NODE_ENV !== "test" || !publishableKey || !secretKey ||
        publishableKey.includes("test-anon-key") || secretKey.includes("test-secret-key")) {
      throw new Error("QA-02/03: forneça chaves reais do Supabase LOCAL e NODE_ENV=test.");
    }
    return new LocalQaStack(url, publishableKey, secretKey);
  }

  async user(
    level: "MASTER" | "OPERATIONAL" | null = null,
    viaSignup = false,
  ): Promise<QaUser> {
    const email = "qa-" + randomUUID() + "@example.com";
    const password = "Qa!InfraMap2026#" + randomUUID().slice(0, 8);
    const name = "Pessoa QA " + (level ?? "Cidadão");
    let id: string;

    if (viaSignup) {
      const { data, error } = await this.anonymous.auth.signUp({
        email, password, options: { data: { name } },
      });
      if (error || !data.user) throw new Error("Cadastro Supabase Auth: " + error?.message);
      id = data.user.id;
      // Local test may require email confirmation; never use this action on remote.
      const { error: confirmError } = await this.admin.auth.admin.updateUserById(
        id, { email_confirm: true },
      );
      if (confirmError) throw new Error("Confirmação Auth: " + confirmError.message);
    } else {
      const { data, error } = await this.admin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { name },
      });
      if (error || !data.user) throw new Error("Fixture Supabase Auth: " + error?.message);
      id = data.user.id;
    }
    this.createdUsers.push(id);

    if (level) {
      const { error } = await this.admin.from("user_roles").update({
        role: "ADMIN", admin_level: level,
      }).eq("user_id", id);
      if (error) throw new Error("Fixture papel ADMIN: " + error.message);
    }

    const client = createClient(this.url, this.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signed, error: signInError } = await client.auth.signInWithPassword({
      email, password,
    });
    if (signInError || !signed.session) {
      throw new Error("Login QA: " + signInError?.message);
    }
    return {
      id, email, token: signed.session.access_token,
      role: level ? "ADMIN" : "CITIZEN", level, client,
    };
  }

  as(user: QaUser) {
    return { Authorization: "Bearer " + user.token };
  }

  async category(code = "CAT07"): Promise<string> {
    const { data, error } = await this.admin.from("categories")
      .select("id").eq("code", code).eq("is_active", true).single();
    if (error || !data) throw new Error("Categoria de teste: " + error?.message);
    return data.id;
  }

  async createOccurrence(citizen: QaUser) {
    const upload = await request(this.app).post(API + "/ai-analyses/")
      .set(this.as(citizen))
      .attach("photos", PNG, { filename: "photo-1.png", contentType: "image/png" });
    if (upload.status !== 201) {
      throw new Error("Upload da análise falhou " + upload.status + ": " + JSON.stringify(upload.body));
    }

    const analysisId: string = upload.body.data.id;
    const { data: analysis, error: readError } = await this.admin.from("ai_analyses")
      .select("input_photo_paths").eq("id", analysisId).single();
    if (readError || !analysis || !Array.isArray(analysis.input_photo_paths)) {
      throw new Error("Análise não persistiu os metadados das fotos: " + readError?.message);
    }
    const initialPath = analysis.input_photo_paths[0] as string;
    this.photoPaths.push(initialPath);

    const processing = await request(this.app)
      .post(API + "/ai-analyses/" + analysisId + "/analyze")
      .set(this.as(citizen));
    if (processing.status !== 202) {
      throw new Error("Processar análise: " + processing.status + " " + JSON.stringify(processing.body));
    }

    let analysisResult: Record<string, unknown> | undefined;
    for (let i = 0; i < 50; i++) {
      const state = await request(this.app)
        .get(API + "/ai-analyses/" + analysisId)
        .set(this.as(citizen));
      if (state.status !== 200) {
        throw new Error("Consultar análise: " + state.status + " " + JSON.stringify(state.body));
      }
      analysisResult = state.body.data as Record<string, unknown>;
      if (analysisResult.status === "COMPLETED") break;
      if (analysisResult.status === "FAILED") throw new Error("IA mock falhou: " + JSON.stringify(analysisResult));
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (analysisResult?.status !== "COMPLETED") {
      throw new Error("Análise não chegou a COMPLETED.");
    }

    const { data: completed, error } = await this.admin.from("ai_analyses")
      .select("suggested_category_id, suggested_description")
      .eq("id", analysisId).single();
    if (error || !completed) throw new Error("Sugestão de IA ausente: " + error?.message);
    const finalization = await request(this.app).post(API + "/occurrences/finalize")
      .set(this.as(citizen))
      .send({
        aiAnalysisId: analysisId,
        categoryId: completed.suggested_category_id,
        description: completed.suggested_description,
        location: { lat: -12.2667, lng: -38.9665 },
        categorySource: "AI_CONFIRMED",
        descriptionSource: "AI_CONFIRMED",
        photos: [{ storagePath: initialPath, mimeType: "image/png", sizeBytes: PNG.length }],
      });
    if (finalization.status !== 201) {
      throw new Error("Finalizar ocorrência: " + finalization.status + " " + JSON.stringify(finalization.body));
    }
    const occurrenceId: string = finalization.body.data.id;
    this.photoPaths.push("occurrences/" + occurrenceId + "/photo-1.png");
    return { analysisId, initialPath, occurrenceId, analysisResult };
  }

  async cleanup(): Promise<void> {
    // Best effort. This stack is isolated, and CI destroys the Docker DB afterwards.
    if (this.photoPaths.length) {
      await this.admin.storage.from(STORAGE_BUCKET_NAME).remove(this.photoPaths);
    }
    for (const id of [...this.createdUsers].reverse()) {
      await this.admin.auth.admin.deleteUser(id);
    }
  }
}
