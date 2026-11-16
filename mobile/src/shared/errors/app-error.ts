export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function parseErrorResponse(statusCode: number, body: unknown): AppError {
  if (
    typeof body === 'object' && body !== null &&
    'error' in body &&
    typeof (body as { error: unknown }).error === 'object'
  ) {
    const err = (body as { error: { code?: string; message?: string } }).error;
    return new AppError(statusCode, err.code ?? 'UNKNOWN_ERROR', err.message ?? 'Erro inesperado.');
  }
  return new AppError(statusCode, 'UNKNOWN_ERROR', 'Erro inesperado.');
}