import { esc } from '../lib/html.js';
import { normalize } from '../lib/normalize.js';
import { groupByOriginal } from '../lib/dupes.js';

const link = (p, text) => `<a href="#/p/${encodeURIComponent(p.id)}">${esc(text)}</a>`;

const groupsHTML = (groups) => groups.map((g) => `
  <section class="dgroup" data-key="${esc(normalize(`${g.brand} ${g.name}`))}">
    <h3>${g.owned ? `${link(g.owned, `${g.brand} - ${g.name}`)} <span class="badge">lo tenés</span>` : esc(`${g.brand} - ${g.name}`)}</h3>
    <ul>${g.dupes.map((p) => `<li>${link(p, `${p.brand} - ${p.name}`)}</li>`).join('')}</ul>
  </section>`).join('');

export function renderDupes(view, api, { fromData = false } = {}) {
  const groups = groupByOriginal(api.perfumes);
  if (!groups.length) {
    view.dataset.screen = 'dupes';
    view.innerHTML = '<p class="empty">Ningún perfume de tu colección tiene cargado «Dupe de».</p>';
    return;
  }
  // Con datos nuevos se conserva el buscador (y su foco) y solo se rehacen los grupos.
  const keepInput = fromData && view.dataset.screen === 'dupes' && view.querySelector('#dq');
  if (!keepInput) {
    view.dataset.screen = 'dupes';
    view.innerHTML = `
      <p class="summary-line" id="dcount" aria-live="polite"></p>
      <input type="search" id="dq" aria-label="Buscar original" placeholder="Buscar original…" value="${esc(api.state.dupesQuery)}" autocomplete="off">
      <div class="dupe-groups" id="dgroups"></div>
      <p class="empty" id="dnone" hidden>Sin resultados</p>`;
  }
  const input = view.querySelector('#dq');
  view.querySelector('#dgroups').innerHTML = groupsHTML(groups);
  const apply = () => {
    const q = normalize(input.value);
    api.state.dupesQuery = input.value;
    let visible = 0;
    view.querySelectorAll('.dgroup').forEach((s) => {
      s.hidden = !!q && !s.dataset.key.includes(q);
      if (!s.hidden) visible++;
    });
    view.querySelector('#dnone').hidden = visible > 0;
    view.querySelector('#dcount').innerHTML = q
      ? `<strong>${visible}</strong> de <strong>${groups.length}</strong> originales`
      : `<strong>${groups.length}</strong> originales cubiertos por tus dupes`;
  };
  input.oninput = apply;
  apply();
}
