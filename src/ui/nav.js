import { esc } from '../lib/html.js';
import { toggleTheme } from './theme.js';

const TABS = [
  { name: 'coleccion', label: 'Colección', icon: '🧴' },
  { name: 'hoy', label: 'Hoy', icon: '✨' },
  { name: 'wishlist', label: 'Wishlist', icon: '💭' },
  { name: 'dupes', label: 'Dupes', icon: '🔁' },
  { name: 'novedades', label: 'Novedades', icon: '📰' },
];

const tabLinks = (cls) => TABS.map((t) =>
  `<a href="#/${t.name}" class="${cls}" data-tab="${t.name}"><span class="tab-icon" aria-hidden="true">${t.icon}</span><span>${t.label}</span></a>`).join('');

export function renderShell(app, { email, demo, onAdd, onLogout }) {
  app.innerHTML = `
    <header class="topbar">
      <a href="#/coleccion" class="brand-title">Mis Perfumes${demo ? ' <span class="badge">demo</span>' : ''}</a>
      <nav class="top-tabs" aria-label="Secciones">${tabLinks('top-tab')}</nav>
      <div class="topbar-actions">
        <button class="btn btn-primary" id="btn-add" aria-label="Agregar perfume">+<span class="btn-add-label"> Agregar</span></button>
        <button class="icon-btn" id="btn-theme" title="Cambiar tema" aria-label="Cambiar tema">◐</button>
        <button class="btn btn-ghost" id="btn-logout" title="Salir (${esc(email)})" aria-label="Salir"><span class="logout-label">Salir</span><svg class="logout-icon" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg></button>
      </div>
    </header>
    <main id="view" class="main"></main>
    <nav class="bottom-nav" aria-label="Secciones">${tabLinks('bottom-tab')}</nav>`;
  app.querySelector('#btn-add').onclick = onAdd;
  app.querySelector('#btn-theme').onclick = toggleTheme;
  app.querySelector('#btn-logout').onclick = onLogout;
}

export function setActiveTab(name) {
  document.querySelectorAll('[data-tab]').forEach((a) => {
    const on = a.dataset.tab === name;
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}
