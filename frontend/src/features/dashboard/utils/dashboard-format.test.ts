import { describe, expect, it } from 'vitest';
import { formatElapsedDays, formatOccurrenceDate } from './dashboard-format';

describe('dashboard formatters', () => {
  it('distingue média nula de zero real', () => {
    expect(formatElapsedDays(null)).toBe('Sem resoluções');
    expect(formatElapsedDays(0)).toBe('0 dias');
    expect(formatElapsedDays(1.25)).toBe('1,3 dias');
  });
  it('usa data em fuso de Brasília para registros ISO', () => {
    expect(formatOccurrenceDate('2026-11-17T15:20:00Z')).toMatch(/17\/11.*12:20/);
    expect(formatOccurrenceDate('invalida')).toBe('Data indisponível');
  });
});
