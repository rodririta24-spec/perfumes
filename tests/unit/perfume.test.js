import { describe, it, expect } from 'vitest';
import { preparePerfume, perfumeKey, findDuplicate, fragranticaUrl } from '../../src/lib/perfume.js';

const base = { brand: ' Lattafa ', name: 'Khamrah  Qahwa', concentration: 'edp' };

describe('preparePerfume', () => {
  it('requires brand, name and concentration', () => {
    expect(preparePerfume({}).errors).toEqual(['Falta la marca', 'Falta el nombre', 'Elegí la concentración']);
  });
  it('cleans text and applies defaults', () => {
    const { errors, data } = preparePerfume(base);
    expect(errors).toEqual([]);
    expect(data).toEqual({
      brand: 'Lattafa', name: 'Khamrah Qahwa', concentration: 'edp', status: 'owned', dupeOf: [],
      familyMain: null, familySecondary: null, notes: [], seasons: [], occasions: [],
      timeOfDay: null, rating: null, favorite: false,
    });
  });
  it('keeps valid enums, drops invalid ones, dedupes', () => {
    const { data } = preparePerfume({
      ...base, status: 'wishlist', familyMain: 'gourmand', familySecondary: 'gourmand',
      seasons: ['invierno', 'invierno', 'otoño'], occasions: ['cita', 'x'], timeOfDay: 'noche',
    });
    expect(data.status).toBe('wishlist');
    expect(data.familyMain).toBe('gourmand');
    expect(data.familySecondary).toBeNull();
    expect(data.seasons).toEqual(['invierno']);
    expect(data.occasions).toEqual(['cita']);
    expect(data.timeOfDay).toBe('noche');
  });
  it('orders multi-select values like the catalog', () => {
    expect(preparePerfume({ ...base, seasons: ['todo_el_anio', 'verano'] }).data.seasons).toEqual(['verano', 'todo_el_anio']);
  });
  it('parses rating 1-10 and ignores the rest', () => {
    expect(preparePerfume({ ...base, rating: '9' }).data.rating).toBe(9);
    expect(preparePerfume({ ...base, rating: '' }).data.rating).toBeNull();
    expect(preparePerfume({ ...base, rating: 11 }).data.rating).toBeNull();
    expect(preparePerfume({ ...base, rating: 7.5 }).data.rating).toBeNull();
  });
  it('cleans dupeOf and drops incomplete entries', () => {
    const { data } = preparePerfume({ ...base, dupeOf: [{ brand: ' By Kilian ', name: "Angels' Share" }, { brand: 'Creed', name: '' }] });
    expect(data.dupeOf).toEqual([{ brand: 'By Kilian', name: "Angels' Share" }]);
  });
  it('dedupes notes ignoring case/accents and keeps order', () => {
    expect(preparePerfume({ ...base, notes: ['Café', 'cafe', ' Vainilla ', ''] }).data.notes).toEqual(['Café', 'Vainilla']);
  });
  it('malformed list fields become [] without throwing', () => {
    for (const bad of ['x', 5, true, {}, null]) {
      const { data } = preparePerfume({ ...base, dupeOf: bad, seasons: bad, occasions: bad, notes: bad });
      expect(data.dupeOf).toEqual([]);
      expect(data.seasons).toEqual([]);
      expect(data.occasions).toEqual([]);
      expect(data.notes).toEqual([]);
    }
    expect(preparePerfume({ ...base, seasons: 'todo_el_anio verano' }).data.seasons).toEqual([]);
  });
  it('skips non-string notes and non-object dupeOf items', () => {
    expect(preparePerfume({ ...base, notes: ['Café', 5, null, {}] }).data.notes).toEqual(['Café']);
    expect(preparePerfume({ ...base, dupeOf: ['x', 5, null, { brand: 'A', name: 'B' }] }).data.dupeOf).toEqual([{ brand: 'A', name: 'B' }]);
  });
  it('rating only accepts numbers or strings', () => {
    expect(preparePerfume({ ...base, rating: true }).data.rating).toBeNull();
  });
  it('ignores unknown fields like _changes', () => {
    expect(preparePerfume({ ...base, _changes: ['x'] }).data).not.toHaveProperty('_changes');
  });
});

describe('perfumeKey / findDuplicate', () => {
  const list = [{ id: 'a', brand: 'Dolce & Gabbana', name: 'The One', concentration: 'edp' }];
  it('key ignores case, accents and &', () => {
    expect(perfumeKey('dolce and gabbana', 'THE ONE')).toBe(perfumeKey('Dolce & Gabbana', 'The One'));
  });
  it('same brand+name+concentration is a duplicate', () => {
    expect(findDuplicate(list, { brand: 'dolce and gabbana', name: 'the one', concentration: 'edp' })?.id).toBe('a');
  });
  it('different concentration is not', () => {
    expect(findDuplicate(list, { brand: 'Dolce & Gabbana', name: 'The One', concentration: 'parfum' })).toBeNull();
  });
  it('ignores the perfume being edited', () => {
    expect(findDuplicate(list, list[0], 'a')).toBeNull();
  });
});

describe('fragranticaUrl', () => {
  it('uses DuckDuckGo "\\" to jump to the first fragrantica result', () => {
    expect(fragranticaUrl({ brand: 'Lattafa', name: 'Khamrah' }))
      .toBe('https://duckduckgo.com/?q=' + encodeURIComponent('\\site:fragrantica.com Lattafa Khamrah'));
  });
});
