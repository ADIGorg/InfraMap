import { describe, expect, it } from 'vitest';
import { safeAdminReturnTo } from './safe-return-to';

describe('safeAdminReturnTo', () => {
  it('aceita somente caminho interno administrativo', () => {
    expect(safeAdminReturnTo('/admin/dashboard')).toBe('/admin/dashboard');
    expect(safeAdminReturnTo('/admin/occurrences?page=2')).toBe('/admin/occurrences?page=2');
    expect(safeAdminReturnTo('/admin')).toBe('/admin');
  });
  it('rejeita caminhos e domínios externos', () => {
    for (const value of [
      'https://evil.example', '//evil.example', '/adminish', '/outside',
      '/admin\\evil', '/admin%5c%5cevil', 'javascript:alert(1)', null,
    ]) {
      expect(safeAdminReturnTo(value)).toBeNull();
    }
  });
});

