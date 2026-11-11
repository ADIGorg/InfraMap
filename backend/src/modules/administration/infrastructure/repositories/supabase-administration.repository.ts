import type { SupabaseClient } from "@supabase/supabase-js";
import type { Dashboard, DashboardRepository } from "../../application/use-cases/get-dashboard.use-case.js";
import { AppError, ForbiddenError } from "../../../../shared/errors/app-error.js";

export function createAdministrationRepository(client: SupabaseClient): DashboardRepository {
  return {
    async getDashboard() {
      const { data, error } = await client.rpc("get_admin_dashboard");
      if (error?.code === "42501") throw new ForbiddenError();
      if (error || !data) {
        throw new AppError(500, "INTERNAL_SERVER_ERROR", "Não foi possível consultar o dashboard.");
      }
      return data as Dashboard;
    },
  };
}
