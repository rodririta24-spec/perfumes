import { MOODS, FAMILIES, SEASONS, OCCASIONS, moodOf } from './constants.js';
import { normalize, uniqueSorted } from './normalize.js';
import { groupByOriginal } from './dupes.js';

const countBy = (list, keyOf) => {
  const m = new Map();
  for (const x of list) for (const k of [].concat(keyOf(x) ?? [])) m.set(k, (m.get(k) ?? 0) + 1);
  return m;
};
const fromCatalog = (catalog, counts) => catalog.map((o) => ({ label: o.label, value: o.value, count: counts.get(o.value) ?? 0 }));
const top = (counts, n) => [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es')).slice(0, n).map(([label, count]) => ({ label, count }));

// Estadísticas de la colección (solo perfumes que tenés).
export function collectionStats(perfumes) {
  const owned = perfumes.filter((p) => p.status === 'owned');
  // Notas y marcas se cuentan por grafía normalizada, mostrando la primera grafía vista.
  const spelling = new Map(uniqueSorted(owned.flatMap((p) => [...(p.notes ?? []), p.brand])).map((s) => [normalize(s), s]));
  const named = (counts) => new Map([...counts].map(([k, v]) => [spelling.get(k) ?? k, v]));
  return {
    total: owned.length,
    dupes: owned.filter((p) => (p.dupeOf ?? []).length).length,
    originalsCovered: groupByOriginal(owned).length,
    byMood: fromCatalog(MOODS, countBy(owned, moodOf)),
    byFamily: fromCatalog(FAMILIES, countBy(owned, (p) => p.familyMain)),
    bySeason: fromCatalog(SEASONS, countBy(owned, (p) => p.seasons)),
    byOccasion: fromCatalog(OCCASIONS, countBy(owned, (p) => p.occasions)),
    topBrands: top(named(countBy(owned, (p) => normalize(p.brand))), 10),
    topNotes: top(named(countBy(owned, (p) => (p.notes ?? []).map(normalize))), 12),
  };
}
