import { esc } from '../lib/html.js';
import { parseImport, planImport } from '../lib/importer.js';
import { importId } from '../lib/perfume.js';
import { errorMessage } from './dom.js';

export function renderImporter(view, api, { fromData = false } = {}) {
  // Los datos nuevos (p. ej. tras importar) no deben borrar el resultado en pantalla.
  if (fromData && view.dataset.screen === 'importar') return;
  view.dataset.screen = 'importar';
  view.innerHTML = `
    <section class="card-ish">
      <h2>Importar perfumes</h2>
      <p class="muted">Elegí el archivo <code>perfumes.json</code> de la migración. Los perfumes se suman a los que ya tenés.</p>
      <input type="file" accept="application/json,.json" id="file">
      <div id="import-result"></div>
    </section>`;
  const out = view.querySelector('#import-result');
  view.querySelector('#file').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    let json;
    try {
      json = JSON.parse(await file.text());
    } catch {
      out.innerHTML = '<p class="form-error">El archivo no es un JSON válido.</p>';
      return;
    }
    const { items, errors } = parseImport(json);
    if (errors.length) {
      out.innerHTML = `<p class="form-error">${errors.length} perfume(s) con errores; no se importó nada:</p>
        <ul>${errors.slice(0, 20).map((x) => `<li>#${x.index + 1} ${esc(x.label)}: ${esc(x.errors.join(', '))}</li>`).join('')}</ul>`;
      return;
    }
    // Se compara por contenido (marca|nombre|concentración), no por id del documento: los cargados a mano tienen ids aleatorios.
    const { toAdd, existing, duplicates } = planImport(items, new Set(api.perfumes.map(importId)));
    const skipped = [
      existing.length ? `${existing.length} ya estaban cargados (no se tocan)` : '',
      duplicates.length ? `${duplicates.length} repetidos en el archivo` : '',
    ].filter(Boolean).join(' y ');
    if (!toAdd.length) {
      out.innerHTML = `<p>No hay perfumes nuevos para importar${skipped ? `: ${esc(skipped)}` : ''}.</p>`;
      return;
    }
    if (!confirm(`¿Importar ${toAdd.length} perfumes nuevos?${skipped ? ` Se saltean ${skipped}.` : ''}`)) return;
    out.innerHTML = '<p>Importando…</p>';
    try {
      const n = await api.backend.importPerfumes(toAdd, (done) => { out.innerHTML = `<p>Importando… ${done}/${toAdd.length}</p>`; });
      out.innerHTML = `<p class="ok">✔ ${n} perfumes importados.${skipped ? ` Se saltearon ${esc(skipped)}.` : ''}</p><a class="btn" href="#/coleccion">Ver colección</a>`;
    } catch (x) {
      out.innerHTML = `<p class="form-error">${esc(errorMessage(x))}</p>`;
    }
  };
}
