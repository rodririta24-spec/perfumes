import { esc } from '../lib/html.js';
import { normalize } from '../lib/normalize.js';
import { groupByOriginal } from '../lib/dupes.js';

const link = (p, text) => `<a href="#/p/${encodeURIComponent(p.id)}">${esc(text)}</a>`;

export function renderDupes(view, api) {
  view.dataset.screen = 'dupes';
  const groups = groupByOriginal(api.perfumes);
  if (!groups.length) {
    view.innerHTML = '<p class="empty">Ningún perfume de tu colección tiene cargado «Dupe de».</p>';
    return;
  }
  view.innerHTML = `
    <p class="summary-line"><strong>${groups.length}</strong> originales cubiertos por tus dupes</p>
    <input type="search" id="dq" placeholder="Buscar original…" value="${esc(api.state.dupesQuery)}" autocomplete="off">
    <div class="dupe-groups">${groups.map((g) => `
      <section class="dgroup" data-key="${esc(normalize(`${g.brand} ${g.name}`))}">
        <h3>${g.owned ? `${link(g.owned, `${g.brand} - ${g.name}`)} <span class="badge">lo tenés</span>` : esc(`${g.brand} - ${g.name}`)}</h3>
        <ul>${g.dupes.map((p) => `<li>${link(p, `${p.brand} - ${p.name}`)}</li>`).join('')}</ul>
      </section>`).join('')}
    </div>`;
  const input = view.querySelector('#dq');
  const apply = () => {
    const q = normalize(input.value);
    api.state.dupesQuery = input.value;
    view.querySelectorAll('.dgroup').forEach((s) => { s.hidden = !!q && !s.dataset.key.includes(q); });
  };
  input.oninput = apply;
  apply();
}
