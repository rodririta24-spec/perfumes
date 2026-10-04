// Códigos WMO que devuelve Open-Meteo.
export function weatherLabel(code) {
  if (code === 0) return { emoji: '☀️', label: 'Despejado' };
  if (code === 1 || code === 2) return { emoji: '⛅', label: 'Parcialmente nublado' };
  if (code === 3) return { emoji: '☁️', label: 'Nublado' };
  if (code === 45 || code === 48) return { emoji: '🌫️', label: 'Niebla' };
  if (code >= 51 && code <= 57) return { emoji: '🌦️', label: 'Llovizna' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { emoji: '🌧️', label: 'Lluvia' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { emoji: '🌨️', label: 'Nieve' };
  if (code >= 95) return { emoji: '⛈️', label: 'Tormenta' };
  return { emoji: '🌡️', label: 'Clima' };
}
