import { describe, it, expect } from 'vitest';
import { parseImport, planImport } from '../../src/lib/importer.js';
import { importId } from '../../src/lib/perfume.js';

const ok = { brand: 'Lattafa', name: 'Asad', concentration: 'edp', _changes: ['x'] };

describe('parseImport', () => {
  it('accepts an array', () => {
    const r = parseImport([ok]);
    expect(r.errors).toEqual([]);
    expect(r.items).toHaveLength(1);
    expect(r.items[0].brand).toBe('Lattafa');
    expect(r.items[0]).not.toHaveProperty('_changes');
  });
  it('accepts { perfumes: [...] }', () => {
    expect(parseImport({ perfumes: [ok] }).items).toHaveLength(1);
  });
  it('reports invalid entries with index and label', () => {
    const r = parseImport([ok, { brand: 'Armaf', concentration: 'edp' }]);
    expect(r.items).toHaveLength(1);
    expect(r.errors).toEqual([{ index: 1, label: 'Armaf', errors: ['Falta el nombre'] }]);
  });
  it('reports non-object entries as invalid and still imports valid ones', () => {
    const r = parseImport([null, ok, 5, []]);
    expect(r.items).toHaveLength(1);
    expect(r.errors).toEqual([
      { index: 0, label: '?', errors: ['Entrada inválida'] },
      { index: 2, label: '?', errors: ['Entrada inválida'] },
      { index: 3, label: '?', errors: ['Entrada inválida'] },
    ]);
  });
  it('rejects non-lists', () => {
    expect(parseImport({ foo: 1 }).errors[0].errors).toEqual(['Se esperaba una lista de perfumes']);
  });
});

describe('planImport', () => {
  const mk = (name, concentration = 'EDP') => ({ brand: 'Lattafa', name, concentration });
  it('splits into toAdd, existing and duplicates', () => {
    const existingIds = new Set([importId(mk('Asad'))]);
    const items = [mk('Asad'), mk('Khamrah'), mk('KHAMRAH'), mk('Yara')];
    const { toAdd, existing, duplicates } = planImport(items, existingIds);
    expect(toAdd).toEqual([items[1], items[3]]);
    expect(existing).toEqual([items[0]]);
    expect(duplicates).toEqual([items[2]]);
  });
  it('treats an item whose importId equals an existing doc id as existing, even if that doc changed', () => {
    const item = mk('Asad');
    const doc = { id: importId(item), brand: 'Lattafa', name: 'Asad Editado', concentration: 'EDP' };
    const ids = new Set([doc].flatMap((p) => [importId(p), p.id]));
    const { toAdd, existing } = planImport([item], ids);
    expect(toAdd).toEqual([]);
    expect(existing).toEqual([item]);
  });
  it('different concentration is not a duplicate', () => {
    const { toAdd, duplicates } = planImport([mk('A', 'EDP'), mk('A', 'EDT')], new Set());
    expect(toAdd).toHaveLength(2);
    expect(duplicates).toHaveLength(0);
  });
});
