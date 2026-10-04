import { describe, it, expect } from 'vitest';
import { weatherLabel } from '../../src/lib/weather.js';

describe('weatherLabel', () => {
  it('maps WMO codes', () => {
    expect(weatherLabel(0).label).toBe('Despejado');
    expect(weatherLabel(2).label).toBe('Parcialmente nublado');
    expect(weatherLabel(3).label).toBe('Nublado');
    expect(weatherLabel(45).label).toBe('Niebla');
    expect(weatherLabel(53).label).toBe('Llovizna');
    expect(weatherLabel(63).label).toBe('Lluvia');
    expect(weatherLabel(81).label).toBe('Lluvia');
    expect(weatherLabel(73).label).toBe('Nieve');
    expect(weatherLabel(95).label).toBe('Tormenta');
    expect(weatherLabel(999).label).toBe('Tormenta');
    expect(weatherLabel(20).label).toBe('Clima');
  });
});
