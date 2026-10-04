import { preparePerfume, importId } from './perfume.js';

// Ids ya presentes: por contenido (importId) y por id de documento (los cargados a mano tienen ids aleatorios).
export const existingImportIds = (perfumes) => new Set(perfumes.flatMap((p) => [importId(p), p.id]));

export function parseImport(json) {
  const list = Array.isArray(json) ? json : json?.perfumes;
  if (!Array.isArray(list)) return { items: [], errors: [{ index: -1, label: 'archivo', errors: ['Se esperaba una lista de perfumes'] }] };
  const items = [];
  const errors = [];
  list.forEach((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      errors.push({ index, label: '?', errors: ['Entrada inválida'] });
      return;
    }
    const { errors: e, data } = preparePerfume(raw);
    if (e.length) errors.push({ index, label: `${raw.brand ?? '?'} ${raw.name ?? ''}`.trim(), errors: e });
    else items.push(data);
  });
  return { items, errors };
}

// existingIds: Set con los ids ya presentes. Devuelve qué agregar, qué ya existe y qué se repite dentro del archivo.
export function planImport(items, existingIds) {
  const toAdd = [], existing = [], duplicates = [];
  const seen = new Set();
  for (const item of items) {
    const id = importId(item);
    if (seen.has(id)) { duplicates.push(item); continue; }
    seen.add(id);
    (existingIds.has(id) ? existing : toAdd).push(item);
  }
  return { toAdd, existing, duplicates };
}
