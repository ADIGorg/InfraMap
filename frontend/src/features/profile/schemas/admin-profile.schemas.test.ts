import { describe, expect, it } from 'vitest';
import { changeAdminPasswordSchema, editAdminProfileSchema } from './admin-profile.schemas';

describe('perfil administrativo — validação', () => {
  it('normaliza nome e telefone vazio para null', () => {
    expect(editAdminProfileSchema.parse({ name: ' Maria Silva ', phone: '' })).toEqual({
      name: 'Maria Silva', phone: null,
    });
    expect(editAdminProfileSchema.parse({ name: 'João Souza', phone: '(75) 99999-9999' }).phone)
      .toBe('(75) 99999-9999');
  });

  it('rejeita dados cadastrais inválidos', () => {
    expect(editAdminProfileSchema.safeParse({ name: 'Jo', phone: '' }).success).toBe(false);
    expect(editAdminProfileSchema.safeParse({ name: 'Nome Correto', phone: 'ABC' }).success).toBe(false);
    expect(editAdminProfileSchema.safeParse({ name: 'Nome Correto', phone: '1234' }).success).toBe(false);
  });

  it('exige senha atual, nova senha diferente e confirmação', () => {
    const valid = { currentPassword: 'antiga12345', newPassword: 'nova12345678', confirmPassword: 'nova12345678' };
    expect(changeAdminPasswordSchema.safeParse(valid).success).toBe(true);
    expect(changeAdminPasswordSchema.safeParse({ ...valid, currentPassword: '' }).success).toBe(false);
    expect(changeAdminPasswordSchema.safeParse({ ...valid, newPassword: 'curta', confirmPassword: 'curta' }).success).toBe(false);
    expect(changeAdminPasswordSchema.safeParse({ ...valid, confirmPassword: 'diferente' }).success).toBe(false);
    expect(changeAdminPasswordSchema.safeParse({ ...valid, newPassword: valid.currentPassword, confirmPassword: valid.currentPassword }).success).toBe(false);
  });
});
