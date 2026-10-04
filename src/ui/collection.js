import { esc } from '../lib/html.js';
import { MOODS, SEASONS, OCCASIONS, FAMILIES, CONCENTRATIONS } from '../lib/constants.js';
import { EMPTY_FILTERS, filterPerfumes, sortPerfumes, summarize } from '../lib/filters.js';
import { uniqueSorted } from '../lib/normalize.js';
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

function toolbarHTML(mode, vs, perfumes) {
  const f = vs.filters;
  const brands = uniqueSorted(perfumes.map((p) => p.brand));
  const notes = uniqueSorted(perfumes.flatMap((p) => p.notes ?? []));
  return `
    <section class="toolbar">
      <input type="search" name="q" placeholder="Buscar marca, nombre, nota o dupe…" value="${esc(f.q)}" autocomplete="off">
      <div class="chips-row">
        ${MOODS.map((m) => `<button type="button" class="fchip${f.mood === m.value ? ' active' : ''}" data-k="mood" data-v="${m.value}">${m.emoji} ${esc(m.label)}</button>`).join('')}
        <button type="button" class="fchip${f.favorites ? ' active' : ''}" data-k="favorites">⭐ Favoritos</button>
        ${mode === 'owned' ? `<button type="button" class="fchip${f.onlyDupes ? ' active' : ''}" data-k="onlyDupes">🔁 Solo dupes</button>` : ''}
        <select name="season" class="fchip-select${f.season ? ' active' : ''}" aria-label="Temporada">${options(SEASONS, f.season, 'Temporada')}</select>
        <select name="occasion" class="fchip-select${f.occasion ? ' active' : ''}" aria-label="Ocasión">${options(OCCASIONS, f.occasion, 'Ocasión')}</select>
      </div>
      <details class="adv"${vs.advOpen ? ' open' : ''}>
        <summary>Más filtros y orden</summary>
        <div class="adv-grid">
          <label>Marca<select name="brand">${options(plain(brands), f.brand, 'Todas')}</select></label>
          <label>Familia<select name="family">${options(FAMILIES, f.family, 'Todas')}</select></label>
          <label>Concentración<select name="concentration">${options(CONCENTRATIONS, f.concentration, 'Todas')}</select></label>
          <label>Nota<select name="note">${options(plain(notes), f.note, 'Todas')}</select></label>
          <label>Ordenar por<select name="sort">${SORTS.map((s) => `<option value="${s.value}"${vs.sort === s.value ? ' selected' : ''}>${s.label}</option>`).join('')}</select></label>
          <button type="button" class="btn btn-ghost" data-act="clear">Limpiar filtros</button>
        </div>
      </details>
    </section>
    <p class="summary-line" id="summary"></p>
    <section class="grid" id="results"></section>`;
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

  const results = view.querySelector('#results');
  const openCard = (card) => api.go(`#/p/${encodeURIComponent(card.dataset.id)}`);
  results.addEventListener('click', (e) => {
    const card = e.target.closest('.pcard');
    if (!card) return;
    if (e.target.closest('[data-bought]')) {
      api.backend.patchPerfume(card.dataset.id, { status: 'owned' }).catch((x) => toast(errorMessage(x), 'error'));
      toast('¡Pasó a tu colección!', 'success');
      return;
    }
    openCard(card);
  });
  results.addEventListener('keydown', (e) => {
    const card = e.target.closest('.pcard');
    if (card && e.key === 'Enter' && e.target === card) openCard(card);
  });
}

function syncChips(tb, f) {
  tb.querySelectorAll('.fchip[data-k]').forEach((b) => {
    const k = b.dataset.k;
    b.classList.toggle('active', k === 'mood' ? f.mood === b.dataset.v : !!f[k]);
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
