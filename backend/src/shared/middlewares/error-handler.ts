import type { ErrorRequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';

export const errorHandler: ErrorRequestHandler = (
    err,
    req,
    res,
    next
) => {
    // Mantém a assinatura de quatro parâmetros do Express.
    void next;

    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            status: 'error',
            message: err.message,
        });
        return;
    }

    console.error('Erro não tratado:', {
        error: err,
        method: req.method,
        path: req.originalUrl,
    });

    res.status(500).json({
        status: 'error',
        message: 'Erro interno do servidor.',
    });
};