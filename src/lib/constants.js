export const CONCENTRATIONS = [
  { value: 'edt', label: 'Eau de Toilette', short: 'EDT' },
  { value: 'edp', label: 'Eau de Parfum', short: 'EDP' },
  { value: 'parfum', label: 'Parfum', short: 'Parfum' },
  { value: 'extrait', label: 'Extrait de Parfum', short: 'Extrait' },
  { value: 'cologne', label: 'Cologne', short: 'Cologne' },
  { value: 'elixir', label: 'Elixir', short: 'Elixir' },
];

export const STATUSES = [
  { value: 'owned', label: 'La tengo' },
  { value: 'wishlist', label: 'La quiero' },
];

export const MOODS = [
  { value: 'fresco', label: 'Fresco', emoji: '🧊' },
  { value: 'calido', label: 'Cálido', emoji: '🔥' },
  { value: 'floral', label: 'Floral', emoji: '🌸' },
  { value: 'amaderado', label: 'Amaderado', emoji: '🌲' },
];

export const FAMILIES = [
  { value: 'citrico', label: 'Cítrico', mood: 'fresco', color: '#c99a00' },
  { value: 'acuatico', label: 'Acuático', mood: 'fresco', color: '#1e88c8' },
  { value: 'aromatico', label: 'Aromático', mood: 'fresco', color: '#4f9a6a' },
  { value: 'verde', label: 'Verde', mood: 'fresco', color: '#3a8f35' },
  { value: 'floral', label: 'Floral', mood: 'floral', color: '#d1528f' },
  { value: 'frutal', label: 'Frutal', mood: 'floral', color: '#e0612e' },
  { value: 'amaderado', label: 'Amaderado', mood: 'amaderado', color: '#8a6a45' },
  { value: 'cuero_tabaco', label: 'Cuero/Tabaco', mood: 'calido', color: '#7a4e36' },
  { value: 'oriental_ambar', label: 'Oriental/Ámbar', mood: 'calido', color: '#c07a1e' },
  { value: 'especiado', label: 'Especiado', mood: 'calido', color: '#b8432f' },
  { value: 'gourmand', label: 'Gourmand', mood: 'calido', color: '#9a5b8c' },
];

export const SEASONS = [
  { value: 'verano', label: 'Verano' },
  { value: 'invierno', label: 'Invierno' },
  { value: 'entretiempo', label: 'Primavera/Otoño' },
  { value: 'todo_el_anio', label: 'Todo el año' },
];

export const OCCASIONS = [
  { value: 'diario', label: 'Diario' },
  { value: 'oficina', label: 'Oficina' },
  { value: 'salida', label: 'Salida' },
  { value: 'cita', label: 'Cita' },
  { value: 'evento', label: 'Evento' },
];

export const TIMES = [
  { value: 'dia', label: 'Día' },
  { value: 'noche', label: 'Noche' },
  { value: 'ambos', label: 'Ambos' },
];

export const labelOf = (list, value) => list.find((o) => o.value === value)?.label ?? '';
export const familyOf = (value) => FAMILIES.find((f) => f.value === value) ?? null;
export const moodOf = (perfume) => familyOf(perfume?.familyMain)?.mood ?? null;
