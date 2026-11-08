import { z } from 'zod';

export const createUserBodySchema = z.object({
    name: z.string()
        .trim()
        .min(3, 'O nome deve ter no mínimo 3 caracteres')
        .max(150, 'O nome deve ter no máximo 150 caracteres'),

    email: z.string()
        .trim()
        .pipe(
            z.email({
                error: 'Formato de e-mail inválido',
            })
        ),

    password: z.string()
        .min(6, 'A senha deve ter no mínimo 6 caracteres'),

    role: z.enum(['CITIZEN', 'ADMIN'])
        .optional()
        .default('CITIZEN'),
});

export const getUserParamsSchema = z.object({
    id: z.uuid({
        error: 'O ID fornecido não é um UUID válido',
    }),
});

export const getUsersQuerySchema = z.object({
    page: z.coerce.number()
        .int()
        .min(1, 'A página deve ser maior que zero')
        .default(1),

    limit: z.coerce.number()
        .int()
        .min(1, 'O limite deve ser maior que zero')
        .max(100, 'O limite máximo é 100')
        .default(20),
});