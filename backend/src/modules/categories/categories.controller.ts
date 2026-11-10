
import type { RequestHandler } from "express";

import type {
  CategoriesRepository,
} from "./categories.repository.js";

// Controller responsável pela resposta HTTP.
export function createListCategoriesController(
  repository: CategoriesRepository
): RequestHandler {
  return async (_request, response, next) => {
    try {
      const categories = await repository.listActive();

      return response.status(200).json({
        data: categories,
      });
    } catch (error) {
      return next(error);
    }
  };
}
