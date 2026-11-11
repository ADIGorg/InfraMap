import type { RequestHandler } from "express";
import type { CategoriesService } from "./categories.service.js";

/** Controller não depende de Supabase nem do contrato de persistência. */
export function createListCategoriesController(service: CategoriesService): RequestHandler {
  return async (_request, response, next) => {
    try {
      return response.status(200).json({ data: await service.list() });
    } catch (error) {
      return next(error);
    }
  };
}
