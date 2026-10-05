import { esc } from '../lib/html.js';
import { CONCENTRATIONS, FAMILIES, SEASONS, OCCASIONS, TIMES, STATUSES, PRIORITIES } from '../lib/constants.js';
import { createPicker } from './picker.js';

const selectOptions = (list, sel, empty) =>
  (empty !== undefined ? `<option value="">${esc(empty)}</option>` : '')
  + list.map((o) => `<option value="${esc(o.value)}"${o.value === sel ? ' selected' : ''}>${esc(o.hint ? `${o.label} — ${o.hint}` : o.label)}</option>`).join('');
const toggles = (type, name, list, isOn) =>
  `<div class="check-chips">${list.map((o) => `<label class="cchip"><input type="${type}" name="${name}" value="${esc(o.value)}"${isOn(o.value) ? ' checked' : ''}><span>${esc(o.label)}</span></label>`).join('')}</div>`;

const group = (legend, inner) => `<fieldset class="field"><legend class="field-label">${legend}</legend>${inner}</fieldset>`;

export function perfumeFieldsHTML(p = {}, { collapsed = false } = {}) {
  const optional = `
    <div class="field"><span class="field-label">Dupe de</span><div class="dupes-edit"></div>
      <button type="button" class="btn btn-small" data-add-dupe>+ Agregar original</button></div>
    <div class="row-2">
      <label>Familia principal<select name="familyMain">${selectOptions(FAMILIES, p.familyMain, 'Sin definir')}</select></label>
      <label>Familia secundaria<select name="familySecondary">${selectOptions(FAMILIES, p.familySecondary, 'Ninguna')}</select></label>
    </div>
    <div class="field"><span class="field-label">Notas</span><div class="notes-picker"></div></div>
    ${group('Temporada', toggles('checkbox', 'seasons', SEASONS, (v) => (p.seasons ?? []).includes(v)))}
    ${group('Ocasión', toggles('checkbox', 'occasions', OCCASIONS, (v) => (p.occasions ?? []).includes(v)))}
    ${group('Momento', toggles('radio', 'timeOfDay', [{ value: '', label: 'Sin definir' }, ...TIMES], (v) => (p.timeOfDay ?? '') === v))}
    <div class="row-2">
      <label>Puntuación<select name="rating"><option value="">Sin puntuar</option>${
        Array.from({ length: 10 }, (_, i) => i + 1).map((n) => `<option value="${n}"${p.rating === n ? ' selected' : ''}>${n}</option>`).join('')
      }</select></label>
      <label class="check"><input type="checkbox" name="favorite"${p.favorite ? ' checked' : ''}> ⭐ Favorito</label>
    </div>
    <label>Prioridad (wishlist)<select name="priority">${selectOptions(PRIORITIES, p.priority, 'Sin prioridad')}</select></label>`;
  return `
    <div class="field"><span class="field-label">Marca *</span><div class="brand-picker"></div></div>
    <label>Nombre *<input name="name" value="${esc(p.name)}" autocomplete="off"></label>
    <div class="row-2">
      <label>Concentración *<select name="concentration">${selectOptions(CONCENTRATIONS, p.concentration, 'Elegir…')}</select></label>
      ${group('Estado', toggles('radio', 'status', STATUSES, (v) => (p.status ?? 'owned') === v))}
    </div>
    ${collapsed ? `<details class="more"><summary>Más datos (opcional)</summary>${optional}</details>` : optional}`;
}

export function mountPerfumeFields(form, p = {}, { brands, notes, onDirty: userDirty = () => {} }) {
  const onDirty = () => { form.dataset.dirty = '1'; userDirty(); };
  const brand = createPicker(form.querySelector('.brand-picker'), { options: brands, value: p.brand ?? '', placeholder: 'Buscar marca…', ariaLabel: 'Marca', focusKey: 'brand', onChange: onDirty });
  const notePicker = createPicker(form.querySelector('.notes-picker'), {
    options: notes, value: p.notes ?? [], multiple: true, placeholder: 'Buscar nota… (ej: vainilla)', ariaLabel: 'Notas', focusKey: 'notes', onChange: onDirty,
  });
  const dupeBox = form.querySelector('.dupes-edit');
  const dupeRows = [];
  const addDupeRow = (d = { brand: '', name: '' }) => {
    const row = document.createElement('div');
    row.className = 'dupe-row';
    row.innerHTML = `<div class="dupe-brand"></div><input class="dupe-name" data-focus-key="dupe-name-${dupeRows.length}" aria-label="Perfume original" placeholder="Perfume original" value="${esc(d.name)}" autocomplete="off"><button type="button" class="icon-btn" aria-label="Quitar original">✕</button>`;
    dupeBox.append(row);
    const entry = { row, brand: createPicker(row.querySelector('.dupe-brand'), { options: brands, value: d.brand, placeholder: 'Marca original', ariaLabel: 'Marca original', focusKey: `dupe-brand-${dupeRows.length}`, onChange: onDirty }) };
    dupeRows.push(entry);
    row.querySelector('.icon-btn').onclick = () => {
      row.remove();
      dupeRows.splice(dupeRows.indexOf(entry), 1);
      onDirty();
    };
    return entry;
  };
  (p.dupeOf ?? []).forEach((d) => addDupeRow(d));
  form.querySelector('[data-add-dupe]').onclick = () => {
    addDupeRow().brand.focus();
    onDirty();
  };
  form.addEventListener('input', onDirty);
  form.addEventListener('change', onDirty);

  const checked = (name) => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value);
  return {
    read() {
      const f = form.elements;
      return {
        brand: brand.value,
        name: f.namedItem('name').value,
        concentration: f.namedItem('concentration').value,
        status: checked('status')[0] ?? 'owned',
        dupeOf: dupeRows.map((r) => ({ brand: r.brand.value, name: r.row.querySelector('.dupe-name').value })),
        familyMain: f.namedItem('familyMain').value || null,
        familySecondary: f.namedItem('familySecondary').value || null,
        notes: notePicker.value,
        seasons: checked('seasons'),
        occasions: checked('occasions'),
        timeOfDay: checked('timeOfDay')[0] || null,
        rating: f.namedItem('rating').value,
        priority: f.namedItem('priority').value || null,
        favorite: f.namedItem('favorite').checked,
      };
    },
    focusBrand: () => brand.focus(),
  };
}
