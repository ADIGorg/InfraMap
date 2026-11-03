import { Router } from 'express';
import { authenticate } from '../../shared/middlewares/authenticate.js';

const identityRouter = Router();

/**
 * Rota para testar exclusivamente a autenticação (API1-7)
 * Critérios de aceite:
 * - Sem Token -> 401
 * - Token inválido/expirado -> 401
 * - Token válido -> 200 + Identidade
 */
identityRouter.get('/me', authenticate, (req, res) => {
    // Como passamos pelo 'authenticate', o TypeScript sabe que req.user existe aqui.
    const user = req.user!; 

    return res.status(200).json({
        status: 'success',
        message: 'Usuário autenticado com sucesso.',
        data: {
            id: user.id, // Vem do Token JWT, não do body!
            email: user.email,
            lastSignIn: user.last_sign_in_at
        }
    });
});

export { identityRouter };