import { describe, it, expect } from 'vitest';
import { ownedIndex, findOriginal, dupesOf, groupByOriginal } from '../../src/lib/dupes.js';

const perfumes = [
  { id: 'inv', status: 'owned', brand: 'Paco Rabanne', name: 'Invictus Aqua' },
  { id: 'hi', status: 'owned', brand: 'Rasasi', name: 'Hawas Ice', dupeOf: [{ brand: 'paco rabanne', name: 'Invictus  Aqua' }] },
  { id: 'ue', status: 'owned', brand: 'Armaf', name: 'Club de Nuit Urban Elixir', dupeOf: [{ brand: 'Creed', name: 'Aventus' }, { brand: 'Dior', name: 'Sauvage' }] },
  { id: 'ss', status: 'owned', brand: 'Afnan', name: 'Supremacy Silver', dupeOf: [{ brand: 'Creed', name: 'Aventus' }] },
  { id: 'wl', status: 'wishlist', brand: 'Creed', name: 'Aventus' },
  { id: 'wd', status: 'wishlist', brand: 'X', name: 'Y', dupeOf: [{ brand: 'Creed', name: 'Aventus' }] },
];
const ids = (list) => list.map((p) => p.id);

describe('findOriginal', () => {
  const index = ownedIndex(perfumes);
  it('finds an owned original ignoring case and spaces', () => {
    expect(findOriginal(index, { brand: 'PACO RABANNE', name: 'invictus aqua' }).id).toBe('inv');
  });
  it('wishlist perfumes are not originals you own', () => {
    expect(findOriginal(index, { brand: 'Creed', name: 'Aventus' })).toBeNull();
  });
});

describe('dupesOf', () => {
  it('lists owned dupes of a perfume', () => {
    expect(ids(dupesOf(perfumes, perfumes[0]))).toEqual(['hi']);
  });
  it('works for a wishlist original, only owned dupes, sorted by brand', () => {
    expect(ids(dupesOf(perfumes, perfumes[4]))).toEqual(['ss', 'ue']);
  });
});

describe('groupByOriginal', () => {
  it('groups owned dupes by original, sorted, using owned spelling when available', () => {
    const groups = groupByOriginal(perfumes);
    expect(groups.map((g) => [g.brand, g.name, g.owned?.id ?? null, ids(g.dupes)])).toEqual([
      ['Creed', 'Aventus', null, ['ss', 'ue']],
      ['Dior', 'Sauvage', null, ['ue']],
      ['Paco Rabanne', 'Invictus Aqua', 'inv', ['hi']],
    ]);
  });
});
