import { describe, it, expect } from 'vitest';
import { similarity, wishlistWarnings } from '../../src/lib/similar.js';
import { collectionStats } from '../../src/lib/stats.js';

const owned = [
  { id: 'o', status: 'owned', brand: 'French Avenue', name: 'Obsidian', dupeOf: [{ brand: 'By Kilian', name: "Angels' Share On The Rocks" }], familyMain: 'oriental_ambar', notes: ['Coñac', 'Canela', 'Caramelo', 'Haba tonka'], seasons: ['invierno'], occasions: ['salida'] },
  { id: 'c', status: 'owned', brand: 'Creed', name: 'Aventus', familyMain: 'frutal', notes: ['Piña', 'Abedul'], seasons: ['todo_el_anio'], occasions: ['diario', 'salida'] },
  { id: 'w', status: 'wishlist', brand: 'X', name: 'Y', familyMain: 'gourmand' },
];

describe('similarity', () => {
  it('is 1 for identical notes and family, 0 for nothing in common', () => {
    expect(similarity(owned[0], owned[0])).toBeCloseTo(1);
    expect(similarity(owned[0], owned[1])).toBe(0);
  });
});

describe('wishlistWarnings', () => {
  it('warns when you own a dupe of it', () => {
    expect(wishlistWarnings(owned, { brand: 'by kilian', name: "Angels' Share On The Rocks" })[0]).toContain('Obsidian');
  });
  it('warns when you own the original it dupes', () => {
    expect(wishlistWarnings(owned, { brand: 'Armaf', name: 'Club', dupeOf: [{ brand: 'Creed', name: 'Aventus' }] })[0]).toContain('original');
  });
  it('warns about something similar by notes', () => {
    expect(wishlistWarnings(owned, { brand: 'Z', name: 'Z', familyMain: 'oriental_ambar', notes: ['Coñac', 'Canela', 'Caramelo'] })[0]).toContain('parecido');
  });
  it('no warnings for something new', () => {
    expect(wishlistWarnings(owned, { brand: 'Z', name: 'Z', familyMain: 'verde', notes: ['Té verde'] })).toEqual([]);
  });
});

describe('collectionStats', () => {
  it('counts only owned perfumes', () => {
    const s = collectionStats(owned);
    expect(s.total).toBe(2);
    expect(s.dupes).toBe(1);
    expect(s.originalsCovered).toBe(1);
    expect(s.byMood.find((m) => m.value === 'calido').count).toBe(1);
    expect(s.bySeason.find((m) => m.value === 'invierno').count).toBe(1);
    expect(s.byOccasion.find((m) => m.value === 'salida').count).toBe(2);
    expect(s.topBrands.map((b) => b.label)).toEqual(['Creed', 'French Avenue']);
    expect(s.topNotes).toHaveLength(6);
  });
});
