import { describe, it, expect } from 'vitest';
import { normalize, cleanText, uniqueSorted } from '../../src/lib/normalize.js';

describe('normalize', () => {
  it('lowercases, trims and collapses spaces', () => {
    expect(normalize('  Maison  Francis Kurkdjian ')).toBe('maison francis kurkdjian');
  });
  it('strips accents', () => {
    expect(normalize('Altaïr')).toBe('altair');
    expect(normalize('Stéphane Humbert Lucas')).toBe('stephane humbert lucas');
  });
  it('ignores apostrophes and dots', () => {
    expect(normalize("Angel's Share")).toBe('angels share');
    expect(normalize('Angel’s Share')).toBe('angels share');
    expect(normalize('Bond No.9')).toBe('bond no9');
  });
  it('treats & as and', () => {
    expect(normalize('Viktor&Rolf')).toBe('viktor and rolf');
    expect(normalize('Dolce & Gabbana')).toBe('dolce and gabbana');
  });
  it('handles null', () => {
    expect(normalize(null)).toBe('');
  });
});

describe('cleanText', () => {
  it('trims and collapses spaces', () => {
    expect(cleanText('  a   b ')).toBe('a b');
    expect(cleanText(undefined)).toBe('');
  });
});

describe('uniqueSorted', () => {
  it('dedupes by normalized value keeping first spelling, sorted', () => {
    expect(uniqueSorted(['Lattafa', 'lattafa ', 'Armaf', '', 'Ármaf'])).toEqual(['Armaf', 'Lattafa']);
  });
});
