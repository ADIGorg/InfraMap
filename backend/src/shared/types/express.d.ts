import type { User } from '@supabase/supabase-js';

declare global {
    namespace Express {
        interface Request {
            user?: User;
            token?: string; // Adicionado para permitir a consulta RLS no authorize-role
        }
    }
}

export {};