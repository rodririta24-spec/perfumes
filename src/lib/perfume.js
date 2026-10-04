import { CONCENTRATIONS, FAMILIES, SEASONS, OCCASIONS, TIMES } from './constants.js';
import { cleanText, normalize } from './normalize.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const has = (list, v) => list.some((o) => o.value === v);
// Filtra a valores válidos, sin repetidos, en el orden del catálogo.
const pickMany = (list, values) => list.filter((o) => arr(values).includes(o.value)).map((o) => o.value);

function parseRating(v) {
  if (typeof v !== 'number' && typeof v !== 'string') return null;
  const n = v === '' ? NaN : Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 10 ? n : null;
}

function cleanNotes(notes) {
  const seen = new Set();
  const out = [];
  for (const n of arr(notes)) {
    if (typeof n !== 'string') continue;
    const c = cleanText(n);
    const k = normalize(c);
    if (!c || seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}

export function preparePerfume(input) {
  const errors = [];
  const brand = cleanText(input.brand);
  const name = cleanText(input.name);
  if (!brand) errors.push('Falta la marca');
  if (!name) errors.push('Falta el nombre');
  if (!has(CONCENTRATIONS, input.concentration)) errors.push('Elegí la concentración');
  const familyMain = has(FAMILIES, input.familyMain) ? input.familyMain : null;
  const secondary = has(FAMILIES, input.familySecondary) ? input.familySecondary : null;
  const data = {
    brand,
    name,
    concentration: has(CONCENTRATIONS, input.concentration) ? input.concentration : null,
    status: input.status === 'wishlist' ? 'wishlist' : 'owned',
    dupeOf: arr(input.dupeOf)
      .filter((d) => d && typeof d === 'object')
      .map((d) => ({ brand: cleanText(d.brand), name: cleanText(d.name) }))
      .filter((d) => d.brand && d.name),
    familyMain,
    familySecondary: secondary === familyMain ? null : secondary,
    notes: cleanNotes(input.notes),
    seasons: pickMany(SEASONS, input.seasons),
    occasions: pickMany(OCCASIONS, input.occasions),
    timeOfDay: has(TIMES, input.timeOfDay) ? input.timeOfDay : null,
    rating: parseRating(input.rating),
    favorite: input.favorite === true,
  };
  // Orden de compra: solo se incluye si viene (así una edición no lo pisa con null).
  if (isOrder(input.addedAt)) data.addedAt = input.addedAt;
  return { errors, data };
}

export const perfumeKey = (brand, name) => `${normalize(brand)}|${normalize(name)}`;

export const importId = (p) => 'imp_' + encodeURIComponent(`${perfumeKey(p.brand, p.name)}|${p.concentration}`);

const isOrder = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

// Errores de un cambio parcial permitido (favorite, status y addedAt).
export function validPatch(patch) {
  if (!patch || typeof patch !== 'object') return ['Cambio no permitido'];
  const keys = Object.keys(patch);
  if (!keys.length) return ['Cambio vacío'];
  const errors = [];
  for (const k of keys) {
    if (k === 'favorite') { if (typeof patch.favorite !== 'boolean') errors.push('favorite debe ser booleano'); }
    else if (k === 'status') { if (patch.status !== 'owned' && patch.status !== 'wishlist') errors.push('status inválido'); }
    else if (k === 'addedAt') { if (!isOrder(patch.addedAt)) errors.push('addedAt inválido'); }
    else errors.push(`Cambio no permitido: ${k}`);
  }
  return errors;
}

export function findDuplicate(perfumes, data, exceptId = null) {
  const key = perfumeKey(data.brand, data.name);
  return perfumes.find((p) => p.id !== exceptId && p.concentration === data.concentration && perfumeKey(p.brand, p.name) === key) ?? null;
}

// Fragrantica no permite armar el link directo sin el id numérico: DuckDuckGo con "\" salta al primer resultado.
export const fragranticaUrl = (p) =>
  'https://duckduckgo.com/?q=' + encodeURIComponent(`\\site:fragrantica.com ${p.brand} ${p.name}`);
