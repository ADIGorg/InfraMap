export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message);

    this.name = new.target.name;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// HTTP 400
export class BadRequestError extends AppError {
  constructor(message = "Requisição inválida.") {
    super(400, "BAD_REQUEST", message);
  }
}

// HTTP 401
export class UnauthorizedError extends AppError {
  constructor(message = "Autenticação necessária.") {
    super(401, "UNAUTHORIZED", message);
  }
}

// HTTP 403
export class ForbiddenError extends AppError {
  constructor(message = "Acesso não permitido.") {
    super(403, "FORBIDDEN", message);
  }
}

// HTTP 404
export class NotFoundError extends AppError {
  constructor(message = "Recurso não encontrado.") {
    super(404, "NOT_FOUND", message);
  }
}

// HTTP 409
export class ConflictError extends AppError {
  constructor(message = "Conflito na operação solicitada.") {
    super(409, "CONFLICT", message);
  }
}