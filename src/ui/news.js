import { esc } from '../lib/html.js';

// Titulares de lanzamientos (news.json lo actualiza una vez por día la GitHub Action).
const LANGS = [
  { value: '', label: 'Todas' },
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'Inglés' },
];

const fmtDate = (iso) => new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });

export async function renderNews(view, api) {
  const st = api.state.news;
  if (view.dataset.screen === 'novedades') return;
  view.dataset.screen = 'novedades';
  view.innerHTML = `
    <section class="news">
      <div class="chips-row" id="news-lang">${LANGS.map((l) =>
        `<button type="button" class="fchip${st.lang === l.value ? ' active' : ''}" data-lang="${l.value}" aria-pressed="${st.lang === l.value}">${l.label}</button>`).join('')}</div>
      <p class="summary-line" id="news-meta">Cargando novedades…</p>
      <ul class="news-list" id="news-list"></ul>
    </section>`;
  view.querySelector('#news-lang').onclick = (e) => {
    const b = e.target.closest('[data-lang]');
    if (!b) return;
    st.lang = b.dataset.lang;
    view.querySelectorAll('[data-lang]').forEach((x) => {
      x.classList.toggle('active', x === b);
      x.setAttribute('aria-pressed', String(x === b));
    });
    renderList(view, st);
  };
  if (!st.data) {
    try {
      const res = await fetch('news.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error();
      st.data = await res.json();
    } catch {
      if (view.dataset.screen === 'novedades') view.querySelector('#news-meta').textContent = 'No se pudieron cargar las novedades. Probá de nuevo más tarde.';
      return;
    }
  }
  if (view.dataset.screen === 'novedades') renderList(view, st);
}

function renderList(view, st) {
  const items = st.data.items.filter((x) => !st.lang || x.lang === st.lang);
  view.querySelector('#news-meta').textContent =
    `${items.length} titulares · actualizado el ${new Date(st.data.updatedAt).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
  view.querySelector('#news-list').innerHTML = items.map((x) => `
    <li class="news-item">
      <a href="${esc(x.link)}" target="_blank" rel="noopener">${esc(x.title)}</a>
      <span class="news-src">${esc(x.source)} · ${esc(fmtDate(x.date))}</span>
    </li>`).join('') || '<li class="empty">No hay titulares en este idioma.</li>';
}
