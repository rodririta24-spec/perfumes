import { esc } from '../lib/html.js';
import { FAMILIES, MOODS } from '../lib/constants.js';
import { collectionStats } from '../lib/stats.js';

// Barras horizontales simples (sin librería): etiqueta, barra proporcional y número.
function bars(title, rows, colorOf = () => 'var(--primary)') {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return `<section class="stat-card"><h3>${esc(title)}</h3>
    <ul class="bars">${rows.map((r) => `<li>
      <span class="bar-label">${esc(r.label)}</span>
      <span class="bar-track"><span class="bar" style="width:${(r.count / max) * 100}%;background:${colorOf(r)}"></span></span>
      <span class="bar-n">${r.count}</span></li>`).join('')}</ul></section>`;
}

const famColor = (r) => FAMILIES.find((f) => f.value === r.value)?.color ?? 'var(--primary)';

export function renderStats(view, api) {
  view.dataset.screen = 'stats';
  const s = collectionStats(api.perfumes);
  if (!s.total) {
    view.innerHTML = '<p class="empty">Todavía no hay perfumes en tu colección.</p>';
    return;
  }
  const pct = Math.round((s.dupes / s.total) * 100);
  view.innerHTML = `
    <div class="stats">
      <a href="#/coleccion" class="back">← Volver a la colección</a>
      <div class="kpis">
        <div class="kpi"><span class="kpi-n">${s.total}</span><span class="kpi-l">perfumes</span></div>
        <div class="kpi"><span class="kpi-n">${pct}%</span><span class="kpi-l">son dupes (${s.dupes})</span></div>
        <div class="kpi"><span class="kpi-n">${s.originalsCovered}</span><span class="kpi-l">originales cubiertos</span></div>
      </div>
      <div class="stat-grid">
        ${bars('Mood', s.byMood.map((m) => ({ ...m, label: `${MOODS.find((x) => x.value === m.value).emoji} ${m.label}` })))}
        ${bars('Familia principal', s.byFamily, famColor)}
        ${bars('Temporada', s.bySeason)}
        ${bars('Ocasión', s.byOccasion)}
        ${bars('Marcas con más perfumes', s.topBrands)}
        ${bars('Notas más repetidas', s.topNotes)}
      </div>
    </div>`;
}
