import { describe, it, expect } from 'vitest';
import { brandOptions, noteOptions, searchOptions } from '../../src/lib/catalog.js';

describe('brandOptions', () => {
  it('merges seed, perfume brands and dupeOf brands, deduped and sorted', () => {
    const perfumes = [{ brand: 'lattafa', dupeOf: [{ brand: 'Creed', name: 'Aventus' }] }, { brand: 'Nueva Marca' }];
    expect(brandOptions(['Lattafa', 'Armaf'], perfumes)).toEqual(['Armaf', 'Creed', 'Lattafa', 'Nueva Marca']);
  });
});

describe('noteOptions', () => {
  it('merges seed with notes used in perfumes', () => {
    expect(noteOptions(['Vainilla'], [{ notes: ['vainilla', 'Café'] }, {}])).toEqual(['Café', 'Vainilla']);
  });
});

describe('searchOptions', () => {
  const opts = ['Al Haramain', 'Armaf', 'Armani', 'Lattafa', 'Maison Alhambra'];
  it('empty query returns the first N', () => {
    expect(searchOptions(opts, '', 2)).toEqual(['Al Haramain', 'Armaf']);
  });
  it('prefix matches first, then word starts, then contains', () => {
    expect(searchOptions(opts, 'al')).toEqual(['Al Haramain', 'Maison Alhambra']);
    expect(searchOptions(opts, 'arm')).toEqual(['Armaf', 'Armani']);
    expect(searchOptions(opts, 'ttaf')).toEqual(['Lattafa']);
  });
  it('is accent-insensitive', () => {
    expect(searchOptions(['Café', 'Cacao'], 'cafe')).toEqual(['Café']);
  });
});
