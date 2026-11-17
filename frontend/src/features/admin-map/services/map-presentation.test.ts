import { describe, expect, it } from 'vitest';
import { boundsFromGoogle, formatCoords, pinColor, validPoint } from './map-presentation';

describe('Map presentation helpers', () => {
  it('normaliza bounds Google para a ordem aceita no backend', () => {
    expect(boundsFromGoogle({ north: -12, south: -13, east: -38, west: -39 }))
      .toEqual({ minLat: -13, maxLat: -12, minLng: -39, maxLng: -38 });
  });
  it('não permite coordenadas inválidas', () => {
    expect(validPoint({ lat: NaN, lng: 20 })).toBe(false);
    expect(validPoint({ lat: -91, lng: 20 })).toBe(false);
    expect(validPoint({ lat: -12.99, lng: -38.5 })).toBe(true);
    expect(formatCoords({ lat: -12.99, lng: -38.5 })).toBe('-12.990000, -38.500000');
  });
  it('colore somente status ativos', () => {
    expect(pinColor('RECEIVED')).toBe('#95A5A6');
    expect(pinColor('IN_SERVICE')).toBe('#E67E22');
  });
});
