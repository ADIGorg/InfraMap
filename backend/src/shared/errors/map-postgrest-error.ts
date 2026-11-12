import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "./app-error.js";

export interface DatabaseError {
  code?: string | null;
  message?: string | null;
}

/**
 * Traduz SQLSTATE sem devolver detalhes internos, caminhos ou consultas SQL.
 * As RPCs sinalizam condições de negócio pelo SQLSTATE e, por compatibilidade,
 * podem acrescentar um prefixo textual legível.
 */
export function mapPostgrestError(
  error: DatabaseError,
  action = "executar a operação",
): AppError {
  const message = error.message ?? "";
  if (error.code === "42501" || message.startsWith("FORBIDDEN:")) {
    return new ForbiddenError("Operação não autorizada.");
  }
  if (error.code === "P0002" || message.startsWith("NOT_FOUND:")) {
    return new NotFoundError("Recurso não encontrado.");
  }
  if (error.code === "23505" || message.startsWith("CONFLICT:")) {
    return new ConflictError("Estado ou dados incompatíveis com a operação.");
  }
  if (
    error.code === "22023" ||
    error.code === "23514" ||
    message.startsWith("BAD_REQUEST:")
  ) {
    return new BadRequestError("Dados inválidos para a operação.");
  }
  if (error.code === "42883" || error.code === "PGRST202") {
    return new AppError(
      503,
      "DATABASE_MIGRATION_REQUIRED",
      "A versão do banco de dados não está compatível com a API.",
    );
  }
  return new AppError(
    500,
    "DATABASE_OPERATION_FAILED",
    `Não foi possível ${action}.`,
  );
}
