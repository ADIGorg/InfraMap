import type { Request, Response, NextFunction } from 'express';

import { supabaseAuth } from '../../infrastructure/supabase/auth-client.js';
import { UnauthorizedError } from '../errors/app-error.js';

export async function authenticate(
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        const bearerMatch = authHeader?.match(/^Bearer\s+(\S+)$/i);

        if (!bearerMatch) {
            throw new UnauthorizedError(
                'Token de autenticação ausente ou mal formatado.'
            );
        }

        const token = bearerMatch[1]!;

        const {
            data: { user },
            error,
        } = await supabaseAuth.auth.getUser(token);

        if (error || !user) {
            throw new UnauthorizedError(
                'Token inválido ou expirado.'
            );
        }

        // Disponibiliza a identidade e o token
        // para os próximos middlewares.
        req.token = token;
        req.user = user;

        return next();

    } catch (error) {
        return next(error);
    }
}