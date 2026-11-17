import { describe, expect, it, vi } from 'vitest';
vi.mock('@/infrastructure/api/http-client', () => ({ http: vi.fn() }));
import { AppError } from '@/shared/errors/app-error';
import { describeMapMutationError } from './use-admin-map-view-model';

describe('Map adjustment error mapping', () => {
  it('distingue 403, 409 e 400 sem expor mensagens internas', () => {
    expect(describeMapMutationError(new AppError(403, 'FORBIDDEN', 'Privado'))).toMatch(/permissão/);
    expect(describeMapMutationError(new AppError(409, 'CONFLICT', 'Privado'))).toMatch(/mudou/);
    expect(describeMapMutationError(new AppError(400, 'INVALID', 'Privado'))).toMatch(/Coordenadas inválidas/);
  });
});
