import { normalize } from './normalize.js';
import { perfumeKey } from './perfume.js';

// Similitud 0..1 entre dos perfumes: notas en común (Jaccard) + familias compartidas.
export function similarity(a, b) {
  const na = new Set((a.notes ?? []).map(normalize));
  const nb = new Set((b.notes ?? []).map(normalize));
  const inter = [...na].filter((n) => nb.has(n)).length;
  const union = new Set([...na, ...nb]).size;
  const notes = union ? inter / union : 0;
  const fa = [a.familyMain, a.familySecondary].filter(Boolean);
  const fb = new Set([b.familyMain, b.familySecondary].filter(Boolean));
  const fam = a.familyMain && a.familyMain === b.familyMain ? 1 : fa.some((f) => fb.has(f)) ? 0.5 : 0;
  return 0.7 * notes + 0.3 * fam;
}

const label = (p) => `${p.brand} ${p.name}`;

// Avisos al agregar algo a la wishlist: dupes que ya tenés, el original que ya tenés, o algo muy parecido.
export function wishlistWarnings(perfumes, data, threshold = 0.45) {
  const owned = perfumes.filter((p) => p.status === 'owned');
  const key = perfumeKey(data.brand, data.name);
  const out = [];
  for (const p of owned) {
    if ((p.dupeOf ?? []).some((d) => perfumeKey(d.brand, d.name) === key)) out.push(`Ya tenés ${label(p)}, que es dupe de este.`);
  }
  for (const d of data.dupeOf ?? []) {
    const orig = owned.find((p) => perfumeKey(p.brand, p.name) === perfumeKey(d.brand, d.name));
    if (orig) out.push(`Ya tenés el original: ${label(orig)}.`);
  }
  if (!out.length && (data.notes ?? []).length) {
    const best = owned
      .map((p) => ({ p, s: similarity(data, p) }))
      .filter((x) => x.s >= threshold)
      .sort((a, b) => b.s - a.s)
      .slice(0, 2);
    for (const { p } of best) out.push(`Tenés algo parecido: ${label(p)}.`);
  }
  return out;
}
