import type { RequestHandler } from "express";

export const healthCheck: RequestHandler = (_req, res) => {
  return res.status(200).json({
    status: "ok",
    message: "InfraMap API funcionando!",
    timestamp: new Date().toISOString(),
  });
};