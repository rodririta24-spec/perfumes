import { openDialog, closeDialog, toast, errorMessage } from './dom.js';
import { perfumeFieldsHTML, mountPerfumeFields } from './form.js';
import { preparePerfume, findDuplicate } from '../lib/perfume.js';
import { filterPerfumes } from '../lib/filters.js';
import { labelOf, CONCENTRATIONS } from '../lib/constants.js';

export function openAddDialog(api) {
  const status = api.currentRoute().name === 'wishlist' ? 'wishlist' : 'owned';
  const dlg = openDialog(`
    <h2>Agregar perfume</h2>
    <form id="add-form" class="pform" novalidate>
      ${perfumeFieldsHTML({ status }, { collapsed: true })}
      <p class="form-error" hidden></p>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" data-close>Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
    </form>`, { wide: true });
  const form = dlg.querySelector('#add-form');
  const errorEl = form.querySelector('.form-error');
  const fields = mountPerfumeFields(form, { status }, { brands: api.brands, notes: api.notes });
  fields.focusBrand();
  form.onsubmit = (e) => {
    e.preventDefault();
    const input = fields.read();
    const { errors, data } = preparePerfume(input);
    if (errors.length) {
      errorEl.textContent = errors.join('. ');
      errorEl.hidden = false;
      return;
    }
    const dup = findDuplicate(api.perfumes, data);
    if (dup) {
      const what = `${dup.brand} ${dup.name} (${labelOf(CONCENTRATIONS, dup.concentration)})`;
      const msg = dup.status === 'wishlist' ? `Ya está en tu wishlist: ${what}. ¿Agregarlo igual?` : `Ya tenés ${what}. ¿Agregarlo igual?`;
      if (!confirm(msg)) return;
    }
    try {
      const { done } = api.backend.createPerfume(data);
      done.catch((x) => toast(errorMessage(x), 'error'));
      delete form.dataset.dirty;
      closeDialog();
      const route = api.currentRoute().name;
      const mode = route === 'coleccion' ? 'owned' : route === 'wishlist' ? 'wishlist' : null;
      const vs = mode && api.state.views[mode];
      const hidden = vs && mode === data.status && filterPerfumes([{ id: 'new', ...data }], vs.filters).length === 0;
      const elsewhere = mode && data.status !== mode ? (data.status === 'wishlist' ? ' (en tu wishlist)' : ' (en tu colección)') : '';
      toast(`${data.name} agregado${hidden ? ' (oculto por los filtros)' : ''}${elsewhere}`, 'success');
    } catch (x) {
      errorEl.textContent = errorMessage(x);
      errorEl.hidden = false;
    }
  };
}
