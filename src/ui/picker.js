import { esc } from '../lib/html.js';
import { normalize, cleanText } from '../lib/normalize.js';
import { searchOptions } from '../lib/catalog.js';

let pickerCount = 0;

// Combobox con buscador. single: un valor (marca). multiple: chips (notas).
// `options` es una función para leer siempre el catálogo actualizado.
export function createPicker(root, { options, value, multiple = false, placeholder = '', ariaLabel = '', onChange = () => {} }) {
  let selected = multiple ? [...(value ?? [])] : cleanText(value);
  let items = [];
  let active = -1;
  const uid = `picker-${++pickerCount}`;
  root.classList.add('picker');
  root.innerHTML = `${multiple ? '<div class="picker-chips"></div>' : ''}
    <input type="text" class="picker-input" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${uid}-list" autocomplete="off" placeholder="${esc(placeholder)}"${ariaLabel ? ` aria-label="${esc(ariaLabel)}"` : ''}>
    <ul class="picker-list" id="${uid}-list" role="listbox" hidden></ul>`;
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
      ? items.map((it, i) => `<li role="option" id="${uid}-opt-${i}" aria-selected="${i === active}" data-i="${i}" class="${i === active ? 'active' : ''}${it.isNew ? ' new' : ''}">${esc(it.label)}</li>`).join('')
      : '<li class="none" role="presentation">Sin resultados</li>';
    const el = list.querySelector('li.active');
    if (el) {
      input.setAttribute('aria-activedescendant', el.id);
      if (el.offsetTop < list.scrollTop) list.scrollTop = el.offsetTop;
      else if (el.offsetTop + el.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = el.offsetTop + el.offsetHeight - list.clientHeight;
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  };
  const open = () => {
    const all = options();
    const taken = new Set(multiple ? selected.map(normalize) : []);
    items = searchOptions(all, input.value, 30).filter((o) => !taken.has(normalize(o))).map((o) => ({ value: o, label: o }));
    const typed = cleanText(input.value);
    if (typed && !taken.has(normalize(typed)) && !all.some((o) => normalize(o) === normalize(typed))) {
      items.push({ value: typed, label: `Agregar «${typed}»`, isNew: true });
    }
    active = typed && items.length ? 0 : -1;
    renderList();
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };
  const close = () => {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  };
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
  // Multiple: el texto pendiente se agrega como chip.
  const commitTyped = () => {
    const typed = cleanText(input.value);
    const match = options().find((o) => normalize(o) === normalize(typed));
    if (multiple) {
      input.value = '';
      if (!typed || selected.some((s) => normalize(s) === normalize(typed))) return;
      selected.push(match ?? typed);
      renderChips();
      onChange(api.value);
      return;
    }
    const next = match ?? typed;
    if (next !== selected) {
      selected = next;
      onChange(api.value);
    }
    input.value = selected;
  };

  input.addEventListener('focus', open);
  input.addEventListener('input', open);
  input.addEventListener('blur', (e) => {
    close();
    if (e.relatedTarget && root.contains(e.relatedTarget)) return;
    commitTyped();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (list.hidden) open();
      else if (items.length) {
        if (e.key === 'ArrowDown') active = (active + 1) % items.length;
        else active = active <= 0 ? items.length - 1 : active - 1;
        renderList();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!list.hidden && active >= 0 && items[active]) choose(items[active]);
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
