import { describe, it, expect } from 'vitest';
import { parseImport } from '../../src/lib/importer.js';

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
