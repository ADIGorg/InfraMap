import { Router } from "express";
import { CategoriesService } from "./categories.service.js";
import { createListCategoriesController } from "./categories.controller.js";
import type { CategoriesRepository } from "./categories.repository.js";

/** Assinatura externa preservada para os testes e demais consumidores. */
export function createCategoriesRoutes(repository: CategoriesRepository) {
  const router = Router();
  const service = new CategoriesService(repository);
  router.get("/", createListCategoriesController(service));
  return router;
}
