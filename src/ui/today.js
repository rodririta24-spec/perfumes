import { esc } from '../lib/html.js';
import { OCCASIONS, SEASONS, labelOf } from '../lib/constants.js';
import { suggest, climateFromTemp, climateFromSeason, seasonFromDate, isDaytime } from '../lib/suggest.js';
import { weatherLabel } from '../lib/weather.js';
import { getPosition, fetchWeather } from '../data/weather.js';
import { perfumeCardHTML } from './card.js';

const CLIMATE_TEXT = { hot: 'hace calor: priorizo frescos', cold: 'hace frío: priorizo cálidos', mild: 'clima templado: mezclo' };
const WEATHER_TTL = 30 * 60 * 1000;

function context(t) {
  const now = new Date();
  const climate = t.weather?.status === 'ok' ? climateFromTemp(t.weather.temp) : climateFromSeason(seasonFromDate(now));
  return { climate, occasion: t.occasion, daytime: isDaytime(now.getHours()) };
}

export function renderToday(view, api) {
  const t = api.state.today;
  if (view.dataset.screen !== 'hoy') {
    view.dataset.screen = 'hoy';
    view.innerHTML = `
      <section class="today">
        <div class="weather" id="weather"></div>
        <div class="chips-row" id="occasions">${OCCASIONS.map((o) =>
          `<button type="button" class="fchip${o.value === t.occasion ? ' active' : ''}" data-occ="${o.value}">${esc(o.label)}</button>`).join('')}</div>
        <div class="grid" id="suggestions"></div>
        <button type="button" class="btn btn-primary btn-big" id="reroll">🔄 Otra vez</button>
      </section>`;
    view.querySelector('#occasions').onclick = (e) => {
      const b = e.target.closest('[data-occ]');
      if (!b) return;
      t.occasion = b.dataset.occ;
      view.querySelectorAll('[data-occ]').forEach((x) => x.classList.toggle('active', x === b));
      reroll(view, api);
    };
    view.querySelector('#reroll').onclick = () => reroll(view, api);
    view.querySelector('#suggestions').onclick = (e) => {
      if (e.target.closest('a')) return;
      const card = e.target.closest('.pcard');
      if (card) api.go(`#/p/${encodeURIComponent(card.dataset.id)}`);
    };
    loadWeather(view, api);
  }
  if (!t.shown.length) reroll(view, api);
  else renderCards(view, api);
}

function reroll(view, api) {
  const t = api.state.today;
  const ctx = context(t);
  t.shown = suggest(api.perfumes, { ...ctx, exclude: new Set(t.shown) }).map((p) => p.id);
  t.rolledClimate = ctx.climate;
  renderCards(view, api);
}

function renderCards(view, api) {
  const t = api.state.today;
  const box = view.querySelector('#suggestions');
  const list = t.shown.map(api.byId).filter(Boolean);
  if (!api.perfumes.some((p) => p.status === 'owned')) {
    box.innerHTML = '<p class="empty">Agregá perfumes a tu colección para recibir sugerencias.</p>';
  } else if (!list.length) {
    box.innerHTML = '<p class="empty">Ningún perfume tiene cargada esta ocasión. Probá con otra o completá las ocasiones en las fichas.</p>';
  } else {
    box.innerHTML = list.map((p) => perfumeCardHTML(p)).join('');
  }
  renderWeather(view, t);
}

function renderWeather(view, t) {
  const el = view.querySelector('#weather');
  const w = t.weather;
  const climate = context(t).climate;
  if (!w || w.status === 'loading') {
    el.textContent = 'Buscando el clima…';
  } else if (w.status === 'ok') {
    const { emoji, label } = weatherLabel(w.code);
    el.innerHTML = `<span class="w-temp">${emoji} ${Math.round(w.temp)}°</span><span>${esc(label)} · ${CLIMATE_TEXT[climate]}</span>`;
  } else {
    const season = labelOf(SEASONS, seasonFromDate(new Date()));
    el.textContent = `Sin datos del clima (¿permiso de ubicación?): uso la estación, ${season} · ${CLIMATE_TEXT[climate]}`;
  }
}

async function loadWeather(view, api) {
  const t = api.state.today;
  if (t.weather?.status === 'ok' && Date.now() - t.weather.at < WEATHER_TTL) return;
  t.weather = { status: 'loading' };
  try {
    const w = await fetchWeather(await getPosition());
    t.weather = { status: 'ok', ...w, at: Date.now() };
  } catch {
    t.weather = { status: 'fallback' };
  }
  if (view.dataset.screen !== 'hoy') return;
  if (context(t).climate !== t.rolledClimate) reroll(view, api);
  else renderWeather(view, t);
}
