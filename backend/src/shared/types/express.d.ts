// src/shared/types/express.d.ts

import type { User } from "@supabase/supabase-js";

declare global {
  namespace Express {
    interface Request {
      // Usuário Supabase Auth (id, email, user_metadata, app_metadata).
      // NÃO contém role — essa info vive em `user_roles`.
      user?: User;

      // Access token Bearer para chamadas autenticadas.
      token?: string;

      // Papel do usuário em `user_roles`, populado pelo `authorizeRole`.
      // Use este campo em vez de `req.user.role` (que não existe em `User`).
      userRole?: "CITIZEN" | "ADMIN";

      // Dados validados pelo `validateRequest`.
      validated?: {
        body?: unknown;
        params?: unknown;
        query?: unknown;
      };
    }
  }
}

export {};