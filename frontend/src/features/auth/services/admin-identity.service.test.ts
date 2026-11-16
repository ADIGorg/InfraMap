import { describe, expect, it } from 'vitest';
import { adminIdentitySchema } from './admin-identity.service';

const identity = {
  id: 'f7b4b081-b5f0-44a3-9cdd-dc2aff96a122',
  role: 'ADMIN',
  is_active: true,
};

describe('contrato /admin/me', () => {
  it('aceita resposta direta sem envelope e sem admin_level', () => {
    const result = adminIdentitySchema.parse(identity);
    expect(result.admin_level).toBeUndefined();
  });
  it('aceita novo nível explícito após API1-100', () => {
    expect(adminIdentitySchema.parse({ ...identity, admin_level: 'MASTER' }).admin_level).toBe('MASTER');
  });
  it('rejeita papel CITIZEN ou nível desconhecido', () => {
    expect(adminIdentitySchema.safeParse({ ...identity, role: 'CITIZEN' }).success).toBe(false);
    expect(adminIdentitySchema.safeParse({ ...identity, admin_level: 'OWNER' }).success).toBe(false);
  });
});
