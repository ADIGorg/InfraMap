
export interface AccountDeactivationRepository {
  /**
   * Desativa e anonimiza os dados no PostgreSQL.
   *
   * O JWT é necessário porque a função SQL
   * identifica o usuário por auth.uid().
   */
  deactivateAndAnonymize(
    userId: string,
    accessToken: string
  ): Promise<void>;

  /**
   * Confirma que a limpeza do Auth terminou.
   */
  markAuthCleanupCompleted(
    userId: string
  ): Promise<void>;
}

export interface AccountAuthGateway {
  anonymizeAuthUser(
    userId: string
  ): Promise<void>;

  revokeSessions(
    accessToken: string
  ): Promise<void>;
}