import { describe, it, expect } from 'vitest';
import { FAMILIES, MOODS, moodOf, familyOf, labelOf, SEASONS } from '../../src/lib/constants.js';

describe('moodOf', () => {
  it('derives mood from familyMain', () => {
    expect(moodOf({ familyMain: 'citrico' })).toBe('fresco');
    expect(moodOf({ familyMain: 'acuatico' })).toBe('fresco');
    expect(moodOf({ familyMain: 'gourmand' })).toBe('calido');
    expect(moodOf({ familyMain: 'cuero_tabaco' })).toBe('calido');
    expect(moodOf({ familyMain: 'frutal' })).toBe('floral');
    expect(moodOf({ familyMain: 'amaderado' })).toBe('amaderado');
  });
  it('null without family', () => {
    expect(moodOf({})).toBeNull();
  });
});

describe('catalog integrity', () => {
  it('has 12 families, each with a known mood and a color', () => {
    const moods = new Set(MOODS.map((m) => m.value));
    expect(FAMILIES).toHaveLength(12);
    for (const f of FAMILIES) {
      expect(moods.has(f.mood)).toBe(true);
      expect(f.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
  it('familyOf and labelOf', () => {
    expect(familyOf('gourmand').label).toBe('Gourmand');
    expect(familyOf('nada')).toBeNull();
    expect(labelOf(SEASONS, 'todo_el_anio')).toBe('Todo el año');
    expect(labelOf(SEASONS, 'x')).toBe('');
  });
});
