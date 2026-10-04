import { esc } from '../lib/html.js';
import { familyOf, CONCENTRATIONS, MOODS, moodOf } from '../lib/constants.js';

export function familyChip(value) {
  const f = familyOf(value);
  return f ? `<span class="fam-chip" style="--fam:${f.color}">${esc(f.label)}</span>` : '';
}
export const moodEmoji = (p) => MOODS.find((m) => m.value === moodOf(p))?.emoji ?? '';
export const concShort = (v) => CONCENTRATIONS.find((c) => c.value === v)?.short ?? '';
export const dupeText = (d) => `${d.brand} - ${d.name}`;

// Vista lista: tabla con columnas fijas.
export function perfumeTableHTML(rows, { actions = '' } = {}) {
  return `<table class="ptable">
    <thead><tr><th>Marca</th><th>Nombre</th><th class="col-conc">Conc.</th><th>Familia</th><th class="col-rating">Punt.</th><th class="col-dupe">Dupe de</th>${actions ? '<th></th>' : ''}</tr></thead>
    <tbody>${rows.map((p) => `<tr class="prow" data-id="${esc(p.id)}">
      <td class="col-brand">${esc(p.brand)}</td>
      <td><a href="#/p/${encodeURIComponent(p.id)}" class="pcard-link">${esc(p.name)}</a>${p.favorite ? ' <span title="Favorito">⭐</span>' : ''}</td>
      <td class="col-conc">${esc(concShort(p.concentration))}</td>
      <td class="col-fam">${moodEmoji(p)} ${familyChip(p.familyMain)}</td>
      <td class="col-rating">${p.rating ? `${esc(p.rating)}/10` : ''}</td>
      <td class="col-dupe">${esc((p.dupeOf ?? []).map(dupeText).join(' & '))}</td>
      ${actions ? `<td>${actions}</td>` : ''}
    </tr>`).join('')}</tbody>
  </table>`;
}

export function perfumeCardHTML(p, { actions = '' } = {}) {
  const mood = moodEmoji(p);
  return `<article class="pcard" data-id="${esc(p.id)}">
    <div class="pcard-top"><span class="pcard-brand">${esc(p.brand)}</span>${p.favorite ? '<span title="Favorito">⭐</span>' : ''}</div>
    <h3 class="pcard-name"><a href="#/p/${encodeURIComponent(p.id)}" class="pcard-link">${esc(p.name)}</a> <span class="conc">${esc(concShort(p.concentration))}</span></h3>
    <div class="pcard-meta">${mood ? `<span>${mood}</span>` : ''}${familyChip(p.familyMain)}${p.rating ? `<span class="rating">${esc(p.rating)}/10</span>` : ''}</div>
    ${(p.dupeOf ?? []).length ? `<p class="pcard-dupe">Dupe de ${esc(p.dupeOf.map(dupeText).join(' & '))}</p>` : ''}
    ${actions}
  </article>`;
}
