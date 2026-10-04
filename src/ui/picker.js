import { esc } from '../lib/html.js';
import { normalize, cleanText } from '../lib/normalize.js';
import { searchOptions } from '../lib/catalog.js';

// Combobox con buscador. single: un valor (marca). multiple: chips (notas).
// `options` es una función para leer siempre el catálogo actualizado.
export function createPicker(root, { options, value, multiple = false, placeholder = '', onChange = () => {} }) {
  let selected = multiple ? [...(value ?? [])] : cleanText(value);
  let items = [];
  let active = 0;
  root.classList.add('picker');
  root.innerHTML = `${multiple ? '<div class="picker-chips"></div>' : ''}
    <input type="text" class="picker-input" autocomplete="off" placeholder="${esc(placeholder)}">
    <ul class="picker-list" role="listbox" hidden></ul>`;
  const input = root.querySelector('.picker-input');
  const list = root.querySelector('.picker-list');
  const chips = root.querySelector('.picker-chips');

  const api = {
    get value() { return multiple ? [...selected] : selected; },
    focus: () => input.focus(),
  };

  const renderChips = () => {
    if (!chips) return;
    chips.innerHTML = selected.map((v, i) =>
      `<span class="chip">${esc(v)}<button type="button" class="chip-x" data-i="${i}" aria-label="Quitar ${esc(v)}">×</button></span>`).join('');
  };
  const renderList = () => {
    list.innerHTML = items.length
      ? items.map((it, i) => `<li role="option" data-i="${i}" class="${i === active ? 'active' : ''}${it.isNew ? ' new' : ''}">${esc(it.label)}</li>`).join('')
      : '<li class="none">Sin resultados</li>';
    list.querySelector('li.active')?.scrollIntoView({ block: 'nearest' });
  };
  const open = () => {
    const all = options();
    const taken = new Set(multiple ? selected.map(normalize) : []);
    items = searchOptions(all, input.value, 30).filter((o) => !taken.has(normalize(o))).map((o) => ({ value: o, label: o }));
    const typed = cleanText(input.value);
    if (typed && !taken.has(normalize(typed)) && !all.some((o) => normalize(o) === normalize(typed))) {
      items.push({ value: typed, label: `Agregar «${typed}»`, isNew: true });
    }
    active = 0;
    renderList();
    list.hidden = false;
  };
  const close = () => { list.hidden = true; };
  const choose = (it) => {
    if (!it) return;
    if (multiple) {
      selected.push(it.value);
      input.value = '';
      renderChips();
      open();
    } else {
      selected = it.value;
      input.value = it.value;
      close();
    }
    onChange(api.value);
  };
  // Single: lo escrito y no elegido se toma igual (con la grafía del catálogo si coincide).
  const commitTyped = () => {
    if (multiple) return;
    const typed = cleanText(input.value);
    const match = options().find((o) => normalize(o) === normalize(typed));
    const next = match ?? typed;
    if (next !== selected) {
      selected = next;
      onChange(api.value);
    }
    input.value = selected;
  };

  input.addEventListener('focus', open);
  input.addEventListener('input', open);
  input.addEventListener('blur', () => { close(); commitTyped(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (list.hidden) open();
      else if (items.length) {
        active = (active + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length;
        renderList();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!list.hidden && items.length) choose(items[active]);
      else commitTyped();
    } else if (e.key === 'Escape' && !list.hidden) {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === 'Backspace' && multiple && !input.value && selected.length) {
      selected.pop();
      renderChips();
      onChange(api.value);
    }
  });
  list.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const li = e.target.closest('li[data-i]');
    if (li) choose(items[Number(li.dataset.i)]);
  });
  chips?.addEventListener('click', (e) => {
    const x = e.target.closest('.chip-x');
    if (!x) return;
    selected.splice(Number(x.dataset.i), 1);
    renderChips();
    onChange(api.value);
  });

  if (!multiple) input.value = selected;
  renderChips();
  return api;
}
