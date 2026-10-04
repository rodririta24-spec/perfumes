import { esc } from '../lib/html.js';
import { MOODS, SEASONS, OCCASIONS, FAMILIES, CONCENTRATIONS } from '../lib/constants.js';
import { EMPTY_FILTERS, filterPerfumes, sortPerfumes, summarize } from '../lib/filters.js';
import { uniqueSorted, normalize } from '../lib/normalize.js';
import { perfumeCardHTML } from './card.js';
import { toast, errorMessage } from './dom.js';

const SORTS = [
  { value: 'brand', label: 'Marca' },
  { value: 'name', label: 'Nombre' },
  { value: 'rating', label: 'Puntuación' },
];
const options = (list, sel, empty) =>
  `<option value="">${esc(empty)}</option>` + list.map((o) => `<option value="${esc(o.value)}"${o.value === sel ? ' selected' : ''}>${esc(o.label)}</option>`).join('');
const plain = (values) => values.map((v) => ({ value: v, label: v }));
// Si el valor activo no está entre las opciones (p. ej. cambió la lista), se agrega para que siga visible y se pueda quitar.
function withActive(values, current) {
  if (!current) return { list: values, current };
  const hit = values.find((v) => normalize(v) === normalize(current));
  return hit ? { list: values, current: hit } : { list: [...values, current], current };
}

function toolbarHTML(mode, vs, perfumes) {
  const f = vs.filters;
  const brands = uniqueSorted(perfumes.map((p) => p.brand));
  const notes = uniqueSorted(perfumes.flatMap((p) => p.notes ?? []));
  const b = withActive(brands, f.brand);
  const n = withActive(notes, f.note);
  f.brand = b.current ?? f.brand;
  f.note = n.current ?? f.note;
  return `
    <section class="toolbar">
      <input type="search" name="q" aria-label="Buscar" placeholder="Buscar marca, nombre, nota o dupe…" value="${esc(f.q)}" autocomplete="off">
      <div class="chips-row">
        ${MOODS.map((m) => `<button type="button" class="fchip${f.mood === m.value ? ' active' : ''}" aria-pressed="${f.mood === m.value}" data-k="mood" data-v="${m.value}">${m.emoji} ${esc(m.label)}</button>`).join('')}
        <button type="button" class="fchip${f.favorites ? ' active' : ''}" aria-pressed="${!!f.favorites}" data-k="favorites">⭐ Favoritos</button>
        ${mode === 'owned' ? `<button type="button" class="fchip${f.onlyDupes ? ' active' : ''}" aria-pressed="${!!f.onlyDupes}" data-k="onlyDupes">🔁 Solo dupes</button>` : ''}
        <select name="season" class="fchip-select${f.season ? ' active' : ''}" aria-label="Temporada">${options(SEASONS, f.season, 'Temporada')}</select>
        <select name="occasion" class="fchip-select${f.occasion ? ' active' : ''}" aria-label="Ocasión">${options(OCCASIONS, f.occasion, 'Ocasión')}</select>
      </div>
      <details class="adv"${vs.advOpen ? ' open' : ''}>
        <summary>Más filtros y orden</summary>
        <div class="adv-grid">
          <label>Marca<select name="brand">${options(plain(b.list), f.brand, 'Todas')}</select></label>
          <label>Familia<select name="family">${options(FAMILIES, f.family, 'Todas')}</select></label>
          <label>Concentración<select name="concentration">${options(CONCENTRATIONS, f.concentration, 'Todas')}</select></label>
          <label>Nota<select name="note">${options(plain(n.list), f.note, 'Todas')}</select></label>
          <label>Ordenar por<select name="sort">${SORTS.map((s) => `<option value="${s.value}"${vs.sort === s.value ? ' selected' : ''}>${s.label}</option>`).join('')}</select></label>
          <button type="button" class="btn btn-ghost" data-act="clear">Limpiar filtros</button>
        </div>
      </details>
    </section>
    <div class="summary-row">
      <p class="summary-line" id="summary" aria-live="polite"></p>
      <div class="view-toggle" role="group" aria-label="Vista">
        <button type="button" class="icon-btn" data-layout="grid" aria-label="Ver como tarjetas" title="Tarjetas">▦</button>
        <button type="button" class="icon-btn" data-layout="list" aria-label="Ver como lista" title="Lista">☰</button>
      </div>
    </div>
    <section class="grid${getLayout() === 'list' ? ' list' : ''}" id="results"></section>`;
}

// Preferencia de vista (tarjetas/lista) por navegador.
function getLayout() {
  try { return localStorage.getItem('layout') === 'list' ? 'list' : 'grid'; } catch { return 'grid'; }
}

