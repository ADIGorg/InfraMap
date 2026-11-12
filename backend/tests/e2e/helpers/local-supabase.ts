/**
 * QA-02/QA-03: integração real com Supabase LOCAL.
 * As credenciais são fornecidas exclusivamente por scripts/run-local-e2e.ts.
 * A URL de produção é deliberadamente rejeitada mesmo se alguém setar E2E_LOCAL=1.
 */
import { randomUUID } from "node:crypto";
import request from "supertest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect } from "vitest";

import { createApp } from "../../../src/app.js";

export const API = "/api/v1";
export const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/2koAAAAASUVORK5CYII=",
  "base64",
);

export interface TestActor {
  id: string;
  email: string;
  token: string;
}

export type AdminLevel = "MASTER" | "OPERATIONAL";
export function assertLocalOnly(): void {
  const url = process.env.SUPABASE_URL;
  if (process.env.E2E_LOCAL !== "1" || !url) {
    throw new Error("QA E2E exige E2E_LOCAL=1 e credenciais do Supabase LOCAL.");
  }
  const hostname = new URL(url).hostname;
  if (!["127.0.0.1", "localhost", "[::1]"].includes(hostname)) {
    throw new Error("Recusado: QA E2E jamais executa em projeto Supabase remoto.");
  }
}

export function harness() {
  assertLocalOnly();
  const url = process.env.SUPABASE_URL!;
  const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const serviceKey = process.env.SUPABASE_SECRET_KEY!;
  if (!anonKey || !serviceKey) throw new Error("Chaves Supabase locais ausentes.");
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
  const admin = createClient(url, serviceKey, options);
  const userClient = (): SupabaseClient => createClient(url, anonKey, options);
  const app = createApp();
  const prefix = `qa${randomUUID().slice(0, 12)}`;
  const password = "QA1234!LocalTest";
  const actors: TestActor[] = [];

  async function createActor(name: string, level?: AdminLevel): Promise<TestActor> {
    const email = `${prefix}-${name}@example.com`;
    const client = userClient();

    // Cidadãos passam pelo cadastro público. Administradores são provisionados
    // via Auth admin, como exige o fluxo de gestão restrito.
    const signUp = level
      ? await admin.auth.admin.createUser({
          email, password, email_confirm: true, user_metadata: { name },
        })
      : await client.auth.signUp({
          email, password, options: { data: { name } },
        });
    if (signUp.error || !signUp.data.user) {
      throw new Error(`Cadastro real de ${name}: ${signUp.error?.message ?? "sem usuário"}`);
    }
    const id = signUp.data.user.id;
    if (!level) {
      // A confirmação local viabiliza login mesmo com confirmações de e-mail ligadas.
      const confirmed = await admin.auth.admin.updateUserById(id, { email_confirm: true });
      if (confirmed.error) throw new Error(confirmed.error.message);
    }
    if (level) {
      const updated = await admin.from("user_roles")
        .update({ role: "ADMIN", admin_level: level })
        .eq("user_id", id).select("user_id").single();
      if (updated.error || !updated.data) {
        throw new Error(`Não foi possível configurar ${level}: ${updated.error?.message}`);
      }
    }
    const login = await client.auth.signInWithPassword({ email, password });
    if (login.error || !login.data.session) {
      throw new Error(`Login ${name}: ${login.error?.message ?? "sem sessão"}`);
    }
    const actor: TestActor = { id, email, token: login.data.session.access_token };
    actors.push(actor);
    return actor;
  }

  const http = () => request(app);
  const bearer = (actor: TestActor) => `Bearer ${actor.token}`;

  async function categoryId(code: string): Promise<string> {
    const {data, error} = await admin.from("categories")
      .select("id").eq("code", code).eq("is_active", true).single();
    if (error || !data) throw new Error(`Categoria ${code} inexistente: ${error?.message}`);
    return data.id as string;
  }

  async function createOccurrence(actor: TestActor, edited = false) {
    const uploaded = await http().post(`${API}/ai-analyses/`)
      .set("Authorization", bearer(actor))
      .attach("photos", PNG, { filename: "evidencia.png", contentType: "image/png" });
    expect(uploaded.status, JSON.stringify(uploaded.body)).toBe(201);
    expect(uploaded.body.data.status).toBe("PENDING");

    const analysisId: string = uploaded.body.data.id;
    const processing = await http().post(`${API}/ai-analyses/${analysisId}/analyze`)
      .set("Authorization", bearer(actor));
    expect(processing.status, JSON.stringify(processing.body)).toBe(202);

    let result: { status: string; category_code: string; suggested_description: string } | undefined;
    for (let attempt = 0; attempt < 50; attempt++) {
      const response = await http().get(`${API}/ai-analyses/${analysisId}`)
        .set("Authorization", bearer(actor));
      expect(response.status, JSON.stringify(response.body)).toBe(200);
      result = response.body.data;
      if (result?.status === "COMPLETED") break;
      if (result?.status === "FAILED") throw new Error(`IA falhou: ${JSON.stringify(result)}`);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    expect(result?.status).toBe("COMPLETED");

    const description = edited
      ? "Descrição revisada manualmente pelo cidadão"
      : result!.suggested_description;
    const category = await categoryId(result!.category_code);
    const path = `temporary/${actor.id}/${analysisId}/photo-1.png`;

    const finalized = await http().post(`${API}/occurrences/finalize`)
      .set("Authorization", bearer(actor))
      .send({
        aiAnalysisId: analysisId,
        categoryId: category,
        categorySource: edited ? "AI_EDITED" : "AI_CONFIRMED",
        descriptionSource: edited ? "AI_EDITED" : "AI_CONFIRMED",
        description,
        location: { lat: -12.26674, lng: -38.97658 },
        photos: [{ storagePath: path, mimeType: "image/png", sizeBytes: PNG.length }],
      });
    expect(finalized.status, JSON.stringify(finalized.body)).toBe(201);
    expect(finalized.body.data.status).toBe("RECEIVED");
    const occurrenceId: string = finalized.body.data.id;
    const photo = await admin.from("occurrence_photos")
      .select("id,storage_path").eq("occurrence_id", occurrenceId).single();
    expect(photo.error).toBeNull();

    return {
      occurrenceId, analysisId, categoryId: category,
      photoId: photo.data!.id as string,
      storagePath: photo.data!.storage_path as string,
      description,
    };
  }

  return { app, admin, http, bearer, createActor, createOccurrence, categoryId, actors };
}

export type QaHarness = ReturnType<typeof harness>;
