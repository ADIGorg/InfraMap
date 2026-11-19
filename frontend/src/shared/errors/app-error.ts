export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}
export function safeErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    if (error.statusCode === 401) return 'Sua sessão expirou. Entre novamente.';
    if (error.statusCode === 403) return 'Você não tem permissão para esta operação.';
    if (error.statusCode === 409) return 'Os dados foram alterados. Atualize e tente novamente.';
    if (error.statusCode === 429) return 'Muitas tentativas. Tente novamente mais tarde.';
    if (error.statusCode >= 500) return 'O serviço está indisponível. Tente novamente.';
    return error.message;
  }
  return 'Não foi possível concluir a operação. Tente novamente.';
}
