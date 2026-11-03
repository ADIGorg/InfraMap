import { Router } from 'express';
import { authenticate } from '../../shared/middlewares/authenticate.js';
import { authorizeRole } from '../../shared/middlewares/authorize-role.js';
import { validateRequest } from '../../shared/middlewares/validate-request.js';
import { createUserBodySchema, getUserParamsSchema } from './identity.schema.js';

const identityRouter = Router();

// Rota Protegida: Apenas Admin pode criar novos usuários
identityRouter.post(
    '/users',
    authenticate,
    authorizeRole(['ADMIN']),
    validateRequest({ body: createUserBodySchema }), // <--- Middleware do Zod
    (req, res) => {
        // Se chegou aqui, o req.body está 100% limpo e tipado (name, email, password, role)
        // Nenhum campo extra enviado pelo frontend passou por esta barreira.
        return res.status(201).json({
            message: 'Usuário validado e pronto para criação.',
            data: req.body,
        });
    }
);

// Exemplo usando Params
identityRouter.get(
    '/users/:id',
    authenticate,
    validateRequest({ params: getUserParamsSchema }),
    (req, res) => {
        return res.status(200).json({ message: `Buscando usuário ${req.params.id}` });
    }
);

export { identityRouter };