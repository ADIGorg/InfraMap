import type { Request, Response, NextFunction } from 'express';
import { supabaseAuth } from '../../infrastructure/supabase/auth-client.js';
import { AppError } from '../errors/app-error.js';

export async function authenticate(
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const authHeader = req.headers.authorization;
        const bearerMatch = authHeader?.match(/^Bearer\s+(\S+)$/i);

        if (!bearerMatch) {
            throw new AppError('Token de autenticação ausente ou mal formatado.', 401);
        }

        const token = bearerMatch[1]!;
        const { data: { user }, error } = await supabaseAuth.auth.getUser(token);

        if (error || !user) {
            throw new AppError('Token inválido ou expirado.', 401);
        }

        // Salva o token para que o authorize-role possa consultar o banco com RLS ativo
        req.token = token; 
        req.user = user;

        return next();
    } catch (error) {
        return next(error);
    }
}