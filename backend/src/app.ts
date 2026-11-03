import express from 'express';

import routes from './routes/index.routes.js';
import { errorHandler } from './shared/middlewares/error-handler.js';

const app = express();

app.use(express.json());

app.use('/api/v1', routes);

// Tratamento de rotas inexistentes.
app.use((_req, res) => {
    return res.status(404).json({
        status: 'error',
        message: 'Rota não encontrada.',
    });
});

// Tratamento global de erros.
app.use(errorHandler);

export default app;