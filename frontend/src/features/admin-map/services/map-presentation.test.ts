import { describe, expect, it } from 'vitest';
import { boundsFromLeaflet, formatCoords, pinColor, validPoint } from './map-presentation';

describe('Map presentation helpers', () => {
  it('normaliza limites Leaflet para bbox completo aceito pelo backend', () => {
    const bounds = boundsFromLeaflet({
      getNorth: () => -12,
      getSouth: () => -13,
      getEast: () => -38,
      getWest: () => -39,
    });
    expect(bounds).toEqual({ minLat: -13, maxLat: -12, minLng: -39, maxLng: -38 });
  });

  it('não permite coordenadas inválidas', () => {
    expect(validPoint({ lat: NaN, lng: 20 })).toBe(false);
    expect(validPoint({ lat: -91, lng: 20 })).toBe(false);
    expect(validPoint({ lat: -12.99, lng: -38.5 })).toBe(true);
    expect(formatCoords({ lat: -12.99, lng: -38.5 })).toBe('-12.990000, -38.500000');
  });

  it('colore os quatro status ativos', () => {
    expect(pinColor('RECEIVED')).toBe('#95A5A6');
    expect(pinColor('UNDER_ANALYSIS')).toBe('#F1C40F');
    expect(pinColor('CONFIRMED')).toBe('#3498DB');
    expect(pinColor('IN_SERVICE')).toBe('#E67E22');
  });
});
