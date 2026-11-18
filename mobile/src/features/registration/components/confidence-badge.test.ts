import { confidenceLevel } from './confidence-badge';

describe('confidenceLevel', () => {
  it('classifica as três faixas oficiais', () => {
    expect(confidenceLevel(0.92)).toBe('HIGH');
    expect(confidenceLevel(0.78)).toBe('MEDIUM');
    expect(confidenceLevel(0.45)).toBe('LOW');
  });
});
