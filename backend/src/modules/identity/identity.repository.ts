import type { SupabaseClient } from '@supabase/supabase-js';

import {
    AppError,
} from '../../shared/errors/app-error.js';

import type {
    IdentityRole,
    ProfileReader,
    UserProfile,
} from './identity.service.js';

// Verifica se o papel retornado pelo banco é válido.
function isIdentityRole(role: unknown): role is IdentityRole {
    return role === 'CITIZEN' || role === 'ADMIN';
}

// Implementa o contrato de consulta do perfil.
export function createProfileReader(
    supabase: SupabaseClient
): ProfileReader {
    return {
        async findByUserId(
            userId: string
        ): Promise<UserProfile | null> {

            // Papel e situação da conta ficam em user_roles.
            const { data, error } = await supabase
                .from('user_roles')
                .select('user_id, role, is_active')
                .eq('user_id', userId)
                .maybeSingle();

            // Não expõe detalhes internos do Supabase.
            if (error) {
                throw new AppError(
                    500,
                    'IDENTITY_ROLE_QUERY_FAILED',
                    'Não foi possível consultar o perfil do usuário.'
                );
            }

            // Usuário sem registro de autorização.
            if (!data) {
                return null;
            }

            // Valida os dados retornados pelo banco.
            if (
                typeof data.user_id !== 'string' ||
                !isIdentityRole(data.role) ||
                typeof data.is_active !== 'boolean'
            ) {
                throw new AppError(
                    500,
                    'INVALID_IDENTITY_ROLE_DATA',
                    'Os dados do perfil do usuário são inválidos.'
                );
            }

            // Adapta os campos do banco ao contrato do Service.
            return {
                id: data.user_id,
                role: data.role,
                is_active: data.is_active,
            };
        },
    };
}