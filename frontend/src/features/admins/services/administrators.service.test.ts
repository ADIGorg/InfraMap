import { describe, expect, it } from 'vitest';
import { createAdministratorSchema } from './administrators.service';

describe('Contrato de criação de administradores', () => {
  const valid = { name: 'Ana', email: 'ana@example.com', password: '12345678', admin_level: 'MASTER' };
  it.each([8, 72])('aceita senha com %s caracteres', length => {
    expect(createAdministratorSchema.safeParse({ ...valid, password: 'x'.repeat(length) }).success).toBe(true);
  });
  it.each([
    { name: '' }, { name: ' '.repeat(4) }, { name: 'x'.repeat(151) },
    { email: 'invalido' }, { password: '1234567' }, { password: 'x'.repeat(73) }, { admin_level: 'CITIZEN' },
  ])('rejeita entrada fora do contrato %#', changes => {
    expect(createAdministratorSchema.safeParse({ ...valid, ...changes }).success).toBe(false);
  });
  it('aceita nome no limite e nível operacional', () => {
    expect(createAdministratorSchema.safeParse({ ...valid, name: 'x'.repeat(150), admin_level: 'OPERATIONAL' }).success).toBe(true);
  });
});
