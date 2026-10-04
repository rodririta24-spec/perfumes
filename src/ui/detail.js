import { esc } from '../lib/html.js';
import { preparePerfume, findDuplicate, fragranticaUrl } from '../lib/perfume.js';
import { ownedIndex, findOriginal, dupesOf } from '../lib/dupes.js';
import { labelOf, CONCENTRATIONS } from '../lib/constants.js';
import { familyChip, moodEmoji, concShort, dupeText } from './card.js';
import { perfumeFieldsHTML, mountPerfumeFields } from './form.js';
import { toast, errorMessage } from './dom.js';

const link = (p, text) => `<a href="#/p/${encodeURIComponent(p.id)}">${esc(text)}</a>`;

const signature = (p) => JSON.stringify(Object.fromEntries(Object.entries(p).filter(([k]) => k !== 'createdAt' && k !== 'updatedAt')));

// draft: datos preparados de un guardado que falló; se vuelven a mostrar como edición pendiente.
export function renderDetail(view, api, id, { fromData = false, draft = null } = {}) {
  const p = api.byId(id);
  const same = view.dataset.screen === `p:${id}`;
  let focusKey = null;
  if (fromData && same) {
    // No pisar una edición en curso cuando llegan datos nuevos.
    if (view.querySelector('form')?.dataset.dirty === '1') return;
    const active = document.activeElement;
    if (p && active && view.querySelector('.detail')?.contains(active)) {
      if (view.dataset.sig === signature(p)) return;
      focusKey = ['id', 'name', 'data-fav', 'data-bought', 'data-delete'].filter((a) => active.hasAttribute(a)).map((a) => [a, active.getAttribute(a)])[0] ?? null;
    }
  }
  view.dataset.screen = `p:${id}`;
  if (!p) {
    delete view.dataset.sig;
    view.innerHTML = '<div class="empty"><p>No se encontró este perfume.</p><a class="btn" href="#/coleccion">Volver a la colección</a></div>';
    return;
  }
  const index = ownedIndex(api.perfumes);
  const originals = (p.dupeOf ?? []).map((d) => ({ d, owned: findOriginal(index, d) }));
  const myDupes = dupesOf(api.perfumes, p);
  view.dataset.sig = signature(p);
  const shown = draft ? { ...p, ...draft } : p;
  let listHash = p.status === 'wishlist' ? '#/wishlist' : '#/coleccion';

  view.innerHTML = `
    <div class="detail">
      <a href="${listHash}" class="back">← Volver</a>
      <header class="detail-head">
        <div>
          <span class="pcard-brand">${esc(p.brand)}</span>
          <h2>${esc(p.name)} <span class="conc">${esc(concShort(p.concentration))}</span></h2>
          <div class="pcard-meta">${moodEmoji(p)} ${familyChip(p.familyMain)} ${familyChip(p.familySecondary)}</div>
        </div>
        <button type="button" class="icon-btn fav-toggle" data-fav aria-label="Favorito" aria-pressed="${!!p.favorite}" title="Favorito"><span aria-hidden="true">${p.favorite ? '⭐' : '☆'}</span></button>
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
        ${perfumeFieldsHTML(shown)}
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
  const fields = mountPerfumeFields(form, shown, {
    brands: api.brands,
    notes: api.notes,
    onDirty: () => { saveBtn.disabled = false; },
  });
  if (draft) {
    form.dataset.dirty = '1';
    saveBtn.disabled = false;
  }
  const favBtn = view.querySelector('[data-fav]');
  const favBox = form.elements.namedItem('favorite');
  const showFav = (on) => {
    favBtn.firstElementChild.textContent = on ? '⭐' : '☆';
    favBtn.setAttribute('aria-pressed', String(on));
  };
  showFav(favBox.checked);
  form.addEventListener('change', (e) => { if (e.target === favBox) showFav(favBox.checked); });

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
      .catch((x) => {
        toast(errorMessage(x), 'error');
        if (view.dataset.screen === `p:${id}`) renderDetail(view, api, id, { draft: data });
      });
    toast('Cambios guardados', 'success');
  };

  favBtn.onclick = () => {
    const on = !favBox.checked;
    favBox.checked = on;
    showFav(on);
    api.backend.patchPerfume(p.id, { favorite: on }).catch((x) => {
      favBox.checked = !on;
      showFav(!on);
      toast(errorMessage(x), 'error');
    });
  };

  const bought = view.querySelector('[data-bought]');
  if (bought) {
    bought.onclick = () => {
      bought.disabled = true;
      api.backend.patchPerfume(p.id, { status: 'owned' })
        .then(() => {
          const radio = form.querySelector('input[name="status"][value="owned"]');
          if (radio) radio.checked = true;
          bought.hidden = true;
          listHash = '#/coleccion';
          view.querySelector('.back').setAttribute('href', listHash);
          toast('¡Pasó a tu colección!', 'success');
        })
        .catch((x) => { bought.disabled = false; toast(errorMessage(x), 'error'); });
    };
  }

  view.querySelector('[data-delete]').onclick = () => {
    if (!confirm(`¿Eliminar ${p.brand} ${p.name}?`)) return;
    delete form.dataset.dirty;
    // Primero se navega y recién después se borra, para no mostrar "No se encontró" un instante.
    let done = false;
    const remove = () => {
      if (done) return;
      done = true;
      api.backend.removePerfume(p.id).catch((x) => toast(errorMessage(x), 'error'));
    };
    addEventListener('hashchange', remove, { once: true });
    setTimeout(remove, 1000);
    toast('Perfume eliminado', 'success');
    api.go(listHash);
  };

  if (focusKey) {
    const [a, v] = focusKey;
    const el = [...view.querySelectorAll(`[${a}]`)].find((n) => n.getAttribute(a) === v);
    el?.focus();
  }
}
