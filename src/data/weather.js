export function getPosition(timeout = 6500) {
  let id;
  const timer = new Promise((_, reject) => { id = setTimeout(() => reject(new Error('Tiempo de espera de ubicación agotado')), 7000); });
  return Promise.race([locate(timeout), timer]).finally(() => clearTimeout(id));
}

function locate(timeout) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Sin geolocalización')); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      reject,
      { timeout, maximumAge: 30 * 60 * 1000 },
    );
  });
}

export async function fetchWeather({ lat, lon }) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&current=temperature_2m,weather_code`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  let json;
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`Open-Meteo respondió ${res.status}`);
    json = await res.json();
  } finally {
    clearTimeout(timer);
  }
  const temp = json?.current?.temperature_2m;
  const code = json?.current?.weather_code;
  if (typeof temp !== 'number' || typeof code !== 'number') throw new Error('Respuesta de clima inválida');
  return { temp, code };
}
