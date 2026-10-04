import { esc } from '../lib/html.js';
import { preparePerfume, findDuplicate, fragranticaUrl } from '../lib/perfume.js';
import { ownedIndex, findOriginal, dupesOf } from '../lib/dupes.js';
import { labelOf, CONCENTRATIONS } from '../lib/constants.js';
import { familyChip, moodEmoji, concShort, dupeText } from './card.js';
import { perfumeFieldsHTML, mountPerfumeFields } from './form.js';
import { toast, errorMessage } from './dom.js';

const link = (p, text) => `<a href="#/p/${encodeURIComponent(p.id)}">${esc(text)}</a>`;

export function renderDetail(view, api, id, { fromData = false } = {}) {
  // No pisar una edición en curso cuando llegan datos nuevos.
  if (fromData && view.dataset.screen === `p:${id}` && view.querySelector('form')?.dataset.dirty === '1') return;
  view.dataset.screen = `p:${id}`;
  const p = api.byId(id);
  if (!p) {
    view.innerHTML = '<div class="empty"><p>No se encontró este perfume.</p><a class="btn" href="#/coleccion">Volver a la colección</a></div>';
    return;
  }
  const index = ownedIndex(api.perfumes);
  const originals = (p.dupeOf ?? []).map((d) => ({ d, owned: findOriginal(index, d) }));
  const myDupes = dupesOf(api.perfumes, p);
  const listHash = p.status === 'wishlist' ? '#/wishlist' : '#/coleccion';

  view.innerHTML = `
    <div class="detail">
      <a href="${listHash}" class="back">← Volver</a>
      <header class="detail-head">
        <div>
          <span class="pcard-brand">${esc(p.brand)}</span>
          <h2>${esc(p.name)} <span class="conc">${esc(concShort(p.concentration))}</span></h2>
          <div class="pcard-meta">${moodEmoji(p)} ${familyChip(p.familyMain)} ${familyChip(p.familySecondary)}</div>
        </div>
        <button type="button" class="icon-btn fav-toggle" data-fav aria-pressed="${!!p.favorite}" title="Favorito">${p.favorite ? '⭐' : '☆'}</button>
      </header>
      <div class="detail-actions">
        <a class="btn" href="${esc(fragranticaUrl(p))}" target="_blank" rel="noopener">Ver en Fragrantica ↗</a>
        ${p.status === 'wishlist' ? '<button type="button" class="btn btn-primary" data-bought>¡Lo compré!</button>' : ''}
      </div>
      ${originals.length ? `<section class="links"><h3>Dupe de</h3><ul>${originals.map(({ d, owned }) =>
        `<li>${owned ? `${link(owned, dupeText(d))} <span class="badge">lo tenés</span>` : esc(dupeText(d))}</li>`).join('')}</ul></section>` : ''}
      ${myDupes.length ? `<section class="links"><h3>Tus dupes de este</h3><ul>${myDupes.map((x) =>
        `<li>${link(x, `${x.brand} - ${x.name}`)}</li>`).join('')}</ul></section>` : ''}
      <form class="pform" novalidate>
        ${perfumeFieldsHTML(p)}
        <p class="form-error" hidden></p>
        <div class="form-actions sticky-actions">
          <button type="button" class="btn btn-danger" data-delete>Eliminar</button>
          <button type="submit" class="btn btn-primary" disabled>Guardar cambios</button>
        </div>
      </form>
    </div>`;

  const form = view.querySelector('form');
  const saveBtn = form.querySelector('[type="submit"]');
  const errorEl = form.querySelector('.form-error');
  const fields = mountPerfumeFields(form, p, {
    brands: api.brands,
    notes: api.notes,
    onDirty: () => { saveBtn.disabled = false; },
  });

  form.onsubmit = (e) => {
    e.preventDefault();
    const input = fields.read();
    const { errors, data } = preparePerfume(input);
    if (errors.length) {
      errorEl.textContent = errors.join('. ');
      errorEl.hidden = false;
      return;
    }
    const dup = findDuplicate(api.perfumes, data, p.id);
    if (dup && !confirm(`Ya tenés ${dup.brand} ${dup.name} (${labelOf(CONCENTRATIONS, dup.concentration)}). ¿Guardar igual?`)) return;
    errorEl.hidden = true;
    delete form.dataset.dirty;
    saveBtn.disabled = true;
    api.backend.updatePerfume(p.id, input)
      .catch((x) => toast(errorMessage(x), 'error'));
    toast('Cambios guardados', 'success');
  };

  view.querySelector('[data-fav]').onclick = (e) => {
    const btn = e.currentTarget;
    const box = form.elements.namedItem('favorite');
    box.checked = !box.checked;
    btn.textContent = box.checked ? '⭐' : '☆';
    btn.setAttribute('aria-pressed', String(box.checked));
    api.backend.patchPerfume(p.id, { favorite: box.checked }).catch((x) => toast(errorMessage(x), 'error'));
  };

  const bought = view.querySelector('[data-bought]');
  if (bought) {
    bought.onclick = () => {
      bought.disabled = true;
      api.backend.patchPerfume(p.id, { status: 'owned' })
        .then(() => toast('¡Pasó a tu colección!', 'success'))
        .catch((x) => { bought.disabled = false; toast(errorMessage(x), 'error'); });
    };
  }

  view.querySelector('[data-delete]').onclick = () => {
    if (!confirm(`¿Eliminar ${p.brand} ${p.name}?`)) return;
    delete form.dataset.dirty;
    api.backend.removePerfume(p.id).catch((x) => toast(errorMessage(x), 'error'));
    toast('Perfume eliminado', 'success');
    api.go(listHash);
  };
}
