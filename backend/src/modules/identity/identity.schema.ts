import { z } from 'zod';

export const createUserBodySchema = z.object({
    name: z.string()
        .min(3, 'O nome deve ter no mínimo 3 caracteres')
        .max(150, 'O nome deve ter no máximo 150 caracteres'),
    
    email: z.string()
        .email('Formato de e-mail inválido'),
    
    password: z.string()
        .min(6, 'A senha deve ter no mínimo 6 caracteres'),
    
    role: z.enum(['CITIZEN', 'ADMIN'])
        .optional()
        .default('CITIZEN')
});

export const getUserParamsSchema = z.object({
    id: z.string().uuid('O ID fornecido não é um UUID válido')
});