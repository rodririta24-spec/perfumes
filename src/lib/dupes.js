import { perfumeKey } from './perfume.js';
import { cleanText, byBrandName } from './normalize.js';

const owned = (perfumes) => perfumes.filter((p) => p.status === 'owned');

// Índice clave(marca|nombre) → perfume de la colección (si hay varias concentraciones, gana el primero).
export function ownedIndex(perfumes) {
  const index = new Map();
  for (const p of owned(perfumes)) {
    const k = perfumeKey(p.brand, p.name);
    if (!index.has(k)) index.set(k, p);
  }
  return index;
}

export const findOriginal = (index, dupe) => index.get(perfumeKey(dupe.brand, dupe.name)) ?? null;

export function dupesOf(perfumes, original) {
  const key = perfumeKey(original.brand, original.name);
  return owned(perfumes)
    .filter((p) => p.id !== original.id && (p.dupeOf ?? []).some((d) => perfumeKey(d.brand, d.name) === key))
    .sort(byBrandName);
}

export function groupByOriginal(perfumes) {
  const index = ownedIndex(perfumes);
  const groups = new Map();
  for (const p of owned(perfumes)) {
    for (const d of p.dupeOf ?? []) {
      const key = perfumeKey(d.brand, d.name);
      if (!groups.has(key)) {
        const orig = index.get(key) ?? null;
        groups.set(key, { key, brand: orig?.brand ?? cleanText(d.brand), name: orig?.name ?? cleanText(d.name), owned: orig, dupes: [] });
      }
      const g = groups.get(key);
      if (!g.dupes.includes(p)) g.dupes.push(p);
    }
  }
  return [...groups.values()].map((g) => ({ ...g, dupes: [...g.dupes].sort(byBrandName) })).sort(byBrandName);
}
