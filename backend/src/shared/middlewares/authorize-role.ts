import type { Request, Response, NextFunction } from 'express';

import { createUserSupabaseClient } from '../../infrastructure/supabase/user-client.factory.js';

import {
    AppError,
    UnauthorizedError,
    ForbiddenError,
} from '../errors/app-error.js';

export function authorizeRole(allowedRoles: string[]) {
    return async (
        req: Request,
        _res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            // Verifica se a autenticação foi executada.
            if (!req.user || !req.token) {
                throw new UnauthorizedError(
                    'Usuário não autenticado.'
                );
            }

            // Cria cliente com o JWT do usuário,
            // respeitando as políticas RLS.
            const userClient = createUserSupabaseClient(req.token);

            // Consulta o papel e a situação da conta.
            const { data: userRole, error } = await userClient
                .from('user_roles')
                .select('role, is_active')
                .eq('user_id', req.user.id)
                .maybeSingle();

            if (error) {
                throw new AppError(
                    500,
                    'ROLE_LOOKUP_FAILED',
                    'Não foi possível verificar as permissões do usuário.'
                );
            }

            // Verifica a existência do registro.
            if (!userRole) {
                throw new ForbiddenError(
                    'Perfil de usuário não encontrado.'
                );
            }

            // Verifica se a conta está ativa.
            if (!userRole.is_active) {
                throw new ForbiddenError(
                    'Esta conta está inativa.'
                );
            }

            // Verifica se o papel está autorizado.
            if (!allowedRoles.includes(userRole.role)) {
                throw new ForbiddenError(
                    'Você não possui permissão para acessar este recurso.'
                );
            }

            req.identityRole = userRole.role as 'CITIZEN' | 'ADMIN';
            return next();

        } catch (error) {
            return next(error);
        }
    };
}