import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../errors/app-error.js';

interface ValidationSchemas {
    body?: ZodTypeAny;
    params?: ZodTypeAny;
    query?: ZodTypeAny;
}

export function validateRequest(schemas: ValidationSchemas) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        try {
            // Valida o Body
            if (schemas.body) {
                // O Zod substitui o req.body pelos dados validados e tipados.
                // Isso também remove campos extras (Mass Assignment Protection).
                req.body = schemas.body.parse(req.body);
            }

            // Valida os Params (URL)
            if (schemas.params) {
                req.params = schemas.params.parse(req.params) as Request['params'];
            }

            // Valida a Query (?key=value)
            if (schemas.query) {
                // Usamos Object.assign para contornar problemas de getters/setters no Express
                Object.assign(req.query, schemas.query.parse(req.query));
            }

            // Se passar por tudo, segue o fluxo
            return next();

        } catch (error) {
            if (error instanceof ZodError) {
                // Formata os erros do Zod de forma legível.
                // Exemplo de saída: "email: Formato de e-mail inválido, password: A senha deve ter no mínimo 6 caracteres"
                const formattedErrors = error.issues
                    .map((issue) => {
                        const field = issue.path.join('.');
                        return `${field}: ${issue.message}`;
                    })
                    .join(', ');

                // Repassa para o error-handler global com status 400
                return next(new AppError(`Erro de validação: ${formattedErrors}`, 400));
            }

            // Se for um erro desconhecido, repassa adiante
            return next(error);
        }
    };
}