import { normalize, uniqueSorted } from './normalize.js';

export const brandOptions = (seed, perfumes) => uniqueSorted([
  ...seed,
  ...perfumes.map((p) => p.brand),
  ...perfumes.flatMap((p) => (p.dupeOf ?? []).map((d) => d.brand)),
]);

export const noteOptions = (seed, perfumes) => uniqueSorted([...seed, ...perfumes.flatMap((p) => p.notes ?? [])]);

export function searchOptions(options, q, limit = 50) {
  const n = normalize(q);
  if (!n) return options.slice(0, limit);
  const prefix = [];
  const word = [];
  const inside = [];
  for (const o of options) {
    const k = normalize(o);
    if (k.startsWith(n)) prefix.push(o);
    else if (k.includes(` ${n}`)) word.push(o);
    else if (k.includes(n)) inside.push(o);
  }
  return [...prefix, ...word, ...inside].slice(0, limit);
}
