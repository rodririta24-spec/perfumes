import { describe, it, expect } from 'vitest';
import { EMPTY_FILTERS, filterPerfumes, sortPerfumes, summarize } from '../../src/lib/filters.js';

const P = [
  { id: '1', status: 'owned', brand: 'Lattafa', name: 'Khamrah Qahwa', concentration: 'edp', familyMain: 'gourmand', familySecondary: 'especiado', notes: ['Café', 'Canela'], seasons: ['invierno'], occasions: ['cita'], favorite: true, rating: 9, dupeOf: [{ brand: 'By Kilian', name: "Angels' Share" }] },
  { id: '2', status: 'owned', brand: 'Rasasi', name: 'Hawas Ice', concentration: 'edp', familyMain: 'acuatico', familySecondary: null, notes: ['Manzana'], seasons: ['verano'], occasions: ['diario'], favorite: false, rating: null, dupeOf: [] },
  { id: '3', status: 'owned', brand: 'Armaf', name: 'Odyssey Homme', concentration: 'parfum', familyMain: null, familySecondary: null, notes: [], seasons: [], occasions: [], favorite: false, rating: 6, dupeOf: [] },
];
const F = (patch) => ({ ...EMPTY_FILTERS, ...patch });
const ids = (list) => list.map((p) => p.id);

describe('filterPerfumes', () => {
  it('no filters returns all', () => {
    expect(ids(filterPerfumes(P, F({})))).toEqual(['1', '2', '3']);
  });
  it('search covers name, brand, notes and dupeOf, accent-insensitive, multi-word', () => {
    expect(ids(filterPerfumes(P, F({ q: 'cafe' })))).toEqual(['1']);
    expect(ids(filterPerfumes(P, F({ q: 'angels share' })))).toEqual(['1']);
    expect(ids(filterPerfumes(P, F({ q: 'kilian' })))).toEqual(['1']);
    expect(ids(filterPerfumes(P, F({ q: 'hawas' })))).toEqual(['2']);
    expect(ids(filterPerfumes(P, F({ q: 'lattafa qahwa' })))).toEqual(['1']);
  });
  it('mood, season, occasion, favorites, onlyDupes', () => {
    expect(ids(filterPerfumes(P, F({ mood: 'fresco' })))).toEqual(['2']);
    expect(ids(filterPerfumes(P, F({ mood: 'calido' })))).toEqual(['1']);
    expect(ids(filterPerfumes(P, F({ season: 'verano' })))).toEqual(['2']);
    expect(ids(filterPerfumes(P, F({ occasion: 'cita' })))).toEqual(['1']);
    expect(ids(filterPerfumes(P, F({ favorites: true })))).toEqual(['1']);
    expect(ids(filterPerfumes(P, F({ onlyDupes: true })))).toEqual(['1']);
  });
  it('brand, family (main or secondary), concentration, note', () => {
    expect(ids(filterPerfumes(P, F({ brand: 'armaf' })))).toEqual(['3']);
    expect(ids(filterPerfumes(P, F({ family: 'especiado' })))).toEqual(['1']);
    expect(ids(filterPerfumes(P, F({ concentration: 'parfum' })))).toEqual(['3']);
    expect(ids(filterPerfumes(P, F({ note: 'canela' })))).toEqual(['1']);
  });
});

describe('sortPerfumes', () => {
  it('by brand, name and rating (desc, empty last); does not mutate', () => {
    const copy = [...P];
    expect(ids(sortPerfumes(P, 'brand'))).toEqual(['3', '1', '2']);
    expect(ids(sortPerfumes(P, 'name'))).toEqual(['2', '1', '3']);
    expect(ids(sortPerfumes(P, 'rating'))).toEqual(['1', '3', '2']);
    expect(P).toEqual(copy);
  });
});

describe('summarize', () => {
  it('counts total, by mood and without family', () => {
    expect(summarize(P)).toEqual({ total: 3, byMood: { fresco: 1, calido: 1, floral: 0, amaderado: 0 }, noFamily: 1 });
  });
});
