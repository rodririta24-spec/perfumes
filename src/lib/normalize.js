// Clave de comparación: sin acentos, minúsculas, & = and, sin apóstrofes ni puntos, espacios colapsados.
export function normalize(s) {
  return String(s ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’`´.]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const cleanText = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

export const compareText = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), 'es', { sensitivity: 'base' });

export const byBrandName = (a, b) => compareText(a.brand, b.brand) || compareText(a.name, b.name);

// Sin duplicados (por normalize), conserva la primera grafía, ordenado alfabéticamente.
export function uniqueSorted(values) {
  const seen = new Map();
  for (const v of values) {
    const c = cleanText(v);
    if (!c) continue;
    const k = normalize(c);
    if (!seen.has(k)) seen.set(k, c);
  }
  return [...seen.values()].sort(compareText);
}
