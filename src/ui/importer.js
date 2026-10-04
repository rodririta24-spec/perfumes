import { esc } from '../lib/html.js';
import { parseImport, planImport, existingImportIds } from '../lib/importer.js';
import { errorMessage, toast } from './dom.js';

let importing = false;
let lastStatus = ''; // último mensaje, para recuperarlo si se vuelve a esta pantalla
const show = (html) => {
  lastStatus = html;
  const el = document.getElementById('import-result');
  if (el) el.innerHTML = html;
};
const guard = (e) => { e.preventDefault(); e.returnValue = ''; };

export function renderImporter(view, api, { fromData = false } = {}) {
  // Los datos nuevos (p. ej. tras importar) no deben borrar el resultado en pantalla.
  if (fromData && view.dataset.screen === 'importar') return;
  view.dataset.screen = 'importar';
  view.innerHTML = `
    <section class="card-ish">
      <h2>Importar perfumes</h2>
      <p class="muted">Elegí el archivo <code>perfumes.json</code> de la migración. Los perfumes se suman a los que ya tenés.</p>
      <input type="file" accept="application/json,.json" id="file" aria-label="Archivo JSON de perfumes"${importing ? ' disabled' : ''}>
      <div id="import-result" aria-live="polite">${lastStatus}</div>
    </section>`;
  const input = view.querySelector('#file');
  input.onchange = async (e) => {
    const file = e.target.files[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (!file || importing) return;
    let json;
    try {
      json = JSON.parse(await file.text());
    } catch {
      show('<p class="form-error">El archivo no es un JSON válido.</p>');
      return;
    }
    const { items, errors } = parseImport(json);
    if (errors.length) {
      const fileLevel = errors.find((x) => x.index === -1);
      show(fileLevel
        ? `<p class="form-error">El archivo no tiene el formato esperado: ${esc(fileLevel.errors.join(', '))}.</p>`
        : `<p class="form-error">${errors.length} perfume(s) con errores; no se importó nada:</p>
          <ul>${errors.slice(0, 20).map((x) => `<li>#${x.index + 1} ${esc(x.label)}: ${esc(x.errors.join(', '))}</li>`).join('')}
          ${errors.length > 20 ? `<li>y ${errors.length - 20} más</li>` : ''}</ul>`);
      return;
    }
    const { toAdd, existing, duplicates } = planImport(items, existingImportIds(api.perfumes));
    const skipped = [
      existing.length ? `${existing.length} ya estaban cargados (no se tocan)` : '',
      duplicates.length ? `${duplicates.length} repetidos en el archivo` : '',
    ].filter(Boolean).join(' y ');
    if (!toAdd.length) {
      show(`<p>No hay perfumes nuevos para importar${skipped ? `: ${esc(skipped)}` : ''}.</p>`);
      return;
    }
    if (!confirm(`¿Importar ${toAdd.length} perfumes nuevos?${skipped ? ` Se saltean ${skipped}.` : ''}`)) return;
    importing = true;
    input.disabled = true;
    addEventListener('beforeunload', guard);
    show('<p>Importando…</p>');
    let done = 0;
    let html;
    try {
      const n = await api.backend.importPerfumes(toAdd, (d) => {
        done = d;
        show(`<p>Importando… ${d}/${toAdd.length}</p>`);
      });
      html = `<p class="ok">✔ ${n} perfumes importados.${skipped ? ` Se saltearon ${esc(skipped)}.` : ''}</p><a class="btn" href="#/coleccion">Ver colección</a>`;
      if (!document.getElementById('import-result')) toast(`Importación terminada: ${n} perfumes`, 'success');
    } catch (x) {
      html = `<p class="form-error">${esc(errorMessage(x))}</p>${done ? `<p>Se importaron ${done} antes del error; podés volver a intentarlo, los ya cargados se saltean.</p>` : ''}`;
      if (!document.getElementById('import-result')) toast(`La importación falló: ${errorMessage(x)}`, 'error');
    } finally {
      importing = false;
      document.getElementById('file')?.removeAttribute('disabled');
      removeEventListener('beforeunload', guard);
    }
    show(html);
  };
}
