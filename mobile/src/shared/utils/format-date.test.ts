import { formatDate } from './format-date';

describe('formatDate', () => {
  it('formata ISO em dd/MM/yyyy convertido para São Paulo', () => {
    // 2026-08-12T10:00:00Z = 2026-08-12 07:00 BRT
    expect(formatDate('2026-08-12T10:00:00Z')).toBe('12/08/2026');
  });

  it('converte corretamente nas bordas do dia (UTC → BRT)', () => {
    // 2026-08-13T02:00:00Z = 2026-08-12 23:00 BRT → ainda dia 12
    expect(formatDate('2026-08-13T02:00:00Z')).toBe('12/08/2026');
  });
});