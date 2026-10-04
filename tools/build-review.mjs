// Valida migration/perfumes.json con las mismas reglas que la app y genera migration/review.html para revisar.
import { readFileSync, writeFileSync } from 'node:fs';
import { parseImport } from '../src/lib/importer.js';
import { CONCENTRATIONS, FAMILIES, SEASONS, OCCASIONS, TIMES, labelOf } from '../src/lib/constants.js';
import { esc } from '../src/lib/html.js';

const file = process.argv[2] ?? 'migration/perfumes.json';
const raw = JSON.parse(readFileSync(file, 'utf8'));
const list = Array.isArray(raw) ? raw : raw.perfumes;
const { items, errors } = parseImport(list);
if (errors.length) {
  console.error(`${errors.length} con errores:`);
  for (const e of errors) console.error(`  #${e.index + 1} ${e.label}: ${e.errors.join(', ')}`);
  process.exit(1);
}

const labels = (cat, vals) => vals.map((v) => labelOf(cat, v)).join(', ');
const missing = items.filter((p) => !p.familyMain || !p.notes.length || !p.seasons.length || !p.occasions.length || !p.timeOfDay);
const doubtful = list.filter((x) => x._uncertain).length;
const rows = items.map((p, i) => {
  const src = list[i];
  const changes = src._changes ?? [];
  const doubt = [src._uncertain ? '⚠️ dudoso' : '', src._note ?? ''].filter(Boolean).join(' — ');
  const sources = (src._sources ?? []).map((u, k) => `<a href="${esc(u)}" target="_blank" rel="noopener">${k + 1}</a>`).join(' ');
  return `<tr class="${changes.length ? 'changed' : ''}${src._uncertain ? ' doubt' : ''}">
    <td>${i + 1}</td><td>${esc(p.brand)}</td><td>${esc(p.name)}</td><td>${esc(labelOf(CONCENTRATIONS, p.concentration))}</td>
    <td>${esc(p.dupeOf.map((d) => `${d.brand} - ${d.name}`).join(' & '))}</td>
    <td>${esc(labelOf(FAMILIES, p.familyMain))}</td><td>${esc(labelOf(FAMILIES, p.familySecondary))}</td>
    <td>${esc(p.notes.join(', '))}</td><td>${esc(labels(SEASONS, p.seasons))}</td><td>${esc(labels(OCCASIONS, p.occasions))}</td>
    <td>${esc(labelOf(TIMES, p.timeOfDay))}</td><td class="chg">${esc(changes.join(' · '))}</td>
    <td class="chg">${esc(doubt)}</td><td>${sources}</td></tr>`;
}).join('\n');

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Revisión de migración</title><style>
:root { color-scheme: light dark; --bg: #fff; --text: #1f1a2b; --muted: #6c6580; --border: #e0dae9; --hl: #fff4cc; --warn: #ffe1e1; }
@media (prefers-color-scheme: dark) { :root { --bg: #121016; --text: #ece8f3; --muted: #9d95ad; --border: #332d3f; --hl: #3a3010; --warn: #3d1c1c; } }
body { margin: 0; padding: 16px; background: var(--bg); color: var(--text); font: 14px/1.4 system-ui, sans-serif; }
input { width: 100%; max-width: 420px; padding: 8px; font: inherit; margin: 8px 0 12px; }
.wrap { overflow-x: auto; } table { border-collapse: collapse; width: 100%; }
th, td { border-bottom: 1px solid var(--border); padding: 6px 8px; text-align: left; vertical-align: top; }
th { position: sticky; top: 0; background: var(--bg); font-size: 12px; color: var(--muted); }
tr.changed td.chg { background: var(--hl); } tr.doubt td:nth-child(13) { background: var(--warn); } .chg { font-size: 12px; }
</style></head><body>
<h1>Revisión: ${items.length} perfumes</h1>
<p>${list.filter((x) => x._changes?.length).length} con correcciones (resaltadas) · ${doubtful} dudosos (⚠️) · ${missing.length} con datos incompletos.</p>
<input type="search" id="q" placeholder="Filtrar…">
<div class="wrap"><table><thead><tr><th>#</th><th>Marca</th><th>Nombre</th><th>Conc.</th><th>Dupe de</th><th>Familia</th><th>2ª</th><th>Notas</th><th>Temporada</th><th>Ocasión</th><th>Momento</th><th>Correcciones</th><th>Dudas</th><th>Fuentes</th></tr></thead>
<tbody>${rows}</tbody></table></div>
<script>document.getElementById('q').oninput=(e)=>{const q=e.target.value.toLowerCase();document.querySelectorAll('tbody tr').forEach(r=>{r.hidden=!!q&&!r.textContent.toLowerCase().includes(q)})}</script>
</body></html>`;

writeFileSync('migration/review.html', html);
const byFamily = Object.fromEntries(FAMILIES.map((f) => [f.label, items.filter((p) => p.familyMain === f.value).length]));
console.log(`${items.length} perfumes OK. Incompletos: ${missing.length}. Dudosos: ${doubtful}.`);
console.log(byFamily);
console.log('→ migration/review.html');
