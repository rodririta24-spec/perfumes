import { $, toast, errorMessage } from './ui/dom.js';
import { initTheme } from './ui/theme.js';
import { renderLogin, renderNoAccess } from './ui/screens.js';
import { renderShell, setActiveTab } from './ui/nav.js';
import { renderCollection } from './ui/collection.js';
import { renderToday } from './ui/today.js';
import { renderDupes } from './ui/dupes.js';
import { renderDetail } from './ui/detail.js';
import { openAddDialog } from './ui/add.js';
import { renderImporter } from './ui/importer.js';
import { EMPTY_FILTERS } from './lib/filters.js';
import { brandOptions, noteOptions } from './lib/catalog.js';
import { BRAND_SEED } from './seed/brands.js';
import { NOTE_SEED } from './seed/notes.js';

// Modo demo: backend en memoria, solo en localhost con ?demo (el login de Google no anda en el Chrome de pruebas).
const DEMO = ['localhost', '127.0.0.1'].includes(location.hostname) && new URLSearchParams(location.search).has('demo');
const app = document.getElementById('app');
initTheme();
let backend;
try {
  backend = await import(DEMO ? './data/demo.js' : './data/backend.js');
} catch (e) {
  console.error(e);
  app.innerHTML = '<div class="center-screen"><div class="card"><h1>Mis Perfumes</h1><p>No se pudo cargar la app. Revisá la conexión y recargá.</p></div></div>';
  throw e;
}

const state = {
  user: null,
  perfumes: [],
  loaded: false,
  views: {
    owned: { filters: { ...EMPTY_FILTERS }, sort: 'brand', advOpen: false },
    wishlist: { filters: { ...EMPTY_FILTERS }, sort: 'brand', advOpen: false },
  },
  today: { occasion: 'diario', weather: null, shown: [], rolledClimate: null },
  dupesQuery: '',
  unsubscribe: null,
};

function parseHash() {
  const [name, id] = location.hash.replace(/^#\/?/, '').split('/');
  let decoded = id ?? null;
  if (id) { try { decoded = decodeURIComponent(id); } catch { /* id mal formado: usar tal cual */ } }
  return { name: name || 'coleccion', id: decoded };
}

const api = {
  state,
  backend,
  get perfumes() { return state.perfumes; },
  byId: (id) => state.perfumes.find((p) => p.id === id),
  brands: () => brandOptions(BRAND_SEED, state.perfumes),
  notes: () => noteOptions(NOTE_SEED, state.perfumes),
  go: (hash) => { location.hash = hash; },
  currentRoute: parseHash,
};

const hasDirtyForm = () => !!document.querySelector('#view form[data-dirty="1"], #dialog form[data-dirty="1"]');
const confirmDiscard = () => !hasDirtyForm() || confirm('¿Descartar los cambios sin guardar?');
const logout = () => { if (confirmDiscard()) backend.logout(); };

backend.onUser((user) => {
  state.unsubscribe?.();
  state.unsubscribe = null;
  state.perfumes = [];
  state.loaded = false;
  state.user = null;
  if (!user) {
    renderLogin(app, () => backend.login().catch((e) => toast(errorMessage(e), 'error')));
    return;
  }
  if (!backend.isOwner(user)) {
    renderNoAccess(app, user.email, backend.logout);
    return;
  }
  state.user = user;
  renderShell(app, { email: user.email, demo: DEMO, onAdd: () => openAddDialog(api), onLogout: logout });
  route();
  state.unsubscribe = backend.subscribePerfumes(
    (list) => {
      state.perfumes = list;
      state.loaded = true;
      route({ fromData: true });
    },
    (e) => {
      if (e.code === 'permission-denied') {
        state.unsubscribe?.();
        renderNoAccess(app, user.email, backend.logout);
        return;
      }
      toast(errorMessage(e), 'error');
    },
  );
});

function route({ fromData = false } = {}) {
  const view = $('#view');
  if (!view || !state.user) return;
  const r = parseHash();
  setActiveTab(r.name);
  if (!state.loaded) {
    view.dataset.screen = 'loading';
    view.innerHTML = '<p class="muted center">Cargando…</p>';
    return;
  }
  const opts = { fromData };
  switch (r.name) {
    case 'hoy': return renderToday(view, api, opts);
    case 'wishlist': return renderCollection(view, api, 'wishlist', opts);
    case 'dupes': return renderDupes(view, api, opts);
    case 'p': return renderDetail(view, api, r.id, opts);
    case 'importar': return renderImporter(view, api);
    default: return renderCollection(view, api, 'owned', opts);
  }
}

let currentHash = location.hash || '#/coleccion';
let ignoreNextHash = false;
addEventListener('hashchange', () => {
  if (ignoreNextHash) {
    ignoreNextHash = false;
    return;
  }
  if (!confirmDiscard()) {
    if (location.hash !== currentHash) {
      ignoreNextHash = true;
      location.hash = currentHash;
    }
    return;
  }
  currentHash = location.hash;
  window.scrollTo(0, 0);
  route();
});

addEventListener('beforeunload', (e) => {
  if (hasDirtyForm()) {
    e.preventDefault();
    e.returnValue = '';
  }
});
