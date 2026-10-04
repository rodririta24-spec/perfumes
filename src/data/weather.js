export function getPosition(timeout = 8000) {
  const timer = new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera de ubicación agotado')), 10000));
  return Promise.race([locate(timeout), timer]);
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
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Open-Meteo respondió ${res.status}`);
  const json = await res.json();
  const temp = json?.current?.temperature_2m;
  const code = json?.current?.weather_code;
  if (typeof temp !== 'number' || typeof code !== 'number') throw new Error('Respuesta de clima inválida');
  return { temp, code };
}
