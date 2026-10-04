import { describe, it, expect } from 'vitest';
import { BRAND_SEED } from '../../src/seed/brands.js';
import { NOTE_SEED } from '../../src/seed/notes.js';
import { normalize, cleanText } from '../../src/lib/normalize.js';

// Marcas de la planilla "Mis perfumes" (ya corregidas) y de los originales que dupean.
const SHEET_BRANDS = [
  'Afnan', 'Al Haramain', 'Armaf', 'Azzaro', 'Borouj', 'Carolina Herrera', 'Dior', 'Dolce & Gabbana', 'Fragrance World',
  'French Avenue', 'Giorgio Armani', 'Givenchy', 'Guerlain', 'Gulf Orchid', 'Hugo Boss', 'Issey Miyake', 'Jean Paul Gaultier',
  'Lattafa', 'Maison Alhambra', 'Maison Asrar', 'Mancera', 'Mary Kay', 'Mast', 'Montblanc', 'Mykonos', 'Paco Rabanne',
  'Paris Corner', 'Prada', 'Ralph Lauren', 'Rasasi', 'Rayhaan', 'Tom Ford', 'Valentino', 'Versace', 'Viktor&Rolf',
  'Yves Saint Laurent', 'Zara',
];
const ORIGINAL_BRANDS = [
  'Amouage', 'Bond No. 9', 'Bottega Veneta', 'Bvlgari', 'By Kilian', 'Chanel', 'Clive Christian', 'Creed', 'Emporio Armani',
  'Ex Nihilo', 'Initio', 'Lorenzo Pazzaglia', 'Louis Vuitton', 'Maison Francis Kurkdjian', 'Maison Margiela', 'Montale',
  'Mugler', 'Nishane', 'Orto Parisi', 'Parfums de Marly', 'Room 1015', 'Stéphane Humbert Lucas', 'Xerjoff',
];

const keys = (list) => list.map(normalize);

describe('BRAND_SEED', () => {
  it('includes every brand from the sheet and the dupe originals', () => {
    const have = new Set(keys(BRAND_SEED));
    const missing = [...SHEET_BRANDS, ...ORIGINAL_BRANDS].filter((b) => !have.has(normalize(b)));
    expect(missing).toEqual([]);
  });
  it('has at least 600 clean, non-duplicated brands', () => {
    expect(BRAND_SEED.length).toBeGreaterThanOrEqual(600);
    expect(new Set(keys(BRAND_SEED)).size).toBe(BRAND_SEED.length);
    for (const b of BRAND_SEED) expect(b).toBe(cleanText(b));
  });
});

describe('NOTE_SEED', () => {
  it('has at least 120 clean, non-duplicated notes', () => {
    expect(NOTE_SEED.length).toBeGreaterThanOrEqual(120);
    expect(new Set(keys(NOTE_SEED)).size).toBe(NOTE_SEED.length);
  });
});
