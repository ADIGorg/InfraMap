import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error.js';
import { createUserSupabaseClient } from '../../infrastructure/supabase/user-client.factory.js';

/**
 * Middleware de Autorização Baseada em Perfis (RBAC).
 * Deve ser usado SEMPRE após o middleware 'authenticate'.
 * 
 * @param allowedRoles Lista de papéis permitidos (ex: ['ADMIN']).
 */
export function authorizeRole(allowedRoles: string[]) {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        try {
            // 1. Defesa: O usuário já passou pelo 'authenticate'?
            if (!req.user || !req.token) {
                throw new AppError('Usuário não autenticado.', 401);
            }

            // 2. Cria o cliente Supabase usando o token do usuário para respeitar o RLS
            const userClient = createUserSupabaseClient(req.token);

            // 3. Consulta o perfil do usuário no banco de dados (nunca confiando no frontend)
            const { data: userRole, error } = await userClient
                .from('user_roles')
                .select('role, is_active')
                .eq('user_id', req.user.id)
                .maybeSingle(); // Retorna null se não achar, evitando erro caso não exista

            if (error) {
                console.error('Erro ao buscar user_roles:', error);
                throw new AppError('Erro interno ao verificar permissões.', 500);
            }

            // 4. Verifica se o usuário possui um registro de perfil
            if (!userRole) {
                throw new AppError('Acesso negado. Perfil de usuário não encontrado.', 403);
            }

            // 5. Verifica a situação da conta (Critério de Aceite)
            if (!userRole.is_active) {
                throw new AppError('Acesso negado. Esta conta está inativa.', 403);
            }

            // 6. Verifica se o papel do usuário está na lista de permitidos (Critério de Aceite)
            if (!allowedRoles.includes(userRole.role)) {
                throw new AppError('Acesso negado. Você não tem permissão para acessar este recurso.', 403);
            }

            // 7. Usuário autorizado, segue o fluxo
            return next();

        } catch (error) {
            return next(error); // Repassa para o error-handler global retornar 403
        }
    };
}