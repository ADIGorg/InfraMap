import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUser, maybeSingle, rpc } = vi.hoisted(() => ({
  getUser: vi.fn(), maybeSingle: vi.fn(), rpc: vi.fn(),
}));
vi.mock("../../src/infrastructure/supabase/auth-client.js", () => ({
  supabaseAuth: { auth: { getUser } },
}));
vi.mock("../../src/infrastructure/supabase/user-client.factory.js", () => ({
  createUserSupabaseClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
    rpc,
  }),
}));
import { administrationRoutes } from "../../src/modules/administration/presentation/administration.routes.js";
import { errorHandler } from "../../src/shared/middlewares/error-handler.js";

const app = express();
app.use("/api/v1/admin", administrationRoutes);
app.use(errorHandler);
const data = {
  daily_counts_timezone: "America/Sao_Paulo",
  daily_counts: Array.from({ length: 7 }, (_, index) => ({ date: `2026-11-${12 + index}`, count: 0 })),
  counts_by_status: { RECEIVED: 0, UNDER_ANALYSIS: 0, CONFIRMED: 0, IN_SERVICE: 0, RESOLVED: 0, REJECTED: 0 },
  high_priority_total: 0, average_resolution_days: null,   sla_breaches: { received_over_48h: 0, under_analysis_over_5d: 0 }
};

describe("ADM-01", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: "admin" } }, error: null });
    maybeSingle.mockResolvedValue({ data: { role: "ADMIN", is_active: true }, error: null });
    rpc.mockResolvedValue({ data, error: null });
  });

  it("retorna os seis status e média nula em base vazia", async () => {
    const response = await request(app).get("/api/v1/admin/dashboard").auth("jwt", { type: "bearer" });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data });
    expect(rpc).toHaveBeenCalledWith("get_admin_dashboard");
  });

  it("exige autenticação", async () => {
    expect((await request(app).get("/api/v1/admin/dashboard")).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("preserva a série real da RPC, inclusive zeros, sem agregar a lista paginada", async () => {
    const actual = { ...data, daily_counts: data.daily_counts.map((day, index) => ({ ...day, count: index === 3 ? 27 : 0 })) };
    rpc.mockResolvedValue({ data: actual, error: null });
    const response = await request(app).get("/api/v1/admin/dashboard").auth("jwt", { type: "bearer" });
    expect(response.status).toBe(200);
    expect(response.body.data.daily_counts).toEqual(actual.daily_counts);
    expect(response.body.data.daily_counts_timezone).toBe("America/Sao_Paulo");
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it.each([
    { role: "CITIZEN", is_active: true },
    { role: "ADMIN", is_active: false },
  ])("nega acesso para %j", async (role) => {
    maybeSingle.mockResolvedValue({ data: role, error: null });
    expect((await request(app).get("/api/v1/admin/dashboard").auth("jwt", { type: "bearer" })).status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("respeita revogação de permissão detectada pela RPC", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    expect((await request(app).get("/api/v1/admin/dashboard").auth("jwt", { type: "bearer" })).status).toBe(403);
  });

  it("oculta detalhes de falha do banco", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "private-database-error" } });
    const response = await request(app).get("/api/v1/admin/dashboard").auth("jwt", { type: "bearer" });
    expect(response.status).toBe(500);
    expect(response.text).not.toContain("private-database-error");
  });
});
