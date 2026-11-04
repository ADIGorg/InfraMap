import type { User } from "@supabase/supabase-js";

declare global {
  namespace Express {
    interface Request {
      // Usuário autenticado pelo Supabase.
      user?: User;

      // Access Token utilizado nas consultas com RLS.
      token?: string;

      // Dados validados pelo middleware Zod.
      validated?: {
        body?: unknown;
        params?: unknown;
        query?: unknown;
      };
    }
  }
}

export {};