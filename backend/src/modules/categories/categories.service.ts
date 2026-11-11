import type { CategoriesRepository, CategoryDto } from "./categories.repository.js";

/** Serviço simples: ponto único para regras de consulta ao catálogo. */
export class CategoriesService {
  constructor(private readonly repository: CategoriesRepository) {}

  list(): Promise<CategoryDto[]> {
    return this.repository.listActive();
  }
}
