import { describe, it, expect } from 'vitest';
import { seasonFromDate, climateFromTemp, climateFromSeason, isDaytime, scorePerfume, weightedPick, suggest } from '../../src/lib/suggest.js';

const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };
const ctx = { climate: 'mild', occasion: 'diario', daytime: true };
const s = (p, c = {}) => scorePerfume({ occasions: ['diario'], ...p }, { ...ctx, ...c });

describe('season and climate', () => {
  it('southern hemisphere seasons by month', () => {
    expect(seasonFromDate(new Date(2026, 0, 15))).toBe('verano');
    expect(seasonFromDate(new Date(2026, 11, 1))).toBe('verano');
    expect(seasonFromDate(new Date(2026, 6, 1))).toBe('invierno');
    expect(seasonFromDate(new Date(2026, 3, 1))).toBe('entretiempo');
    expect(seasonFromDate(new Date(2026, 9, 4))).toBe('entretiempo');
  });
  it('climate thresholds: >25 hot, <15 cold', () => {
    expect(climateFromTemp(30)).toBe('hot');
    expect(climateFromTemp(25)).toBe('mild');
    expect(climateFromTemp(15)).toBe('mild');
    expect(climateFromTemp(14.9)).toBe('cold');
  });
  it('climate from season', () => {
    expect(climateFromSeason('verano')).toBe('hot');
    expect(climateFromSeason('invierno')).toBe('cold');
    expect(climateFromSeason('entretiempo')).toBe('mild');
  });
  it('daytime is 7 to 19', () => {
    expect(isDaytime(7)).toBe(true);
    expect(isDaytime(18)).toBe(true);
    expect(isDaytime(19)).toBe(false);
    expect(isDaytime(3)).toBe(false);
  });
});

describe('scorePerfume', () => {
  it('occasion: excluded if set and not matching, reduced if empty', () => {
    expect(scorePerfume({ occasions: ['cita'] }, ctx)).toBe(0);
    expect(scorePerfume({}, ctx)).toBeCloseTo(0.4);
    expect(s({})).toBe(1);
  });
  it('hot favors fresh, penalizes warm', () => {
    expect(s({ familyMain: 'citrico' }, { climate: 'hot' })).toBe(3);
    expect(s({ familyMain: 'gourmand' }, { climate: 'hot' })).toBeCloseTo(0.3);
    expect(s({ familyMain: 'citrico', seasons: ['verano'] }, { climate: 'hot' })).toBe(6);
  });
  it('cold favors warm + winter', () => {
    expect(s({ familyMain: 'gourmand', seasons: ['invierno'] }, { climate: 'cold' })).toBe(6);
    expect(s({ familyMain: 'acuatico' }, { climate: 'cold' })).toBeCloseTo(0.3);
  });
  it('mild favors entretiempo; todo el año always helps', () => {
    expect(s({ seasons: ['entretiempo'] })).toBe(2);
    expect(s({ seasons: ['todo_el_anio'] })).toBe(1.5);
  });
  it('time of day', () => {
    expect(s({ timeOfDay: 'noche' })).toBe(0.5);
    expect(s({ timeOfDay: 'dia' })).toBe(1.5);
    expect(s({ timeOfDay: 'ambos' })).toBe(1.5);
    expect(s({ timeOfDay: 'noche' }, { daytime: false })).toBe(1.5);
  });
  it('favorite and rating', () => {
    expect(s({ favorite: true })).toBe(2);
    expect(s({ rating: 10 })).toBeCloseTo(1.5);
    expect(s({ rating: 1 })).toBeCloseTo(0.6);
  });
});

describe('weightedPick', () => {
  it('picks by weight without repetition', () => {
    expect(weightedPick(['a', 'b', 'c'], [1, 1, 2], 3, seq([0.99, 0, 0]))).toEqual(['c', 'a', 'b']);
  });
  it('never picks zero weights and returns fewer if not enough', () => {
    expect(weightedPick(['a', 'b', 'c'], [0, 1, 0], 3, seq([0.5]))).toEqual(['b']);
  });
});

describe('suggest', () => {
  const list = ['a', 'b', 'c', 'd'].map((id) => ({ id, status: 'owned', occasions: ['diario'] }))
    .concat({ id: 'w', status: 'wishlist', occasions: ['diario'] });
  it('returns 3 distinct owned perfumes', () => {
    const r = suggest(list, ctx, seq([0.1, 0.5, 0.9])).map((p) => p.id);
    expect(r).toHaveLength(3);
    expect(new Set(r).size).toBe(3);
    expect(r).not.toContain('w');
  });
  it('avoids excluded ones and fills from them only if needed', () => {
    const r = suggest(list, { ...ctx, exclude: new Set(['a', 'b', 'c']) }, seq([0])).map((p) => p.id);
    expect(r[0]).toBe('d');
    expect(r).toHaveLength(3);
  });
  it('empty collection gives no suggestions', () => {
    expect(suggest([], ctx)).toEqual([]);
  });
});
