import { esc } from '../lib/html.js';
import { familyOf, CONCENTRATIONS, MOODS, PRIORITIES, moodOf } from '../lib/constants.js';

export function familyChip(value) {
  const f = familyOf(value);
  return f ? `<span class="fam-chip" style="--fam:${f.color}">${esc(f.label)}</span>` : '';
}
export const moodEmoji = (p) => MOODS.find((m) => m.value === moodOf(p))?.emoji ?? '';
export const concShort = (v) => CONCENTRATIONS.find((c) => c.value === v)?.short ?? '';
export const dupeText = (d) => `${d.brand} - ${d.name}`;

// Controles rápidos (sin abrir la ficha): favorito y puntuación.
export const favButton = (p) =>
  `<button type="button" class="icon-btn quick-fav" data-quick-fav aria-pressed="${!!p.favorite}" aria-label="Favorito" title="Favorito">${p.favorite ? '⭐' : '☆'}</button>`;
export const ratingSelect = (p) =>
  `<select class="quick-rate" data-quick-rate aria-label="Puntuación"><option value="">–</option>${
    Array.from({ length: 10 }, (_, i) => i + 1).map((n) => `<option value="${n}"${p.rating === n ? ' selected' : ''}>${n}</option>`).join('')}</select>`;
export const priorityBadge = (p) => {
  const pr = PRIORITIES.find((x) => x.value === p.priority);
  return pr ? `<span class="prio prio-${pr.value}">${esc(pr.label)}</span>` : '';
};

// Vista lista: tabla con columnas fijas.
export function perfumeTableHTML(rows, { actions = '', wishlist = false } = {}) {
  return `<table class="ptable">
    <thead><tr><th></th><th>Marca</th><th>Nombre</th><th class="col-conc">Conc.</th><th>Familia</th>${wishlist ? '<th>Prioridad</th>' : '<th class="col-rating">Punt.</th>'}<th class="col-dupe">Dupe de</th>${actions ? '<th></th>' : ''}</tr></thead>
    <tbody>${rows.map((p) => `<tr class="prow" data-id="${esc(p.id)}">
      <td class="col-fav">${favButton(p)}</td>
      <td class="col-brand">${esc(p.brand)}</td>
      <td><a href="#/p/${encodeURIComponent(p.id)}" class="pcard-link">${esc(p.name)}</a></td>
      <td class="col-conc">${esc(concShort(p.concentration))}</td>
      <td class="col-fam">${moodEmoji(p)} ${familyChip(p.familyMain)}</td>
      ${wishlist ? `<td>${priorityBadge(p)}</td>` : `<td class="col-rating">${ratingSelect(p)}</td>`}
      <td class="col-dupe">${esc((p.dupeOf ?? []).map(dupeText).join(' & '))}</td>
      ${actions ? `<td>${actions}</td>` : ''}
    </tr>`).join('')}</tbody>
  </table>`;
}

export function perfumeCardHTML(p, { actions = '' } = {}) {
  const mood = moodEmoji(p);
  return `<article class="pcard" data-id="${esc(p.id)}">
    <div class="pcard-top"><span class="pcard-brand">${esc(p.brand)}</span>${favButton(p)}</div>
    <h3 class="pcard-name"><a href="#/p/${encodeURIComponent(p.id)}" class="pcard-link">${esc(p.name)}</a> <span class="conc">${esc(concShort(p.concentration))}</span></h3>
    <div class="pcard-meta">${mood ? `<span>${mood}</span>` : ''}${familyChip(p.familyMain)}${p.rating ? `<span class="rating">${esc(p.rating)}/10</span>` : ''}${p.status === 'wishlist' ? priorityBadge(p) : ''}</div>
    ${(p.dupeOf ?? []).length ? `<p class="pcard-dupe">Dupe de ${esc(p.dupeOf.map(dupeText).join(' & '))}</p>` : ''}
    ${actions}
  </article>`;
}
