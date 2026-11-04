import type { Request, RequestHandler } from 'express';

import { ZodError, type ZodType } from 'zod';

import { BadRequestError } from '../errors/app-error.js';
import { ZodError, type ZodType } from 'zod';

import { AppError } from '../errors/app-error.js';

interface ValidationSchemas {
    body?: ZodType;
    params?: ZodType;
    query?: ZodType;
}

export function validateRequest(
    schemas: ValidationSchemas
): RequestHandler {
    return (req, _res, next) => {
        try {
            const validated: NonNullable<Request['validated']> = {};

            // Valida o corpo da requisição.
            if (schemas.body) {
                const parsedBody = schemas.body.parse(req.body);

                req.body = parsedBody;
                validated.body = parsedBody;
            }

            // Valida os parâmetros da URL.
            if (schemas.params) {
                const parsedParams = schemas.params.parse(req.params);

                req.params = parsedParams as Request['params'];
                validated.params = parsedParams;
            }

            // Valida os parâmetros de consulta.
            // Não modifica req.query, pois no Express 5 ele é um getter.
            if (schemas.query) {
                validated.query = schemas.query.parse(req.query);
            }

            // Disponibiliza os dados validados.
            // Disponibiliza os dados validados para os controllers.
            req.validated = validated;

            return next();

        } catch (error) {
            if (error instanceof ZodError) {
                const formattedErrors = error.issues
                    .map((issue) => {
                        const field = issue.path.length > 0
                            ? issue.path.join('.')
                            : 'request';

                        return `${field}: ${issue.message}`;
                    })
                    .join('; ');

                return next(
                    new BadRequestError(
                        `Erro de validação: ${formattedErrors}`
                    new AppError(
                        `Erro de validação: ${formattedErrors}`,
                        400
                    )
                );
            }

            return next(error);
        }
    };
}