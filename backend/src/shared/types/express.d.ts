import type { User } from "@supabase/supabase-js";

declare global {
  namespace Express {
    interface Request {
      // Usuário autenticado pelo Supabase.
      user?: User;

      // Papel de negócio consultado em user_roles pelo middleware de autorização.
      identityRole?: 'CITIZEN' | 'ADMIN';

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