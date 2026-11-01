import express from "express";
import routes from "./routes/index.routes.js";

const app = express();

// Parser JSON
app.use(express.json());

// Rotas da API
app.use("/api/v1", routes);

// Resposta para rotas inexistentes
app.use((_req, res) => {
  return res.status(404).json({
    status: "error",
    message: "Rota não encontrada.",
  });
});

export default app;