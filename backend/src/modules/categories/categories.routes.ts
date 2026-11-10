
import { Router } from "express";

import {
  createListCategoriesController,
} from "./categories.controller.js";

import type {
  CategoriesRepository,
} from "./categories.repository.js";

// Rotas públicas do módulo de categorias.
export function createCategoriesRoutes(
  repository: CategoriesRepository
) {
  const router = Router();

  // GET /api/v1/categories
  // Não exige autenticação.
  router.get(
    "/",
    createListCategoriesController(repository)
  );

  return router;
}
