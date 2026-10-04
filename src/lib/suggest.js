import { moodOf } from './constants.js';

// Hemisferio sur: dic–feb verano, jun–ago invierno, resto entretiempo.
export function seasonFromDate(date) {
  const m = date.getMonth();
  if (m === 11 || m <= 1) return 'verano';
  if (m >= 5 && m <= 7) return 'invierno';
  return 'entretiempo';
}

export const climateFromTemp = (t) => (t > 25 ? 'hot' : t < 15 ? 'cold' : 'mild');
export const climateFromSeason = (s) => (s === 'verano' ? 'hot' : s === 'invierno' ? 'cold' : 'mild');
export const isDaytime = (hour) => hour >= 7 && hour < 19;

export function scorePerfume(p, { climate, occasion, daytime }) {
  let w = 1;
  const occasions = p.occasions ?? [];
  if (occasion) {
    if (occasions.length && !occasions.includes(occasion)) return 0;
    if (!occasions.length) w *= 0.4;
  }
  const mood = moodOf(p);
  const seasons = p.seasons ?? [];
  if (climate === 'hot') {
    if (mood === 'fresco') w *= 3;
    else if (mood === 'calido') w *= 0.3;
    if (seasons.includes('verano')) w *= 2;
  } else if (climate === 'cold') {
    if (mood === 'calido') w *= 3;
    else if (mood === 'fresco') w *= 0.3;
    if (seasons.includes('invierno')) w *= 2;
  } else if (seasons.includes('entretiempo')) {
    w *= 2;
  }
  if (seasons.includes('todo_el_anio')) w *= 1.5;
  if (p.timeOfDay) {
    const match = p.timeOfDay === 'ambos' || (p.timeOfDay === 'dia') === daytime;
    w *= match ? 1.5 : 0.5;
  }
  if (p.favorite) w *= 2;
  if (Number.isInteger(p.rating)) w *= 1 + (p.rating - 5) / 10;
  return w;
}

// Sorteo ponderado sin reposición.
export function weightedPick(items, weights, n, rng = Math.random) {
  const pool = items.map((item, i) => ({ item, w: weights[i] })).filter((x) => x.w > 0);
  const out = [];
  while (out.length < n && pool.length) {
    const total = pool.reduce((sum, x) => sum + x.w, 0);
    let r = rng() * total;
    let i = 0;
    for (; i < pool.length - 1; i++) {
      r -= pool[i].w;
      if (r < 0) break;
    }
    out.push(pool[i].item);
    pool.splice(i, 1);
  }
  return out;
}

export function suggest(perfumes, { exclude = new Set(), ...ctx }, rng = Math.random, n = 3) {
  const scored = perfumes
    .filter((p) => p.status === 'owned')
    .map((p) => ({ p, w: scorePerfume(p, ctx) }))
    .filter((x) => x.w > 0);
  const fresh = scored.filter((x) => !exclude.has(x.p.id));
  const first = weightedPick(fresh.map((x) => x.p), fresh.map((x) => x.w), n, rng);
  if (first.length >= n) return first;
  const rest = scored.filter((x) => !first.includes(x.p));
  return [...first, ...weightedPick(rest.map((x) => x.p), rest.map((x) => x.w), n - first.length, rng)];
}
