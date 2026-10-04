import { preparePerfume } from './perfume.js';

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
