import { MOODS, moodOf } from './constants.js';
import { normalize, compareText, byBrandName } from './normalize.js';

export const EMPTY_FILTERS = {
  q: '', mood: '', season: '', occasion: '', favorites: false, onlyDupes: false,
  brand: '', family: '', concentration: '', note: '',
};

function matchesQuery(p, q) {
  const words = normalize(q).split(' ').filter(Boolean);
  if (!words.length) return true;
  const hay = normalize([
    p.brand, p.name, ...(p.notes ?? []),
    ...(p.dupeOf ?? []).flatMap((d) => [d.brand, d.name]),
  ].join(' | '));
  return words.every((w) => hay.includes(w));
}

export function filterPerfumes(perfumes, f) {
  return perfumes.filter((p) =>
    matchesQuery(p, f.q)
    && (!f.mood || moodOf(p) === f.mood)
    && (!f.season || (p.seasons ?? []).includes(f.season))
    && (!f.occasion || (p.occasions ?? []).includes(f.occasion))
    && (!f.favorites || p.favorite === true)
    && (!f.onlyDupes || (p.dupeOf ?? []).length > 0)
    && (!f.brand || normalize(p.brand) === normalize(f.brand))
    && (!f.family || p.familyMain === f.family || p.familySecondary === f.family)
    && (!f.concentration || p.concentration === f.concentration)
    && (!f.note || (p.notes ?? []).some((n) => normalize(n) === normalize(f.note))));
}

const SORTS = {
  brand: byBrandName,
  name: (a, b) => compareText(a.name, b.name) || compareText(a.brand, b.brand),
  rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || byBrandName(a, b),
};

export const sortPerfumes = (list, key) => [...list].sort(SORTS[key] ?? SORTS.brand);

export function summarize(perfumes) {
  const byMood = Object.fromEntries(MOODS.map((m) => [m.value, 0]));
  let noFamily = 0;
  for (const p of perfumes) {
    const m = moodOf(p);
    if (m) byMood[m] += 1;
    else noFamily += 1;
  }
  return { total: perfumes.length, byMood, noFamily };
}