function applyLayout(view, layout) {
  try { localStorage.setItem('layout', layout); } catch { /* storage bloqueado */ }
  view.querySelector('#results').classList.toggle('list', layout === 'list');
  view.querySelectorAll('[data-layout]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.layout === layout)));
}

export function renderCollection(view, api, mode, { fromData = false } = {}) {
  const vs = api.state.views[mode];
  const toolbar = view.querySelector('.toolbar');
  // Con datos nuevos se conserva la barra si el usuario está escribiendo o eligiendo en ella.
  const keepToolbar = fromData && view.dataset.screen === mode && toolbar?.contains(document.activeElement);
  if (!keepToolbar) {
    view.dataset.screen = mode;
    view.innerHTML = toolbarHTML(mode, vs, api.perfumes.filter((p) => p.status === mode));
    bind(view, api, mode);
  }
  renderResults(view, api, mode);
}

function bind(view, api, mode) {
  const vs = api.state.views[mode];
  const tb = view.querySelector('.toolbar');
  const set = (patch) => {
    Object.assign(vs.filters, patch);
    syncChips(tb, vs.filters);
    renderResults(view, api, mode);
  };
  tb.querySelector('input[name="q"]').addEventListener('input', (e) => set({ q: e.target.value }));
  tb.addEventListener('change', (e) => {
    const { name, value } = e.target;
    if (!name || name === 'q') return;
    if (name === 'sort') {
      vs.sort = value;
      renderResults(view, api, mode);
    } else {
      set({ [name]: value });
    }
  });
  tb.addEventListener('click', (e) => {
    const chip = e.target.closest('.fchip[data-k]');
    if (chip) {
      const k = chip.dataset.k;
      set(k === 'mood' ? { mood: vs.filters.mood === chip.dataset.v ? '' : chip.dataset.v } : { [k]: !vs.filters[k] });
      return;
    }
    if (e.target.closest('[data-act="clear"]')) {
      vs.filters = { ...EMPTY_FILTERS };
      vs.sort = 'brand';
      view.dataset.screen = '';
      renderCollection(view, api, mode);
    }
  });
  tb.querySelector('details').addEventListener('toggle', (e) => { vs.advOpen = e.target.open; });

  view.querySelector('.view-toggle').addEventListener('click', (e) => {
    const b = e.target.closest('[data-layout]');
    if (b) applyLayout(view, b.dataset.layout);
  });
  applyLayout(view, getLayout());

  const results = view.querySelector('#results');
  const openCard = (card) => api.go(`#/p/${encodeURIComponent(card.dataset.id)}`);
  results.addEventListener('click', (e) => {
    const card = e.target.closest('.pcard');
    if (!card) return;
    const bought = e.target.closest('[data-bought]');
    if (bought) {
      bought.disabled = true;
      api.backend.patchPerfume(card.dataset.id, { status: 'owned' })
        .then(() => toast('¡Pasó a tu colección!', 'success'))
        .catch((x) => { bought.disabled = false; toast(errorMessage(x), 'error'); });
      return;
    }
    if (e.target.closest('a')) return;
    openCard(card);
  });
}

function syncChips(tb, f) {
  tb.querySelectorAll('.fchip[data-k]').forEach((b) => {
    const k = b.dataset.k;
    const on = k === 'mood' ? f.mood === b.dataset.v : !!f[k];
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', String(on));
  });
  tb.querySelectorAll('.fchip-select').forEach((s) => s.classList.toggle('active', !!s.value));
}

function renderResults(view, api, mode) {
  const vs = api.state.views[mode];
  const all = api.perfumes.filter((p) => p.status === mode);
  const rows = sortPerfumes(filterPerfumes(all, vs.filters), vs.sort);
  const s = summarize(all);
  view.querySelector('#summary').innerHTML =
    `<strong>${s.total}</strong> ${mode === 'owned' ? 'perfumes' : 'en la wishlist'}`
    + MOODS.map((m) => (s.byMood[m.value] ? ` · ${m.emoji} ${s.byMood[m.value]}` : '')).join('')
    + (s.noFamily ? ` · ${s.noFamily} sin familia` : '')
    + (rows.length !== all.length ? ` — mostrando ${rows.length}` : '');
  const res = view.querySelector('#results');
  if (!all.length) {
    res.innerHTML = `<p class="empty">${mode === 'owned' ? 'Todavía no cargaste perfumes. Tocá <strong>+ Agregar</strong>.' : 'Tu wishlist está vacía. Agregá uno con estado «La quiero».'}</p>`;
    return;
  }
  if (!rows.length) {
    res.innerHTML = '<p class="empty">Ningún perfume coincide con los filtros.</p>';
    return;
  }
  const actions = mode === 'wishlist' ? '<button type="button" class="btn btn-small btn-primary" data-bought>¡Lo compré!</button>' : '';
  res.innerHTML = rows.map((p) => perfumeCardHTML(p, { actions })).join('');
}
