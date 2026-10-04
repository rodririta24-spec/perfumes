import { esc } from '../lib/html.js';
import { familyOf, CONCENTRATIONS, MOODS, moodOf } from '../lib/constants.js';

export function familyChip(value) {
  const f = familyOf(value);
  return f ? `<span class="fam-chip" style="--fam:${f.color}">${esc(f.label)}</span>` : '';
}
export const moodEmoji = (p) => MOODS.find((m) => m.value === moodOf(p))?.emoji ?? '';
export const concShort = (v) => CONCENTRATIONS.find((c) => c.value === v)?.short ?? '';
export const dupeText = (d) => `${d.brand} - ${d.name}`;

export function perfumeCardHTML(p, { actions = '' } = {}) {
  const mood = moodEmoji(p);
  return `<article class="pcard" data-id="${esc(p.id)}" tabindex="0">
    <div class="pcard-top"><span class="pcard-brand">${esc(p.brand)}</span>${p.favorite ? '<span title="Favorito">⭐</span>' : ''}</div>
    <h3 class="pcard-name">${esc(p.name)} <span class="conc">${esc(concShort(p.concentration))}</span></h3>
    <div class="pcard-meta">${mood ? `<span>${mood}</span>` : ''}${familyChip(p.familyMain)}${p.rating ? `<span class="rating">${esc(p.rating)}/10</span>` : ''}</div>
    ${(p.dupeOf ?? []).length ? `<p class="pcard-dupe">Dupe de ${esc(p.dupeOf.map(dupeText).join(' & '))}</p>` : ''}
    ${actions}
  </article>`;
}
