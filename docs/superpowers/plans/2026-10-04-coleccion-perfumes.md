# Colección de Perfumes — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App web personal (PWA, celu + PC) para la colección de perfumes de Rodrigo: colección, ficha editable, wishlist, dupes y sugerencias "¿Qué me pongo hoy?" según clima y ocasión.

**Architecture:** `index.html` estático + ES modules sin build, publicado en GitHub Pages. Firebase Auth (Google) + Firestore con caché offline persistente, en un proyecto nuevo. Toda la lógica de dominio vive en `src/lib/` como funciones puras testeadas con Vitest; `src/data/` habla con Firebase (o con un backend demo en memoria para probar sin login); `src/ui/` renderiza con template strings. Catálogos de marcas y notas = semilla estática en `src/seed/` ∪ valores ya usados en los perfumes (sin colecciones extra en Firestore).

**Tech Stack:** JavaScript ES modules, Firebase JS SDK 12.19.0 (CDN gstatic), Vitest 5, @firebase/rules-unit-testing 5 + emulador de Firestore, http-server, Open-Meteo (clima, sin key), PowerShell System.Drawing (íconos).

**Repo:** `C:\Users\rodri\perfumes` (ya existe con el spec commiteado). Identidad git del repo ya configurada (Rodrigo Rita).

**Referencia:** misma estructura que `C:\Users\rodri\inventario-samples` (mirarla ante dudas de estilo).

**Commits:** todos los commits terminan con la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Usar: `git commit -m "<mensaje>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

## Estructura de archivos

```
perfumes/
├─ index.html                 shell HTML, carga src/main.js
├─ manifest.webmanifest       PWA
├─ icons/                     icon-192.png, icon-512.png, apple-touch-icon.png (generados)
├─ styles.css                 estilos (tokens light/dark, mobile-first)
├─ firebase.json / .firebaserc / firestore.rules / firestore.indexes.json
├─ package.json / .gitignore
├─ src/
│  ├─ main.js                 auth, estado, router por hash
│  ├─ config.js               OWNER_EMAIL + firebaseConfig
│  ├─ fs.js                   re-export del SDK de Firestore (CDN)
│  ├─ lib/                    lógica pura (testeada)
│  │  ├─ constants.js         enums, familias→mood/color, labelOf, familyOf, moodOf
│  │  ├─ normalize.js         normalize, cleanText, uniqueSorted
│  │  ├─ perfume.js           preparePerfume, perfumeKey, findDuplicate, fragranticaUrl
│  │  ├─ dupes.js             ownedIndex, findOriginal, dupesOf, groupByOriginal
│  │  ├─ filters.js           EMPTY_FILTERS, filterPerfumes, sortPerfumes, summarize
│  │  ├─ catalog.js           brandOptions, noteOptions, searchOptions
│  │  ├─ suggest.js           seasonFromDate, climate*, isDaytime, scorePerfume, weightedPick, suggest
│  │  ├─ weather.js           weatherLabel (códigos WMO)
│  │  ├─ importer.js          parseImport
│  │  ├─ chunk.js             chunk
│  │  ├─ errors.js            ValidationError
│  │  └─ html.js              esc
│  ├─ seed/
│  │  ├─ brands.js            BRAND_SEED (≥600 marcas)
│  │  ├─ notes.js             NOTE_SEED (notas comunes, en español)
│  │  └─ demo-perfumes.js     DEMO_PERFUMES (modo demo)
│  ├─ data/
│  │  ├─ backend.js           Firebase: auth + CRUD perfumes
│  │  ├─ demo.js              misma interfaz, en memoria (localhost?demo)
│  │  └─ weather.js           geolocalización + Open-Meteo
│  └─ ui/
│     ├─ dom.js theme.js screens.js nav.js
│     ├─ picker.js            combobox con buscador (single / multi-chips)
│     ├─ form.js              campos del perfume (alta y ficha)
│     ├─ card.js              tarjeta de perfume + helpers de chips
│     ├─ collection.js        Colección y Wishlist
│     ├─ add.js               diálogo Agregar
│     ├─ detail.js            Ficha
│     ├─ today.js             ¿Qué me pongo hoy?
│     ├─ dupes.js             vista Dupes
│     └─ importer.js          #/importar (migración)
├─ tools/
│  ├─ make-icons.ps1          genera íconos PNG
│  └─ build-review.mjs        valida migration/perfumes.json y arma la tabla de revisión
├─ migration/                 (gitignored) perfumes.json, review.html
└─ tests/
   ├─ unit/*.test.js
   └─ rules/firestore.rules.test.js
```

**Interfaz del backend** (`src/data/backend.js` y `src/data/demo.js` exportan exactamente esto):
`login()`, `logout()`, `onUser(cb)`, `isOwner(user)`, `subscribePerfumes(onData, onError) → unsubscribe`, `createPerfume(input) → { id, done: Promise }`, `updatePerfume(id, input) → Promise`, `patchPerfume(id, patch) → Promise`, `removePerfume(id) → Promise`, `importPerfumes(items, onProgress) → Promise<number>`.

Las escrituras no se esperan en la UI (Firestore las aplica al instante en la caché local, también offline); los errores se muestran con `.catch(toast)`.

---

### Task 0: Scaffold del repo

**Files:**
- Create: `package.json`, `.gitignore`, `firebase.json`, `firestore.indexes.json`, `src/lib/html.js`, `src/lib/errors.js`, `src/lib/chunk.js`, `tests/unit/chunk.test.js`

- [ ] **Step 1: package.json**

```json
{
  "name": "perfumes",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run tests/unit",
    "test:rules": "firebase emulators:exec --only firestore --project demo-perfumes \"vitest run tests/rules\"",
    "dev": "http-server . -p 5174 -c-1"
  }
}
```

- [ ] **Step 2: instalar dependencias de desarrollo**

Run: `cd C:/Users/rodri/perfumes && npm install -D vitest@^5.0.3 http-server@^14.1.1 firebase@^12.19.0 @firebase/rules-unit-testing@^5.0.2`
Expected: `added N packages`, sin errores.

- [ ] **Step 3: .gitignore, firebase.json, firestore.indexes.json**

`.gitignore`:
```
node_modules/
firebase-debug.log
firestore-debug.log
ui-debug.log
.firebase/
migration/
```

`firebase.json`:
```json
{
  "firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" },
  "emulators": { "firestore": { "port": 8080 }, "ui": { "enabled": false } }
}
```

`firestore.indexes.json`:
```json
{ "indexes": [], "fieldOverrides": [] }
```

- [ ] **Step 4: utilidades base**

`src/lib/html.js`:
```js
const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => MAP[c]);
```

`src/lib/errors.js`:
```js
export class ValidationError extends Error {
  constructor(errors) {
    super(errors.join('. '));
    this.name = 'ValidationError';
    this.errors = errors;
  }
}
```

`tests/unit/chunk.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { chunk } from '../../src/lib/chunk.js';

describe('chunk', () => {
  it('splits into fixed-size parts', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
  it('empty input gives no parts', () => {
    expect(chunk([], 3)).toEqual([]);
  });
});
```

- [ ] **Step 5: correr el test y verificar que falla**

Run: `npm test`
Expected: FAIL (no existe `src/lib/chunk.js`).

- [ ] **Step 6: implementar chunk**

`src/lib/chunk.js`:
```js
export function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
```

- [ ] **Step 7: correr tests**

Run: `npm test`
Expected: PASS (2 tests).

- [ ] **Step 8: commit**

```bash
git add -A && git commit -m "chore: scaffold del proyecto (vitest, firebase.json, utilidades base)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 1: Constantes y normalización

**Files:**
- Create: `src/lib/constants.js`, `src/lib/normalize.js`
- Test: `tests/unit/constants.test.js`, `tests/unit/normalize.test.js`

- [ ] **Step 1: tests**

`tests/unit/normalize.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { normalize, cleanText, uniqueSorted } from '../../src/lib/normalize.js';

describe('normalize', () => {
  it('lowercases, trims and collapses spaces', () => {
    expect(normalize('  Maison  Francis Kurkdjian ')).toBe('maison francis kurkdjian');
  });
  it('strips accents', () => {
    expect(normalize('Altaïr')).toBe('altair');
    expect(normalize('Stéphane Humbert Lucas')).toBe('stephane humbert lucas');
  });
  it('ignores apostrophes and dots', () => {
    expect(normalize("Angel's Share")).toBe('angels share');
    expect(normalize('Angel’s Share')).toBe('angels share');
    expect(normalize('Bond No.9')).toBe('bond no9');
  });
  it('treats & as and', () => {
    expect(normalize('Viktor&Rolf')).toBe('viktor and rolf');
    expect(normalize('Dolce & Gabbana')).toBe('dolce and gabbana');
  });
  it('handles null', () => {
    expect(normalize(null)).toBe('');
  });
});

describe('cleanText', () => {
  it('trims and collapses spaces', () => {
    expect(cleanText('  a   b ')).toBe('a b');
    expect(cleanText(undefined)).toBe('');
  });
});

describe('uniqueSorted', () => {
  it('dedupes by normalized value keeping first spelling, sorted', () => {
    expect(uniqueSorted(['Lattafa', 'lattafa ', 'Armaf', '', 'Ármaf'])).toEqual(['Armaf', 'Lattafa']);
  });
});
```

`tests/unit/constants.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { FAMILIES, MOODS, moodOf, familyOf, labelOf, SEASONS } from '../../src/lib/constants.js';

describe('moodOf', () => {
  it('derives mood from familyMain', () => {
    expect(moodOf({ familyMain: 'citrico' })).toBe('fresco');
    expect(moodOf({ familyMain: 'acuatico' })).toBe('fresco');
    expect(moodOf({ familyMain: 'gourmand' })).toBe('calido');
    expect(moodOf({ familyMain: 'cuero_tabaco' })).toBe('calido');
    expect(moodOf({ familyMain: 'frutal' })).toBe('floral');
    expect(moodOf({ familyMain: 'amaderado' })).toBe('amaderado');
  });
  it('null without family', () => {
    expect(moodOf({})).toBeNull();
  });
});

describe('catalog integrity', () => {
  it('has 11 families, each with a known mood and a color', () => {
    const moods = new Set(MOODS.map((m) => m.value));
    expect(FAMILIES).toHaveLength(11);
    for (const f of FAMILIES) {
      expect(moods.has(f.mood)).toBe(true);
      expect(f.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
  it('familyOf and labelOf', () => {
    expect(familyOf('gourmand').label).toBe('Gourmand');
    expect(familyOf('nada')).toBeNull();
    expect(labelOf(SEASONS, 'todo_el_anio')).toBe('Todo el año');
    expect(labelOf(SEASONS, 'x')).toBe('');
  });
});
```

- [ ] **Step 2: correr y verificar que fallan**

Run: `npm test`
Expected: FAIL (módulos inexistentes).

- [ ] **Step 3: implementar**

`src/lib/normalize.js`:
```js
// Clave de comparación: sin acentos, minúsculas, & = and, sin apóstrofes ni puntos, espacios colapsados.
export function normalize(s) {
  return String(s ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’`´.]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const cleanText = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

export const compareText = (a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' });

// Sin duplicados (por normalize), conserva la primera grafía, ordenado alfabéticamente.
export function uniqueSorted(values) {
  const seen = new Map();
  for (const v of values) {
    const c = cleanText(v);
    if (!c) continue;
    const k = normalize(c);
    if (!seen.has(k)) seen.set(k, c);
  }
  return [...seen.values()].sort(compareText);
}
```

`src/lib/constants.js`:
```js
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
```

- [ ] **Step 4: correr tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: commit**

```bash
git add -A && git commit -m "feat: constantes (familias, moods, enums) y normalización" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Modelo de perfume

**Files:**
- Create: `src/lib/perfume.js`
- Test: `tests/unit/perfume.test.js`

- [ ] **Step 1: tests**

`tests/unit/perfume.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { preparePerfume, perfumeKey, findDuplicate, fragranticaUrl } from '../../src/lib/perfume.js';

const base = { brand: ' Lattafa ', name: 'Khamrah  Qahwa', concentration: 'edp' };

describe('preparePerfume', () => {
  it('requires brand, name and concentration', () => {
    expect(preparePerfume({}).errors).toEqual(['Falta la marca', 'Falta el nombre', 'Elegí la concentración']);
  });
  it('cleans text and applies defaults', () => {
    const { errors, data } = preparePerfume(base);
    expect(errors).toEqual([]);
    expect(data).toEqual({
      brand: 'Lattafa', name: 'Khamrah Qahwa', concentration: 'edp', status: 'owned', dupeOf: [],
      familyMain: null, familySecondary: null, notes: [], seasons: [], occasions: [],
      timeOfDay: null, rating: null, favorite: false,
    });
  });
  it('keeps valid enums, drops invalid ones, dedupes', () => {
    const { data } = preparePerfume({
      ...base, status: 'wishlist', familyMain: 'gourmand', familySecondary: 'gourmand',
      seasons: ['invierno', 'invierno', 'otoño'], occasions: ['cita', 'x'], timeOfDay: 'noche',
    });
    expect(data.status).toBe('wishlist');
    expect(data.familyMain).toBe('gourmand');
    expect(data.familySecondary).toBeNull();
    expect(data.seasons).toEqual(['invierno']);
    expect(data.occasions).toEqual(['cita']);
    expect(data.timeOfDay).toBe('noche');
  });
  it('orders multi-select values like the catalog', () => {
    expect(preparePerfume({ ...base, seasons: ['todo_el_anio', 'verano'] }).data.seasons).toEqual(['verano', 'todo_el_anio']);
  });
  it('parses rating 1-10 and ignores the rest', () => {
    expect(preparePerfume({ ...base, rating: '9' }).data.rating).toBe(9);
    expect(preparePerfume({ ...base, rating: '' }).data.rating).toBeNull();
    expect(preparePerfume({ ...base, rating: 11 }).data.rating).toBeNull();
    expect(preparePerfume({ ...base, rating: 7.5 }).data.rating).toBeNull();
  });
  it('cleans dupeOf and drops incomplete entries', () => {
    const { data } = preparePerfume({ ...base, dupeOf: [{ brand: ' By Kilian ', name: "Angels' Share" }, { brand: 'Creed', name: '' }] });
    expect(data.dupeOf).toEqual([{ brand: 'By Kilian', name: "Angels' Share" }]);
  });
  it('dedupes notes ignoring case/accents and keeps order', () => {
    expect(preparePerfume({ ...base, notes: ['Café', 'cafe', ' Vainilla ', ''] }).data.notes).toEqual(['Café', 'Vainilla']);
  });
  it('ignores unknown fields like _changes', () => {
    expect(preparePerfume({ ...base, _changes: ['x'] }).data).not.toHaveProperty('_changes');
  });
});

describe('perfumeKey / findDuplicate', () => {
  const list = [{ id: 'a', brand: 'Dolce & Gabbana', name: 'The One', concentration: 'edp' }];
  it('key ignores case, accents and &', () => {
    expect(perfumeKey('dolce and gabbana', 'THE ONE')).toBe(perfumeKey('Dolce & Gabbana', 'The One'));
  });
  it('same brand+name+concentration is a duplicate', () => {
    expect(findDuplicate(list, { brand: 'dolce and gabbana', name: 'the one', concentration: 'edp' })?.id).toBe('a');
  });
  it('different concentration is not', () => {
    expect(findDuplicate(list, { brand: 'Dolce & Gabbana', name: 'The One', concentration: 'parfum' })).toBeNull();
  });
  it('ignores the perfume being edited', () => {
    expect(findDuplicate(list, list[0], 'a')).toBeNull();
  });
});

describe('fragranticaUrl', () => {
  it('uses DuckDuckGo "\\" to jump to the first fragrantica result', () => {
    expect(fragranticaUrl({ brand: 'Lattafa', name: 'Khamrah' }))
      .toBe('https://duckduckgo.com/?q=' + encodeURIComponent('\\site:fragrantica.com Lattafa Khamrah'));
  });
});
```

- [ ] **Step 2: correr y verificar que falla**

Run: `npm test -- perfume`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: implementar**

`src/lib/perfume.js`:
```js
import { CONCENTRATIONS, FAMILIES, SEASONS, OCCASIONS, TIMES } from './constants.js';
import { cleanText, normalize } from './normalize.js';

const has = (list, v) => list.some((o) => o.value === v);
// Filtra a valores válidos, sin repetidos, en el orden del catálogo.
const pickMany = (list, values) => list.filter((o) => (values ?? []).includes(o.value)).map((o) => o.value);

function parseRating(v) {
  const n = v === '' || v == null ? NaN : Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 10 ? n : null;
}

function cleanNotes(notes) {
  const seen = new Set();
  const out = [];
  for (const n of notes ?? []) {
    const c = cleanText(n);
    const k = normalize(c);
    if (!c || seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}

export function preparePerfume(input) {
  const errors = [];
  const brand = cleanText(input.brand);
  const name = cleanText(input.name);
  if (!brand) errors.push('Falta la marca');
  if (!name) errors.push('Falta el nombre');
  if (!has(CONCENTRATIONS, input.concentration)) errors.push('Elegí la concentración');
  const familyMain = has(FAMILIES, input.familyMain) ? input.familyMain : null;
  const secondary = has(FAMILIES, input.familySecondary) ? input.familySecondary : null;
  const data = {
    brand,
    name,
    concentration: has(CONCENTRATIONS, input.concentration) ? input.concentration : null,
    status: input.status === 'wishlist' ? 'wishlist' : 'owned',
    dupeOf: (input.dupeOf ?? [])
      .map((d) => ({ brand: cleanText(d?.brand), name: cleanText(d?.name) }))
      .filter((d) => d.brand && d.name),
    familyMain,
    familySecondary: secondary === familyMain ? null : secondary,
    notes: cleanNotes(input.notes),
    seasons: pickMany(SEASONS, input.seasons),
    occasions: pickMany(OCCASIONS, input.occasions),
    timeOfDay: has(TIMES, input.timeOfDay) ? input.timeOfDay : null,
    rating: parseRating(input.rating),
    favorite: input.favorite === true,
  };
  return { errors, data };
}

export const perfumeKey = (brand, name) => `${normalize(brand)}|${normalize(name)}`;

export function findDuplicate(perfumes, data, exceptId = null) {
  const key = perfumeKey(data.brand, data.name);
  return perfumes.find((p) => p.id !== exceptId && p.concentration === data.concentration && perfumeKey(p.brand, p.name) === key) ?? null;
}

// Fragrantica no permite armar el link directo sin el id numérico: DuckDuckGo con "\" salta al primer resultado.
export const fragranticaUrl = (p) =>
  'https://duckduckgo.com/?q=' + encodeURIComponent(`\\site:fragrantica.com ${p.brand} ${p.name}`);
```

- [ ] **Step 4: correr tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: commit**

```bash
git add -A && git commit -m "feat: modelo de perfume (validación, duplicados, link a Fragrantica)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Dupes

**Files:**
- Create: `src/lib/dupes.js`
- Test: `tests/unit/dupes.test.js`

- [ ] **Step 1: tests**

`tests/unit/dupes.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { ownedIndex, findOriginal, dupesOf, groupByOriginal } from '../../src/lib/dupes.js';

const perfumes = [
  { id: 'inv', status: 'owned', brand: 'Paco Rabanne', name: 'Invictus Aqua' },
  { id: 'hi', status: 'owned', brand: 'Rasasi', name: 'Hawas Ice', dupeOf: [{ brand: 'paco rabanne', name: 'Invictus  Aqua' }] },
  { id: 'ue', status: 'owned', brand: 'Armaf', name: 'Club de Nuit Urban Elixir', dupeOf: [{ brand: 'Creed', name: 'Aventus' }, { brand: 'Dior', name: 'Sauvage' }] },
  { id: 'ss', status: 'owned', brand: 'Afnan', name: 'Supremacy Silver', dupeOf: [{ brand: 'Creed', name: 'Aventus' }] },
  { id: 'wl', status: 'wishlist', brand: 'Creed', name: 'Aventus' },
  { id: 'wd', status: 'wishlist', brand: 'X', name: 'Y', dupeOf: [{ brand: 'Creed', name: 'Aventus' }] },
];
const ids = (list) => list.map((p) => p.id);

describe('findOriginal', () => {
  const index = ownedIndex(perfumes);
  it('finds an owned original ignoring case and spaces', () => {
    expect(findOriginal(index, { brand: 'PACO RABANNE', name: 'invictus aqua' }).id).toBe('inv');
  });
  it('wishlist perfumes are not originals you own', () => {
    expect(findOriginal(index, { brand: 'Creed', name: 'Aventus' })).toBeNull();
  });
});

describe('dupesOf', () => {
  it('lists owned dupes of a perfume', () => {
    expect(ids(dupesOf(perfumes, perfumes[0]))).toEqual(['hi']);
  });
  it('works for a wishlist original, only owned dupes, sorted by brand', () => {
    expect(ids(dupesOf(perfumes, perfumes[4]))).toEqual(['ss', 'ue']);
  });
});

describe('groupByOriginal', () => {
  it('groups owned dupes by original, sorted, using owned spelling when available', () => {
    const groups = groupByOriginal(perfumes);
    expect(groups.map((g) => [g.brand, g.name, g.owned?.id ?? null, ids(g.dupes)])).toEqual([
      ['Creed', 'Aventus', null, ['ss', 'ue']],
      ['Dior', 'Sauvage', null, ['ue']],
      ['Paco Rabanne', 'Invictus Aqua', 'inv', ['hi']],
    ]);
  });
});
```

- [ ] **Step 2: correr y verificar que falla**

Run: `npm test -- dupes`
Expected: FAIL.

- [ ] **Step 3: implementar**

`src/lib/dupes.js`:
```js
import { perfumeKey } from './perfume.js';
import { cleanText, compareText } from './normalize.js';

const byBrandName = (a, b) => compareText(a.brand, b.brand) || compareText(a.name, b.name);
const owned = (perfumes) => perfumes.filter((p) => p.status === 'owned');

// Índice clave(marca|nombre) → perfume de la colección (si hay varias concentraciones, gana el primero).
export function ownedIndex(perfumes) {
  const index = new Map();
  for (const p of owned(perfumes)) {
    const k = perfumeKey(p.brand, p.name);
    if (!index.has(k)) index.set(k, p);
  }
  return index;
}

export const findOriginal = (index, dupe) => index.get(perfumeKey(dupe.brand, dupe.name)) ?? null;

export function dupesOf(perfumes, original) {
  const key = perfumeKey(original.brand, original.name);
  return owned(perfumes)
    .filter((p) => p.id !== original.id && (p.dupeOf ?? []).some((d) => perfumeKey(d.brand, d.name) === key))
    .sort(byBrandName);
}

export function groupByOriginal(perfumes) {
  const index = ownedIndex(perfumes);
  const groups = new Map();
  for (const p of owned(perfumes)) {
    for (const d of p.dupeOf ?? []) {
      const key = perfumeKey(d.brand, d.name);
      if (!groups.has(key)) {
        const orig = index.get(key) ?? null;
        groups.set(key, { key, brand: orig?.brand ?? cleanText(d.brand), name: orig?.name ?? cleanText(d.name), owned: orig, dupes: [] });
      }
      const g = groups.get(key);
      if (!g.dupes.includes(p)) g.dupes.push(p);
    }
  }
  return [...groups.values()].map((g) => ({ ...g, dupes: [...g.dupes].sort(byBrandName) })).sort(byBrandName);
}
```

- [ ] **Step 4: correr tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: commit**

```bash
git add -A && git commit -m "feat: enlace de dupes con originales y agrupado por original" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Filtros, orden y resumen

**Files:**
- Create: `src/lib/filters.js`
- Test: `tests/unit/filters.test.js`

- [ ] **Step 1: tests**

`tests/unit/filters.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { EMPTY_FILTERS, filterPerfumes, sortPerfumes, summarize } from '../../src/lib/filters.js';

const P = [
  { id: '1', status: 'owned', brand: 'Lattafa', name: 'Khamrah Qahwa', concentration: 'edp', familyMain: 'gourmand', familySecondary: 'especiado', notes: ['Café', 'Canela'], seasons: ['invierno'], occasions: ['cita'], favorite: true, rating: 9, dupeOf: [{ brand: 'By Kilian', name: "Angels' Share" }] },
  { id: '2', status: 'owned', brand: 'Rasasi', name: 'Hawas Ice', concentration: 'edp', familyMain: 'acuatico', familySecondary: null, notes: ['Manzana'], seasons: ['verano'], occasions: ['diario'], favorite: false, rating: null, dupeOf: [] },
  { id: '3', status: 'owned', brand: 'Armaf', name: 'Odyssey Homme', concentration: 'parfum', familyMain: null, familySecondary: null, notes: [], seasons: [], occasions: [], favorite: false, rating: 6, dupeOf: [] },
];
const F = (patch) => ({ ...EMPTY_FILTERS, ...patch });
const ids = (list) => list.map((p) => p.id);

describe('filterPerfumes', () => {
  it('no filters returns all', () => {
    expect(ids(filterPerfumes(P, F({})))).toEqual(['1', '2', '3']);
  });
  it('search covers name, brand, notes and dupeOf, accent-insensitive, multi-word', () => {
    expect(ids(filterPerfumes(P, F({ q: 'cafe' })))).toEqual(['1']);
    expect(ids(filterPerfumes(P, F({ q: 'angels share' })))).toEqual(['1']);
    expect(ids(filterPerfumes(P, F({ q: 'kilian' })))).toEqual(['1']);
    expect(ids(filterPerfumes(P, F({ q: 'hawas' })))).toEqual(['2']);
    expect(ids(filterPerfumes(P, F({ q: 'lattafa qahwa' })))).toEqual(['1']);
  });
  it('mood, season, occasion, favorites, onlyDupes', () => {
    expect(ids(filterPerfumes(P, F({ mood: 'fresco' })))).toEqual(['2']);
    expect(ids(filterPerfumes(P, F({ mood: 'calido' })))).toEqual(['1']);
    expect(ids(filterPerfumes(P, F({ season: 'verano' })))).toEqual(['2']);
    expect(ids(filterPerfumes(P, F({ occasion: 'cita' })))).toEqual(['1']);
    expect(ids(filterPerfumes(P, F({ favorites: true })))).toEqual(['1']);
    expect(ids(filterPerfumes(P, F({ onlyDupes: true })))).toEqual(['1']);
  });
  it('brand, family (main or secondary), concentration, note', () => {
    expect(ids(filterPerfumes(P, F({ brand: 'armaf' })))).toEqual(['3']);
    expect(ids(filterPerfumes(P, F({ family: 'especiado' })))).toEqual(['1']);
    expect(ids(filterPerfumes(P, F({ concentration: 'parfum' })))).toEqual(['3']);
    expect(ids(filterPerfumes(P, F({ note: 'canela' })))).toEqual(['1']);
  });
});

describe('sortPerfumes', () => {
  it('by brand, name and rating (desc, empty last); does not mutate', () => {
    const copy = [...P];
    expect(ids(sortPerfumes(P, 'brand'))).toEqual(['3', '1', '2']);
    expect(ids(sortPerfumes(P, 'name'))).toEqual(['2', '1', '3']);
    expect(ids(sortPerfumes(P, 'rating'))).toEqual(['1', '3', '2']);
    expect(P).toEqual(copy);
  });
});

describe('summarize', () => {
  it('counts total, by mood and without family', () => {
    expect(summarize(P)).toEqual({ total: 3, byMood: { fresco: 1, calido: 1, floral: 0, amaderado: 0 }, noFamily: 1 });
  });
});
```

- [ ] **Step 2: correr y verificar que falla**

Run: `npm test -- filters`
Expected: FAIL.

- [ ] **Step 3: implementar**

`src/lib/filters.js`:
```js
import { MOODS, moodOf } from './constants.js';
import { normalize, compareText } from './normalize.js';

export const EMPTY_FILTERS = {
  q: '', mood: '', season: '', occasion: '', favorites: false, onlyDupes: false,
  brand: '', family: '', concentration: '', note: '',
};

function matchesQuery(p, q) {
  const words = normalize(q).split(' ').filter(Boolean);
  if (!words.length) return true;
  const hay = normalize([
    p.brand, p.name, ...(p.notes ?? []),
    ...(p.dupeOf ?? []).flatMap((d) => [d.brand, d.name]),
  ].join(' | '));
  return words.every((w) => hay.includes(w));
}

export function filterPerfumes(perfumes, f) {
  return perfumes.filter((p) =>
    matchesQuery(p, f.q)
    && (!f.mood || moodOf(p) === f.mood)
    && (!f.season || (p.seasons ?? []).includes(f.season))
    && (!f.occasion || (p.occasions ?? []).includes(f.occasion))
    && (!f.favorites || p.favorite === true)
    && (!f.onlyDupes || (p.dupeOf ?? []).length > 0)
    && (!f.brand || normalize(p.brand) === normalize(f.brand))
    && (!f.family || p.familyMain === f.family || p.familySecondary === f.family)
    && (!f.concentration || p.concentration === f.concentration)
    && (!f.note || (p.notes ?? []).some((n) => normalize(n) === normalize(f.note))));
}

const byBrandName = (a, b) => compareText(a.brand, b.brand) || compareText(a.name, b.name);
const SORTS = {
  brand: byBrandName,
  name: (a, b) => compareText(a.name, b.name) || compareText(a.brand, b.brand),
  rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || byBrandName(a, b),
};

export const sortPerfumes = (list, key) => [...list].sort(SORTS[key] ?? SORTS.brand);

export function summarize(perfumes) {
  const byMood = Object.fromEntries(MOODS.map((m) => [m.value, 0]));
  let noFamily = 0;
  for (const p of perfumes) {
    const m = moodOf(p);
    if (m) byMood[m] += 1;
    else noFamily += 1;
  }
  return { total: perfumes.length, byMood, noFamily };
}
```

- [ ] **Step 4: correr tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: commit**

```bash
git add -A && git commit -m "feat: filtros, orden y resumen de la colección" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Catálogos (marcas y notas) + semillas de notas y demo

**Files:**
- Create: `src/lib/catalog.js`, `src/seed/notes.js`, `src/seed/demo-perfumes.js`, `src/seed/brands.js` (versión mínima; se completa en Task 15)
- Test: `tests/unit/catalog.test.js`

- [ ] **Step 1: tests**

`tests/unit/catalog.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { brandOptions, noteOptions, searchOptions } from '../../src/lib/catalog.js';

describe('brandOptions', () => {
  it('merges seed, perfume brands and dupeOf brands, deduped and sorted', () => {
    const perfumes = [{ brand: 'lattafa', dupeOf: [{ brand: 'Creed', name: 'Aventus' }] }, { brand: 'Nueva Marca' }];
    expect(brandOptions(['Lattafa', 'Armaf'], perfumes)).toEqual(['Armaf', 'Creed', 'Lattafa', 'Nueva Marca']);
  });
});

describe('noteOptions', () => {
  it('merges seed with notes used in perfumes', () => {
    expect(noteOptions(['Vainilla'], [{ notes: ['vainilla', 'Café'] }, {}])).toEqual(['Café', 'Vainilla']);
  });
});

describe('searchOptions', () => {
  const opts = ['Al Haramain', 'Armaf', 'Armani', 'Lattafa', 'Maison Alhambra'];
  it('empty query returns the first N', () => {
    expect(searchOptions(opts, '', 2)).toEqual(['Al Haramain', 'Armaf']);
  });
  it('prefix matches first, then word starts, then contains', () => {
    expect(searchOptions(opts, 'al')).toEqual(['Al Haramain', 'Maison Alhambra']);
    expect(searchOptions(opts, 'arm')).toEqual(['Armaf', 'Armani']);
    expect(searchOptions(opts, 'ttaf')).toEqual(['Lattafa']);
  });
  it('is accent-insensitive', () => {
    expect(searchOptions(['Café', 'Cacao'], 'cafe')).toEqual(['Café']);
  });
});
```

- [ ] **Step 2: correr y verificar que falla**

Run: `npm test -- catalog`
Expected: FAIL.

- [ ] **Step 3: implementar catalog.js**

`src/lib/catalog.js`:
```js
import { normalize, uniqueSorted } from './normalize.js';

export const brandOptions = (seed, perfumes) => uniqueSorted([
  ...seed,
  ...perfumes.map((p) => p.brand),
  ...perfumes.flatMap((p) => (p.dupeOf ?? []).map((d) => d.brand)),
]);

export const noteOptions = (seed, perfumes) => uniqueSorted([...seed, ...perfumes.flatMap((p) => p.notes ?? [])]);

export function searchOptions(options, q, limit = 50) {
  const n = normalize(q);
  if (!n) return options.slice(0, limit);
  const prefix = [];
  const word = [];
  const inside = [];
  for (const o of options) {
    const k = normalize(o);
    if (k.startsWith(n)) prefix.push(o);
    else if (k.includes(` ${n}`)) word.push(o);
    else if (k.includes(n)) inside.push(o);
  }
  return [...prefix, ...word, ...inside].slice(0, limit);
}
```

- [ ] **Step 4: semilla de notas**

`src/seed/notes.js`:
```js
// Notas comunes en español (estilo Fragrantica ES). El catálogo final = esto ∪ notas usadas en los perfumes.
export const NOTE_SEED = [
  'Abedul', 'Absenta', 'Acorde marino', 'Acorde acuoso', 'Acorde de ozono', 'Agua de mar', 'Akigalawood', 'Albahaca',
  'Algodón de azúcar', 'Almendra', 'Almizcle', 'Almizcle blanco', 'Ámbar', 'Ámbar gris', 'Ambrette', 'Ambroxan', 'Anís',
  'Anís estrellado', 'Azafrán', 'Azahar', 'Bálsamo de Perú', 'Bálsamo de Tolú', 'Benjuí', 'Bergamota', 'Cacao', 'Café',
  'Canela', 'Caramelo', 'Cardamomo', 'Cashmeran', 'Castaña', 'Cedro', 'Cedro de Virginia', 'Cereza', 'Chocolate', 'Ciprés',
  'Ciruela', 'Cistus', 'Clavel', 'Clavo de olor', 'Coco', 'Coñac', 'Comino', 'Cuero', 'Cúrcuma', 'Dátil', 'Elemi', 'Enebro',
  'Estragón', 'Eucalipto', 'Frambuesa', 'Frutos rojos', 'Frutos negros', 'Gálbano', 'Gardenia', 'Geranio', 'Grosella negra',
  'Guayaco', 'Haba tonka', 'Heliotropo', 'Helecho', 'Heno', 'Hierba', 'Higo', 'Hoja de higuera', 'Hoja de violeta', 'Iris',
  'Incienso', 'Jazmín', 'Jengibre', 'Labdanum', 'Lavanda', 'Lavandín', 'Lima', 'Limón', 'Lirio de los valles', 'Litchi',
  'Madera de cachemira', 'Madera de oud', 'Maderas ambarinas', 'Maderas cremosas', 'Mandarina', 'Mandarina verde', 'Mango',
  'Manzana', 'Manzana verde', 'Melón', 'Menta', 'Menta piperita', 'Miel', 'Mirra', 'Musgo', 'Musgo de roble', 'Naranja',
  'Naranja amarga', 'Narciso', 'Neroli', 'Nuez moscada', 'Olíbano', 'Orquídea', 'Osmanthus', 'Oud', 'Pachulí', 'Palisandro',
  'Palo santo', 'Papiro', 'Pera', 'Petitgrain', 'Pimienta', 'Pimienta negra', 'Pimienta rosa', 'Pino', 'Piña', 'Pistacho',
  'Pomelo', 'Praliné', 'Regaliz', 'Resinas', 'Romero', 'Ron', 'Rosa', 'Rosa de Damasco', 'Rosa de Mayo', 'Salvia',
  'Salvia esclarea', 'Sal marina', 'Sándalo', 'Styrax', 'Tabaco', 'Té', 'Té negro', 'Té verde', 'Tomillo', 'Toronja',
  'Tuberosa', 'Vainilla', 'Vainilla de Madagascar', 'Vetiver', 'Violeta', 'Whisky', 'Ylang-ylang', 'Yuzu', 'Zanahoria',
  'Ámbar oscuro', 'Avellana', 'Bayas de enebro', 'Calone', 'Caramelo salado', 'Cedrat', 'Cuero de gamuza', 'Durazno',
  'Flor de loto', 'Hierbas aromáticas', 'Hojas verdes', 'Humo', 'Lavanda francesa', 'Lirio', 'Magnolia', 'Maracuyá',
  'Notas acuáticas', 'Notas amaderadas', 'Notas verdes', 'Peonía', 'Pimiento', 'Vetiver de Haití', 'Mate', 'Bourbon',
];
```

(La lista no debe tener duplicados por `normalize`; el test de semillas en Task 15 lo verifica.)

- [ ] **Step 5: semilla de marcas mínima (se completa en Task 15)**

`src/seed/brands.js`:
```js
// Catálogo precargado de marcas. Se completa a ≥600 en Task 15.
export const BRAND_SEED = [
  'Afnan', 'Al Haramain', 'Armaf', 'Azzaro', 'Carolina Herrera', 'Creed', 'Dior', 'Dolce & Gabbana', 'French Avenue',
  'Giorgio Armani', 'Lattafa', 'Paco Rabanne', 'Rasasi', 'Versace', 'Yves Saint Laurent',
];
```

- [ ] **Step 6: perfumes de demo**

`src/seed/demo-perfumes.js`:
```js
// Datos de ejemplo para el modo demo (http://localhost:5174/?demo). No se usan en producción.
export const DEMO_PERFUMES = [
  { brand: 'Lattafa', name: 'Khamrah Qahwa', concentration: 'edp', status: 'owned', dupeOf: [{ brand: 'By Kilian', name: "Angels' Share" }], familyMain: 'gourmand', familySecondary: 'especiado', notes: ['Café', 'Canela', 'Cardamomo', 'Praliné', 'Vainilla', 'Haba tonka'], seasons: ['invierno'], occasions: ['salida', 'cita'], timeOfDay: 'noche', rating: 9, favorite: true },
  { brand: 'Armaf', name: 'Club de Nuit Iconic', concentration: 'edp', status: 'owned', dupeOf: [{ brand: 'Chanel', name: 'Bleu de Chanel EDP' }], familyMain: 'aromatico', familySecondary: 'amaderado', notes: ['Pomelo', 'Menta', 'Jengibre', 'Incienso', 'Sándalo', 'Cedro'], seasons: ['todo_el_anio'], occasions: ['diario', 'oficina'], timeOfDay: 'ambos', rating: 8, favorite: false },
  { brand: 'Dior', name: 'Sauvage', concentration: 'edt', status: 'owned', dupeOf: [], familyMain: 'aromatico', familySecondary: 'especiado', notes: ['Bergamota', 'Pimienta', 'Lavanda', 'Ambroxan', 'Cedro'], seasons: ['todo_el_anio'], occasions: ['diario', 'oficina', 'salida'], timeOfDay: 'ambos', rating: 7, favorite: false },
  { brand: 'Paco Rabanne', name: 'Invictus Aqua', concentration: 'edt', status: 'owned', dupeOf: [], familyMain: 'acuatico', familySecondary: 'citrico', notes: ['Pomelo', 'Notas acuáticas', 'Laurel', 'Ambroxan'], seasons: ['verano'], occasions: ['diario'], timeOfDay: 'dia', rating: 7, favorite: false },
  { brand: 'Rasasi', name: 'Hawas Ice', concentration: 'edp', status: 'owned', dupeOf: [{ brand: 'Paco Rabanne', name: 'Invictus Aqua' }], familyMain: 'acuatico', familySecondary: 'frutal', notes: ['Manzana', 'Bergamota', 'Notas acuáticas', 'Ámbar gris'], seasons: ['verano'], occasions: ['diario', 'salida'], timeOfDay: 'dia', rating: 8, favorite: true },
  { brand: 'Versace', name: 'Eros Energy', concentration: 'edp', status: 'owned', dupeOf: [], familyMain: 'citrico', familySecondary: null, notes: ['Limón', 'Bergamota', 'Pomelo', 'Pimienta rosa', 'Almizcle'], seasons: ['verano', 'entretiempo'], occasions: ['diario', 'salida'], timeOfDay: 'dia', rating: null, favorite: false },
  { brand: 'Jean Paul Gaultier', name: 'Le Male Elixir', concentration: 'parfum', status: 'owned', dupeOf: [], familyMain: 'oriental_ambar', familySecondary: 'gourmand', notes: ['Lavanda', 'Menta', 'Vainilla', 'Benjuí', 'Haba tonka', 'Tabaco'], seasons: ['invierno'], occasions: ['salida', 'cita', 'evento'], timeOfDay: 'noche', rating: 9, favorite: true },
  { brand: 'Zara', name: 'w/End till 8PM', concentration: 'edt', status: 'owned' },
  { brand: 'Creed', name: 'Aventus', concentration: 'edp', status: 'wishlist', familyMain: 'frutal', familySecondary: 'amaderado', notes: ['Piña', 'Bergamota', 'Abedul', 'Pachulí', 'Almizcle'], seasons: ['todo_el_anio'] },
];
```

- [ ] **Step 7: correr tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: commit**

```bash
git add -A && git commit -m "feat: catálogos de marcas/notas con buscador y semillas iniciales" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Sugerencias "¿Qué me pongo hoy?"

**Files:**
- Create: `src/lib/suggest.js`
- Test: `tests/unit/suggest.test.js`

- [ ] **Step 1: tests**

`tests/unit/suggest.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { seasonFromDate, climateFromTemp, climateFromSeason, isDaytime, scorePerfume, weightedPick, suggest } from '../../src/lib/suggest.js';

const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };
const ctx = { climate: 'mild', occasion: 'diario', daytime: true };
const s = (p, c = {}) => scorePerfume({ occasions: ['diario'], ...p }, { ...ctx, ...c });

describe('season and climate', () => {
  it('southern hemisphere seasons by month', () => {
    expect(seasonFromDate(new Date(2026, 0, 15))).toBe('verano');
    expect(seasonFromDate(new Date(2026, 11, 1))).toBe('verano');
    expect(seasonFromDate(new Date(2026, 6, 1))).toBe('invierno');
    expect(seasonFromDate(new Date(2026, 3, 1))).toBe('entretiempo');
    expect(seasonFromDate(new Date(2026, 9, 4))).toBe('entretiempo');
  });
  it('climate thresholds: >25 hot, <15 cold', () => {
    expect(climateFromTemp(30)).toBe('hot');
    expect(climateFromTemp(25)).toBe('mild');
    expect(climateFromTemp(15)).toBe('mild');
    expect(climateFromTemp(14.9)).toBe('cold');
  });
  it('climate from season', () => {
    expect(climateFromSeason('verano')).toBe('hot');
    expect(climateFromSeason('invierno')).toBe('cold');
    expect(climateFromSeason('entretiempo')).toBe('mild');
  });
  it('daytime is 7 to 19', () => {
    expect(isDaytime(7)).toBe(true);
    expect(isDaytime(18)).toBe(true);
    expect(isDaytime(19)).toBe(false);
    expect(isDaytime(3)).toBe(false);
  });
});

describe('scorePerfume', () => {
  it('occasion: excluded if set and not matching, reduced if empty', () => {
    expect(scorePerfume({ occasions: ['cita'] }, ctx)).toBe(0);
    expect(scorePerfume({}, ctx)).toBeCloseTo(0.4);
    expect(s({})).toBe(1);
  });
  it('hot favors fresh, penalizes warm', () => {
    expect(s({ familyMain: 'citrico' }, { climate: 'hot' })).toBe(3);
    expect(s({ familyMain: 'gourmand' }, { climate: 'hot' })).toBeCloseTo(0.3);
    expect(s({ familyMain: 'citrico', seasons: ['verano'] }, { climate: 'hot' })).toBe(6);
  });
  it('cold favors warm + winter', () => {
    expect(s({ familyMain: 'gourmand', seasons: ['invierno'] }, { climate: 'cold' })).toBe(6);
    expect(s({ familyMain: 'acuatico' }, { climate: 'cold' })).toBeCloseTo(0.3);
  });
  it('mild favors entretiempo; todo el año always helps', () => {
    expect(s({ seasons: ['entretiempo'] })).toBe(2);
    expect(s({ seasons: ['todo_el_anio'] })).toBe(1.5);
  });
  it('time of day', () => {
    expect(s({ timeOfDay: 'noche' })).toBe(0.5);
    expect(s({ timeOfDay: 'dia' })).toBe(1.5);
    expect(s({ timeOfDay: 'ambos' })).toBe(1.5);
    expect(s({ timeOfDay: 'noche' }, { daytime: false })).toBe(1.5);
  });
  it('favorite and rating', () => {
    expect(s({ favorite: true })).toBe(2);
    expect(s({ rating: 10 })).toBeCloseTo(1.5);
    expect(s({ rating: 1 })).toBeCloseTo(0.6);
  });
});

describe('weightedPick', () => {
  it('picks by weight without repetition', () => {
    expect(weightedPick(['a', 'b', 'c'], [1, 1, 2], 3, seq([0.99, 0, 0]))).toEqual(['c', 'a', 'b']);
  });
  it('never picks zero weights and returns fewer if not enough', () => {
    expect(weightedPick(['a', 'b', 'c'], [0, 1, 0], 3, seq([0.5]))).toEqual(['b']);
  });
});

describe('suggest', () => {
  const list = ['a', 'b', 'c', 'd'].map((id) => ({ id, status: 'owned', occasions: ['diario'] }))
    .concat({ id: 'w', status: 'wishlist', occasions: ['diario'] });
  it('returns 3 distinct owned perfumes', () => {
    const r = suggest(list, ctx, seq([0.1, 0.5, 0.9])).map((p) => p.id);
    expect(r).toHaveLength(3);
    expect(new Set(r).size).toBe(3);
    expect(r).not.toContain('w');
  });
  it('avoids excluded ones and fills from them only if needed', () => {
    const r = suggest(list, { ...ctx, exclude: new Set(['a', 'b', 'c']) }, seq([0])).map((p) => p.id);
    expect(r[0]).toBe('d');
    expect(r).toHaveLength(3);
  });
  it('empty collection gives no suggestions', () => {
    expect(suggest([], ctx)).toEqual([]);
  });
});
```

- [ ] **Step 2: correr y verificar que falla**

Run: `npm test -- suggest`
Expected: FAIL.

- [ ] **Step 3: implementar**

`src/lib/suggest.js`:
```js
import { moodOf } from './constants.js';

// Hemisferio sur: dic–feb verano, jun–ago invierno, resto entretiempo.
export function seasonFromDate(date) {
  const m = date.getMonth();
  if (m === 11 || m <= 1) return 'verano';
  if (m >= 5 && m <= 7) return 'invierno';
  return 'entretiempo';
}

export const climateFromTemp = (t) => (t > 25 ? 'hot' : t < 15 ? 'cold' : 'mild');
export const climateFromSeason = (s) => (s === 'verano' ? 'hot' : s === 'invierno' ? 'cold' : 'mild');
export const isDaytime = (hour) => hour >= 7 && hour < 19;

export function scorePerfume(p, { climate, occasion, daytime }) {
  let w = 1;
  const occasions = p.occasions ?? [];
  if (occasion) {
    if (occasions.length && !occasions.includes(occasion)) return 0;
    if (!occasions.length) w *= 0.4;
  }
  const mood = moodOf(p);
  const seasons = p.seasons ?? [];
  if (climate === 'hot') {
    if (mood === 'fresco') w *= 3;
    else if (mood === 'calido') w *= 0.3;
    if (seasons.includes('verano')) w *= 2;
  } else if (climate === 'cold') {
    if (mood === 'calido') w *= 3;
    else if (mood === 'fresco') w *= 0.3;
    if (seasons.includes('invierno')) w *= 2;
  } else if (seasons.includes('entretiempo')) {
    w *= 2;
  }
  if (seasons.includes('todo_el_anio')) w *= 1.5;
  if (p.timeOfDay) {
    const match = p.timeOfDay === 'ambos' || (p.timeOfDay === 'dia') === daytime;
    w *= match ? 1.5 : 0.5;
  }
  if (p.favorite) w *= 2;
  if (Number.isInteger(p.rating)) w *= 1 + (p.rating - 5) / 10;
  return w;
}

// Sorteo ponderado sin reposición.
export function weightedPick(items, weights, n, rng = Math.random) {
  const pool = items.map((item, i) => ({ item, w: weights[i] })).filter((x) => x.w > 0);
  const out = [];
  while (out.length < n && pool.length) {
    const total = pool.reduce((sum, x) => sum + x.w, 0);
    let r = rng() * total;
    let i = 0;
    for (; i < pool.length - 1; i++) {
      r -= pool[i].w;
      if (r < 0) break;
    }
    out.push(pool[i].item);
    pool.splice(i, 1);
  }
  return out;
}

export function suggest(perfumes, { exclude = new Set(), ...ctx }, rng = Math.random, n = 3) {
  const scored = perfumes
    .filter((p) => p.status === 'owned')
    .map((p) => ({ p, w: scorePerfume(p, ctx) }))
    .filter((x) => x.w > 0);
  const fresh = scored.filter((x) => !exclude.has(x.p.id));
  const first = weightedPick(fresh.map((x) => x.p), fresh.map((x) => x.w), n, rng);
  if (first.length >= n) return first;
  const rest = scored.filter((x) => !first.includes(x.p));
  return [...first, ...weightedPick(rest.map((x) => x.p), rest.map((x) => x.w), n - first.length, rng)];
}
```

- [ ] **Step 4: correr tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: commit**

```bash
git add -A && git commit -m "feat: algoritmo de sugerencias por clima, ocasión y momento" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Clima (etiquetas) e importador

**Files:**
- Create: `src/lib/weather.js`, `src/lib/importer.js`
- Test: `tests/unit/weather.test.js`, `tests/unit/importer.test.js`

- [ ] **Step 1: tests**

`tests/unit/weather.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { weatherLabel } from '../../src/lib/weather.js';

describe('weatherLabel', () => {
  it('maps WMO codes', () => {
    expect(weatherLabel(0).label).toBe('Despejado');
    expect(weatherLabel(2).label).toBe('Parcialmente nublado');
    expect(weatherLabel(3).label).toBe('Nublado');
    expect(weatherLabel(45).label).toBe('Niebla');
    expect(weatherLabel(53).label).toBe('Llovizna');
    expect(weatherLabel(63).label).toBe('Lluvia');
    expect(weatherLabel(81).label).toBe('Lluvia');
    expect(weatherLabel(73).label).toBe('Nieve');
    expect(weatherLabel(95).label).toBe('Tormenta');
    expect(weatherLabel(999).label).toBe('Tormenta');
    expect(weatherLabel(20).label).toBe('Clima');
  });
});
```

`tests/unit/importer.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { parseImport } from '../../src/lib/importer.js';

const ok = { brand: 'Lattafa', name: 'Asad', concentration: 'edp', _changes: ['x'] };

describe('parseImport', () => {
  it('accepts an array', () => {
    const r = parseImport([ok]);
    expect(r.errors).toEqual([]);
    expect(r.items).toHaveLength(1);
    expect(r.items[0].brand).toBe('Lattafa');
    expect(r.items[0]).not.toHaveProperty('_changes');
  });
  it('accepts { perfumes: [...] }', () => {
    expect(parseImport({ perfumes: [ok] }).items).toHaveLength(1);
  });
  it('reports invalid entries with index and label', () => {
    const r = parseImport([ok, { brand: 'Armaf', concentration: 'edp' }]);
    expect(r.items).toHaveLength(1);
    expect(r.errors).toEqual([{ index: 1, label: 'Armaf', errors: ['Falta el nombre'] }]);
  });
  it('rejects non-lists', () => {
    expect(parseImport({ foo: 1 }).errors[0].errors).toEqual(['Se esperaba una lista de perfumes']);
  });
});
```

- [ ] **Step 2: correr y verificar que fallan**

Run: `npm test`
Expected: FAIL.

- [ ] **Step 3: implementar**

`src/lib/weather.js`:
```js
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
```

`src/lib/importer.js`:
```js
import { preparePerfume } from './perfume.js';

export function parseImport(json) {
  const list = Array.isArray(json) ? json : json?.perfumes;
  if (!Array.isArray(list)) return { items: [], errors: [{ index: -1, label: 'archivo', errors: ['Se esperaba una lista de perfumes'] }] };
  const items = [];
  const errors = [];
  list.forEach((raw, index) => {
    const { errors: e, data } = preparePerfume(raw ?? {});
    if (e.length) errors.push({ index, label: `${raw?.brand ?? '?'} ${raw?.name ?? ''}`.trim(), errors: e });
    else items.push(data);
  });
  return { items, errors };
}
```

- [ ] **Step 4: correr tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: commit**

```bash
git add -A && git commit -m "feat: etiquetas de clima e importador de JSON" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Reglas de Firestore

**Files:**
- Create: `firestore.rules`
- Test: `tests/rules/firestore.rules.test.js`

Prerrequisito: Java disponible (JDK 21 portable en `~/.jdks`, `JAVA_HOME` de usuario ya configurado) y `firebase` CLI global (ya se usó en inventario-samples).

- [ ] **Step 1: test**

`tests/rules/firestore.rules.test.js`:
```js
import { describe, it, beforeAll, beforeEach, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';

const OWNER = 'rodri.rita24@gmail.com';
let env;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-perfumes',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'perfumes/p1'), { brand: 'Lattafa', name: 'Asad' }));
});

afterAll(() => env.cleanup());

const as = (email, verified = true) => env.authenticatedContext(email, { email, email_verified: verified }).firestore();

describe('owner', () => {
  it('reads and writes perfumes', async () => {
    const db = as(OWNER);
    await assertSucceeds(getDocs(collection(db, 'perfumes')));
    await assertSucceeds(setDoc(doc(db, 'perfumes/p2'), { brand: 'Armaf', name: 'Odyssey' }));
    await assertSucceeds(deleteDoc(doc(db, 'perfumes/p1')));
  });
  it('email match is case-insensitive', async () => {
    await assertSucceeds(getDoc(doc(as('Rodri.Rita24@gmail.com'), 'perfumes/p1')));
  });
  it('unverified email is denied', async () => {
    await assertFails(getDoc(doc(as(OWNER, false), 'perfumes/p1')));
  });
  it('other collections are closed', async () => {
    await assertFails(setDoc(doc(as(OWNER), 'otra/x'), { a: 1 }));
  });
});

describe('others', () => {
  it('stranger cannot read or write', async () => {
    const db = as('otro@example.com');
    await assertFails(getDocs(collection(db, 'perfumes')));
    await assertFails(setDoc(doc(db, 'perfumes/x'), { brand: 'X' }));
  });
  it('unauthenticated cannot read', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'perfumes/p1')));
  });
});
```

- [ ] **Step 2: reglas mínimas abiertas para ver fallar los tests de "others"**

`firestore.rules`:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if true; }
  }
}
```

Run: `npm run test:rules`
Expected: FAIL en "unverified email is denied", "other collections are closed", "stranger…", "unauthenticated…".

- [ ] **Step 3: reglas reales**

`firestore.rules`:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isOwner() {
      return request.auth != null
        && request.auth.token.email_verified == true
        && request.auth.token.email is string
        && request.auth.token.email.lower() == 'rodri.rita24@gmail.com';
    }
    match /perfumes/{perfumeId} {
      allow read, write: if isOwner();
    }
  }
}
```

- [ ] **Step 4: correr tests de reglas**

Run: `npm run test:rules`
Expected: PASS (6 tests).

- [ ] **Step 5: commit**

```bash
git add -A && git commit -m "feat: reglas de Firestore (solo el dueño) con tests" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Capa de datos (Firebase, demo, clima)

**Files:**
- Create: `src/config.js`, `src/fs.js`, `src/data/backend.js`, `src/data/demo.js`, `src/data/weather.js`

Sin tests unitarios (I/O); se verifican en Task 18 (demo) y Task 19 (real).

- [ ] **Step 1: config y re-export del SDK**

`src/config.js`:
```js
export const OWNER_EMAIL = 'rodri.rita24@gmail.com';

// Salida de `firebase apps:sdkconfig web --project <id>` (se completa en Task 16).
// La apiKey web de Firebase es pública por diseño; la seguridad está en firestore.rules.
export const firebaseConfig = {};
```

`src/fs.js`:
```js
export * from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
```

- [ ] **Step 2: backend real**

`src/data/backend.js`:
```js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, writeBatch,
} from '../fs.js';
import { firebaseConfig, OWNER_EMAIL } from '../config.js';
import { preparePerfume } from '../lib/perfume.js';
import { ValidationError } from '../lib/errors.js';
import { chunk } from '../lib/chunk.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// Caché persistente: la colección se ve sin conexión y las escrituras se sincronizan al volver.
const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
const col = collection(db, 'perfumes');

export const login = () => signInWithPopup(auth, new GoogleAuthProvider());
export const logout = () => signOut(auth);
export const onUser = (cb) => onAuthStateChanged(auth, cb);
export const isOwner = (user) => !!user?.emailVerified && user.email?.toLowerCase() === OWNER_EMAIL;

export function subscribePerfumes(onData, onError) {
  return onSnapshot(col, (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), onError);
}

function validated(input) {
  const { errors, data } = preparePerfume(input);
  if (errors.length) throw new ValidationError(errors);
  return data;
}

// Las escrituras se aplican al instante en la caché local; `done`/la promesa resuelven cuando llegan al servidor.
export function createPerfume(input) {
  const data = validated(input);
  const ref = doc(col);
  return { id: ref.id, done: setDoc(ref, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }) };
}

export function updatePerfume(id, input) {
  const data = validated(input);
  return updateDoc(doc(col, id), { ...data, updatedAt: serverTimestamp() });
}

export const patchPerfume = (id, patch) => updateDoc(doc(col, id), { ...patch, updatedAt: serverTimestamp() });
export const removePerfume = (id) => deleteDoc(doc(col, id));

export async function importPerfumes(items, onProgress = () => {}) {
  let done = 0;
  for (const part of chunk(items, 400)) {
    const batch = writeBatch(db);
    for (const data of part) batch.set(doc(col), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    await batch.commit();
    done += part.length;
    onProgress(done);
  }
  return done;
}
```

- [ ] **Step 3: backend demo**

`src/data/demo.js`:
```js
// Backend en memoria con la misma interfaz que backend.js. Solo para probar en localhost con ?demo.
import { preparePerfume } from '../lib/perfume.js';
import { ValidationError } from '../lib/errors.js';
import { DEMO_PERFUMES } from '../seed/demo-perfumes.js';

let perfumes = DEMO_PERFUMES.map((p, i) => ({ id: `demo${i}`, ...preparePerfume(p).data }));
let listener = null;
let seq = 1000;

const emit = () => setTimeout(() => listener?.(perfumes.map((p) => ({ ...p }))), 0);

function validated(input) {
  const { errors, data } = preparePerfume(input);
  if (errors.length) throw new ValidationError(errors);
  return data;
}

export const login = async () => {};
export const logout = async () => { location.href = location.pathname; };
export const onUser = (cb) => { setTimeout(() => cb({ email: 'demo@local', emailVerified: true }), 0); return () => {}; };
export const isOwner = () => true;

export function subscribePerfumes(onData) {
  listener = onData;
  emit();
  return () => { listener = null; };
}

export function createPerfume(input) {
  const data = validated(input);
  const id = `demo${seq++}`;
  perfumes.push({ id, ...data });
  emit();
  return { id, done: Promise.resolve() };
}

export async function updatePerfume(id, input) {
  const data = validated(input);
  perfumes = perfumes.map((p) => (p.id === id ? { id, ...data } : p));
  emit();
}

export async function patchPerfume(id, patch) {
  perfumes = perfumes.map((p) => (p.id === id ? { ...p, ...patch } : p));
  emit();
}

export async function removePerfume(id) {
  perfumes = perfumes.filter((p) => p.id !== id);
  emit();
}

export async function importPerfumes(items, onProgress = () => {}) {
  for (const data of items) perfumes.push({ id: `demo${seq++}`, ...data });
  emit();
  onProgress(items.length);
  return items.length;
}
```

- [ ] **Step 4: clima**

`src/data/weather.js`:
```js
export function getPosition(timeout = 8000) {
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
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo respondió ${res.status}`);
  const json = await res.json();
  return { temp: json.current.temperature_2m, code: json.current.weather_code };
}
```

- [ ] **Step 5: verificar que los tests siguen pasando**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: commit**

```bash
git add -A && git commit -m "feat: capa de datos (Firebase con caché offline, backend demo, clima)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Shell de la app (HTML, PWA, estilos, auth, navegación, router)

**Files:**
- Create: `index.html`, `manifest.webmanifest`, `tools/make-icons.ps1`, `icons/*.png`, `styles.css`, `src/ui/dom.js`, `src/ui/theme.js`, `src/ui/screens.js`, `src/ui/nav.js`, `src/main.js`
- Create (stubs que se reemplazan en tasks siguientes): `src/ui/collection.js`, `src/ui/today.js`, `src/ui/dupes.js`, `src/ui/detail.js`, `src/ui/add.js`, `src/ui/importer.js`

- [ ] **Step 1: index.html y manifest**

`index.html`:
```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Mis Perfumes</title>
  <meta name="theme-color" content="#5b3fa0">
  <link rel="manifest" href="manifest.webmanifest">
  <link rel="icon" type="image/png" href="icons/icon-192.png">
  <link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-title" content="Perfumes">
  <link rel="stylesheet" href="styles.css">
  <script type="module" src="src/main.js"></script>
</head>
<body>
  <div id="app"><div class="center-screen"><span class="muted">Cargando…</span></div></div>
  <dialog id="dialog"></dialog>
  <div id="toasts" class="toasts" aria-live="polite"></div>
</body>
</html>
```

`manifest.webmanifest`:
```json
{
  "name": "Mis Perfumes",
  "short_name": "Perfumes",
  "start_url": "./#/coleccion",
  "scope": "./",
  "display": "standalone",
  "background_color": "#121016",
  "theme_color": "#5b3fa0",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

- [ ] **Step 2: íconos**

`tools/make-icons.ps1`:
```powershell
# Genera los íconos PNG de la PWA: frasco blanco sobre fondo violeta (dentro de la zona segura maskable).
Add-Type -AssemblyName System.Drawing
$out = Join-Path $PSScriptRoot '..\icons'
New-Item -ItemType Directory -Force $out | Out-Null

function Make-Icon([int]$size, [string]$name) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::FromArgb(91, 63, 160))
  $s = $size / 512.0
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 255))
  $soft = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(190, 255, 255, 255))
  $liquid = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(200, 169, 139, 240))
  $g.FillRectangle($white, [single](216 * $s), [single](110 * $s), [single](80 * $s), [single](60 * $s))
  $g.FillRectangle($soft, [single](236 * $s), [single](170 * $s), [single](40 * $s), [single](30 * $s))
  $x = [single](136 * $s); $y = [single](200 * $s); $w = [single](240 * $s); $h = [single](210 * $s); $r = [single](56 * $s)
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc($x, $y, $r, $r, 180, 90)
  $path.AddArc($x + $w - $r, $y, $r, $r, 270, 90)
  $path.AddArc($x + $w - $r, $y + $h - $r, $r, $r, 0, 90)
  $path.AddArc($x, $y + $h - $r, $r, $r, 90, 90)
  $path.CloseFigure()
  $g.FillPath($white, $path)
  $g.FillRectangle($liquid, [single](168 * $s), [single](300 * $s), [single](176 * $s), [single](80 * $s))
  $g.Dispose()
  $bmp.Save((Join-Path $out $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

Make-Icon 192 'icon-192.png'
Make-Icon 512 'icon-512.png'
Make-Icon 180 'apple-touch-icon.png'
```

Run (PowerShell): `powershell -ExecutionPolicy Bypass -File C:\Users\rodri\perfumes\tools\make-icons.ps1; Get-ChildItem C:\Users\rodri\perfumes\icons`
Expected: 3 PNG (`icon-192.png`, `icon-512.png`, `apple-touch-icon.png`). Abrir `icon-512.png` con Read para ver que se ve un frasco.

- [ ] **Step 3: styles.css**

`styles.css`:
```css
:root {
  --bg: #f6f4fa; --surface: #ffffff; --surface-2: #efebf7; --border: #e0dae9;
  --text: #1f1a2b; --muted: #6c6580; --primary: #5b3fa0; --primary-text: #ffffff;
  --danger: #c43d3d; --ok: #1d8f4e;
  --shadow: 0 1px 3px rgba(30, 20, 60, .08); --radius: 12px;
  --fam-mix: black;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #121016; --surface: #1c1922; --surface-2: #262230; --border: #332d3f;
    --text: #ece8f3; --muted: #9d95ad; --primary: #a98bf0; --primary-text: #160f26;
    --danger: #f07070; --ok: #4cc483;
    --shadow: 0 1px 3px rgba(0, 0, 0, .4);
    --fam-mix: white;
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --bg: #121016; --surface: #1c1922; --surface-2: #262230; --border: #332d3f;
  --text: #ece8f3; --muted: #9d95ad; --primary: #a98bf0; --primary-text: #160f26;
  --danger: #f07070; --ok: #4cc483;
  --shadow: 0 1px 3px rgba(0, 0, 0, .4);
  --fam-mix: white;
  color-scheme: dark;
}

* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.45 system-ui, "Segoe UI", Roboto, sans-serif; }
a { color: var(--primary); }
h2 { margin: 0; font-size: 20px; line-height: 1.2; }
h3 { margin: 0 0 6px; font-size: 13px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); }
.muted { color: var(--muted); }
.center { text-align: center; }
.ok { color: var(--ok); }
.badge { display: inline-block; font-size: 11px; font-weight: 500; padding: 1px 7px; border-radius: 99px; background: var(--surface-2); color: var(--muted); vertical-align: middle; text-transform: none; letter-spacing: 0; }
code { font-family: ui-monospace, Consolas, monospace; font-size: 13px; }

.btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 38px; border: 1px solid var(--border); background: var(--surface); color: var(--text); border-radius: 8px; padding: 7px 12px; font: inherit; cursor: pointer; text-decoration: none; }
.btn:hover { background: var(--surface-2); }
.btn:disabled { opacity: .5; cursor: default; }
.btn-primary { background: var(--primary); border-color: var(--primary); color: var(--primary-text); }
.btn-primary:hover { filter: brightness(1.08); background: var(--primary); }
.btn-danger { color: var(--danger); border-color: var(--danger); }
.btn-ghost { border-color: transparent; background: transparent; }
.btn-small { min-height: 30px; padding: 4px 10px; font-size: 13px; }
.btn-big { min-height: 48px; padding: 12px 22px; font-size: 16px; }
.icon-btn { border: 0; background: transparent; color: var(--text); font-size: 18px; padding: 6px 8px; border-radius: 6px; cursor: pointer; }
.icon-btn:hover { background: var(--surface-2); }

input, select { width: 100%; font: inherit; font-size: 16px; color: var(--text); background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; min-width: 0; }
input:focus, select:focus { outline: 2px solid var(--primary); outline-offset: -1px; }
label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--muted); }
label.check { flex-direction: row; align-items: center; gap: 8px; color: var(--text); font-size: 15px; }
label.check input { width: auto; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 13px; color: var(--muted); }

.center-screen { min-height: 100vh; display: grid; place-items: center; padding: 16px; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); padding: 28px; max-width: 420px; text-align: center; }
.card h1 { font-size: 22px; margin: 0 0 8px; }
.card p { color: var(--muted); }

.topbar { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; gap: 10px; padding: 10px 16px; padding-top: calc(10px + env(safe-area-inset-top)); background: var(--surface); border-bottom: 1px solid var(--border); }
.brand-title { font-weight: 700; font-size: 18px; color: var(--text); text-decoration: none; margin-right: auto; white-space: nowrap; }
.top-tabs { display: none; gap: 4px; }
.top-tab { display: flex; gap: 6px; padding: 6px 12px; border-radius: 8px; color: var(--muted); text-decoration: none; }
.top-tab.active { background: var(--surface-2); color: var(--text); font-weight: 600; }
.topbar-actions { display: flex; align-items: center; gap: 4px; }
.main { padding: 14px 16px 96px; max-width: 1200px; margin: 0 auto; }
.bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; z-index: 5; display: grid; grid-template-columns: repeat(4, 1fr); background: var(--surface); border-top: 1px solid var(--border); padding-bottom: env(safe-area-inset-bottom); }
.bottom-tab { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 0 6px; font-size: 12px; color: var(--muted); text-decoration: none; }
.bottom-tab .tab-icon { font-size: 20px; }
.bottom-tab.active { color: var(--primary); font-weight: 600; }
@media (min-width: 769px) {
  .top-tabs { display: flex; }
  .bottom-nav { display: none; }
  .main { padding-bottom: 40px; }
  .brand-title { margin-right: 12px; }
  .topbar-actions { margin-left: auto; }
}

.toolbar { display: flex; flex-direction: column; gap: 10px; margin-bottom: 6px; }
.chips-row { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 2px; scrollbar-width: none; }
.chips-row::-webkit-scrollbar { display: none; }
@media (min-width: 769px) { .chips-row { flex-wrap: wrap; overflow: visible; } }
.fchip { flex: none; border: 1px solid var(--border); background: var(--surface); color: var(--text); border-radius: 99px; padding: 6px 12px; font: inherit; font-size: 14px; cursor: pointer; white-space: nowrap; }
.fchip.active { background: var(--primary); border-color: var(--primary); color: var(--primary-text); }
.fchip-select { flex: none; width: auto; border-radius: 99px; padding: 6px 10px; font-size: 14px; }
.fchip-select.active { border-color: var(--primary); outline: 1px solid var(--primary); }
.adv summary { cursor: pointer; color: var(--muted); font-size: 14px; }
.adv-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; margin-top: 10px; align-items: end; }
.summary-line { color: var(--muted); font-size: 14px; margin: 6px 0 12px; }
.summary-line strong { color: var(--text); }

.grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
@media (min-width: 600px) { .grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1000px) { .grid { grid-template-columns: repeat(3, 1fr); } }
.pcard { display: flex; flex-direction: column; gap: 6px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 14px; box-shadow: var(--shadow); cursor: pointer; }
.pcard:hover, .pcard:focus-visible { border-color: var(--primary); outline: none; }
.pcard-top { display: flex; justify-content: space-between; gap: 8px; }
.pcard-brand { font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); }
.pcard-name { margin: 0; font-size: 17px; line-height: 1.25; color: var(--text); text-transform: none; letter-spacing: 0; }
.conc { font-size: 12px; font-weight: 500; color: var(--muted); }
.pcard-meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.pcard-dupe { margin: 0; font-size: 13px; color: var(--muted); }
.pcard .btn { align-self: flex-start; }
.rating { font-size: 13px; color: var(--muted); }
.fam-chip { font-size: 12px; padding: 2px 8px; border-radius: 99px; color: color-mix(in srgb, var(--fam) 75%, var(--fam-mix)); background: color-mix(in srgb, var(--fam) 14%, transparent); border: 1px solid color-mix(in srgb, var(--fam) 35%, transparent); }
.empty { color: var(--muted); text-align: center; padding: 32px 8px; grid-column: 1 / -1; }

.picker { position: relative; }
.picker-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
.picker-chips:empty { display: none; }
.chip { display: inline-flex; align-items: center; gap: 2px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 99px; padding: 3px 4px 3px 10px; font-size: 14px; }
.chip-x { border: 0; background: none; color: var(--muted); cursor: pointer; font-size: 16px; line-height: 1; padding: 0 6px; }
.picker-list { position: absolute; left: 0; right: 0; top: 100%; z-index: 20; margin: 4px 0 0; padding: 4px; list-style: none; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; box-shadow: 0 8px 24px rgba(0, 0, 0, .18); max-height: 260px; overflow-y: auto; }
.picker-list li { padding: 8px 10px; border-radius: 6px; cursor: pointer; }
.picker-list li.active { background: var(--surface-2); }
.picker-list li.new { color: var(--primary); }
.picker-list li.none { cursor: default; color: var(--muted); }

.pform { display: flex; flex-direction: column; gap: 14px; }
.row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: end; }
@media (max-width: 480px) { .row-2 { grid-template-columns: 1fr; } }
.check-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.cchip { position: relative; display: inline-flex; flex-direction: row; }
.cchip input { position: absolute; opacity: 0; pointer-events: none; width: 1px; }
.cchip span { display: inline-block; border: 1px solid var(--border); border-radius: 99px; padding: 6px 12px; font-size: 14px; color: var(--text); background: var(--surface); cursor: pointer; }
.cchip input:checked + span { background: var(--primary); border-color: var(--primary); color: var(--primary-text); }
.cchip input:focus-visible + span { outline: 2px solid var(--primary); outline-offset: 2px; }
.dupe-row { display: grid; grid-template-columns: 1fr 1fr auto; gap: 8px; align-items: start; margin-bottom: 8px; }
@media (max-width: 480px) {
  .dupe-row { grid-template-columns: 1fr auto; }
  .dupe-row .icon-btn { grid-column: 2; grid-row: 1; }
  .dupe-row .dupe-name { grid-column: 1; }
}
.more > summary { cursor: pointer; color: var(--primary); }
.more[open] { display: flex; flex-direction: column; gap: 14px; }
.form-error { color: var(--danger); margin: 0; }
.form-actions { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
.sticky-actions { position: sticky; bottom: calc(60px + env(safe-area-inset-bottom)); background: var(--bg); padding: 10px 0; justify-content: space-between; }
@media (min-width: 769px) { .sticky-actions { bottom: 0; } }

.detail { display: flex; flex-direction: column; gap: 14px; max-width: 760px; margin: 0 auto; }
.back { color: var(--muted); text-decoration: none; }
.detail-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
.detail-head h2 { margin: 2px 0 8px; }
.fav-toggle { font-size: 26px; }
.detail-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.links { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 14px; }
.links ul { margin: 0; padding-left: 18px; }

.today { display: flex; flex-direction: column; gap: 14px; max-width: 900px; margin: 0 auto; }
.weather { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px; color: var(--muted); }
.w-temp { font-size: 28px; font-weight: 700; color: var(--text); margin-right: 8px; }
.today .btn-big { align-self: center; }

.dupe-groups { display: grid; gap: 10px; margin-top: 12px; }
@media (min-width: 769px) { .dupe-groups { grid-template-columns: repeat(2, 1fr); } }
.dgroup { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 14px; }
.dgroup h3 { font-size: 15px; color: var(--text); text-transform: none; letter-spacing: 0; }
.dgroup ul { margin: 0; padding-left: 18px; }
.card-ish { display: flex; flex-direction: column; gap: 12px; max-width: 640px; margin: 0 auto; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; }

dialog { border: 1px solid var(--border); border-radius: 14px; background: var(--surface); color: var(--text); padding: 18px; width: min(560px, calc(100vw - 24px)); max-height: calc(100dvh - 24px); overflow-y: auto; }
dialog.wide { width: min(720px, calc(100vw - 24px)); }
dialog::backdrop { background: rgba(10, 8, 20, .5); }
dialog h2 { margin-bottom: 14px; }

.toasts { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(76px + env(safe-area-inset-bottom)); z-index: 50; display: flex; flex-direction: column; gap: 8px; width: min(420px, calc(100vw - 32px)); }
.toast { padding: 10px 14px; border-radius: 10px; background: var(--text); color: var(--bg); box-shadow: var(--shadow); font-size: 14px; }
.toast-success { background: var(--ok); color: #fff; }
.toast-error { background: var(--danger); color: #fff; }
@media (min-width: 769px) { .toasts { bottom: 24px; } }
```

- [ ] **Step 4: utilidades de UI**

`src/ui/dom.js`:
```js
export const $ = (sel, root = document) => root.querySelector(sel);

export function toast(message, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  $('#toasts').append(el);
  setTimeout(() => el.remove(), type === 'error' ? 7000 : 3000);
}

export function errorMessage(err) {
  if (err?.code === 'permission-denied') return 'No tenés permiso para hacer eso.';
  if (err?.code === 'unavailable') return 'Sin conexión con la base. Revisá internet y probá de nuevo.';
  if (err?.code === 'auth/popup-closed-by-user') return 'Se cerró la ventana de login.';
  if (err?.code === 'auth/popup-blocked') return 'El navegador bloqueó la ventana de login. Permitila y probá de nuevo.';
  return err?.message || 'Ocurrió un error inesperado.';
}

export function openDialog(html, { wide = false } = {}) {
  const dlg = $('#dialog');
  dlg.className = wide ? 'wide' : '';
  dlg.innerHTML = html;
  dlg.querySelectorAll('[data-close]').forEach((b) => (b.onclick = closeDialog));
  if (!dlg.open) dlg.showModal();
  return dlg;
}

export function closeDialog() {
  const dlg = $('#dialog');
  if (dlg.open) dlg.close();
  dlg.innerHTML = '';
}
```

`src/ui/theme.js`:
```js
export function initTheme() {
  try {
    const t = localStorage.getItem('theme');
    if (t) document.documentElement.dataset.theme = t;
  } catch { /* storage bloqueado: usa el tema del sistema */ }
}

export function toggleTheme() {
  const root = document.documentElement;
  const current = root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = current === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch { /* ignorar */ }
}
```

`src/ui/screens.js`:
```js
import { esc } from '../lib/html.js';

export function renderLogin(app, onLogin) {
  app.innerHTML = `
    <div class="center-screen"><div class="card">
      <h1>🧴 Mis Perfumes</h1>
      <p>Ingresá con tu cuenta de Google.</p>
      <button class="btn btn-primary" id="btn-login">Ingresar con Google</button>
    </div></div>`;
  app.querySelector('#btn-login').onclick = onLogin;
}

export function renderNoAccess(app, email, onLogout) {
  app.innerHTML = `
    <div class="center-screen"><div class="card">
      <h1>No tenés acceso</h1>
      <p><strong>${esc(email)}</strong> no tiene acceso a esta colección.</p>
      <button class="btn" id="btn-logout">Usar otra cuenta</button>
    </div></div>`;
  app.querySelector('#btn-logout').onclick = onLogout;
}
```

`src/ui/nav.js`:
```js
import { esc } from '../lib/html.js';
import { toggleTheme } from './theme.js';

const TABS = [
  { name: 'coleccion', label: 'Colección', icon: '🧴' },
  { name: 'hoy', label: 'Hoy', icon: '✨' },
  { name: 'wishlist', label: 'Wishlist', icon: '💭' },
  { name: 'dupes', label: 'Dupes', icon: '🔁' },
];

const tabLinks = (cls) => TABS.map((t) =>
  `<a href="#/${t.name}" class="${cls}" data-tab="${t.name}"><span class="tab-icon" aria-hidden="true">${t.icon}</span><span>${t.label}</span></a>`).join('');

export function renderShell(app, { email, demo, onAdd, onLogout }) {
  app.innerHTML = `
    <header class="topbar">
      <a href="#/coleccion" class="brand-title">Mis Perfumes${demo ? ' <span class="badge">demo</span>' : ''}</a>
      <nav class="top-tabs">${tabLinks('top-tab')}</nav>
      <div class="topbar-actions">
        <button class="btn btn-primary" id="btn-add">+ Agregar</button>
        <button class="icon-btn" id="btn-theme" title="Cambiar tema" aria-label="Cambiar tema">◐</button>
        <button class="btn btn-ghost" id="btn-logout" title="${esc(email)}">Salir</button>
      </div>
    </header>
    <main id="view" class="main"></main>
    <nav class="bottom-nav">${tabLinks('bottom-tab')}</nav>`;
  app.querySelector('#btn-add').onclick = onAdd;
  app.querySelector('#btn-theme').onclick = toggleTheme;
  app.querySelector('#btn-logout').onclick = onLogout;
}

export function setActiveTab(name) {
  document.querySelectorAll('[data-tab]').forEach((a) => a.classList.toggle('active', a.dataset.tab === name));
}
```

- [ ] **Step 5: stubs de vistas (se reemplazan en Tasks 11–14)**

Crear cada archivo con un render mínimo para que la app cargue:

`src/ui/collection.js`:
```js
export function renderCollection(view, api, mode) {
  view.dataset.screen = mode;
  view.innerHTML = `<p>${api.perfumes.filter((p) => p.status === mode).length} perfumes</p>`;
}
```
`src/ui/today.js`:
```js
export function renderToday(view) { view.dataset.screen = 'hoy'; view.innerHTML = '<p>Hoy</p>'; }
```
`src/ui/dupes.js`:
```js
export function renderDupes(view) { view.dataset.screen = 'dupes'; view.innerHTML = '<p>Dupes</p>'; }
```
`src/ui/detail.js`:
```js
export function renderDetail(view, api, id) { view.dataset.screen = `p:${id}`; view.innerHTML = '<p>Ficha</p>'; }
```
`src/ui/add.js`:
```js
export function openAddDialog() {}
```
`src/ui/importer.js`:
```js
export function renderImporter(view) { view.dataset.screen = 'importar'; view.innerHTML = '<p>Importar</p>'; }
```

- [ ] **Step 6: main.js (auth + estado + router)**

`src/main.js`:
```js
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
const backend = await import(DEMO ? './data/demo.js' : './data/backend.js');

const app = document.getElementById('app');
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
  return { name: name || 'coleccion', id: id ? decodeURIComponent(id) : null };
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

initTheme();

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
  renderShell(app, { email: user.email, demo: DEMO, onAdd: () => openAddDialog(api), onLogout: backend.logout });
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
addEventListener('hashchange', () => {
  if (document.querySelector('#view form[data-dirty="1"]') && !confirm('¿Descartar los cambios sin guardar?')) {
    history.replaceState(null, '', currentHash);
    return;
  }
  currentHash = location.hash;
  window.scrollTo(0, 0);
  route();
});
```

- [ ] **Step 7: verificar que carga en modo demo**

Run (background): `npm run dev`
Abrir con chrome-devtools MCP `http://localhost:5174/?demo#/coleccion`.
Expected: topbar "Mis Perfumes demo", texto "8 perfumes", sin errores en consola (`list_console_messages`). Navegar a `#/wishlist` → "1 perfumes". En viewport 390×844 (`emulate`/`resize_page`) se ve la barra inferior; en 1280×800 se ven las pestañas arriba.

- [ ] **Step 8: commit**

```bash
git add -A && git commit -m "feat: shell de la app (PWA, estilos, auth, navegación y router)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Picker con buscador y formulario del perfume

**Files:**
- Create: `src/ui/picker.js`, `src/ui/form.js`, `src/ui/card.js`

- [ ] **Step 1: picker**

`src/ui/picker.js`:
```js
import { esc } from '../lib/html.js';
import { normalize, cleanText } from '../lib/normalize.js';
import { searchOptions } from '../lib/catalog.js';

// Combobox con buscador. single: un valor (marca). multiple: chips (notas).
// `options` es una función para leer siempre el catálogo actualizado.
export function createPicker(root, { options, value, multiple = false, placeholder = '', onChange = () => {} }) {
  let selected = multiple ? [...(value ?? [])] : cleanText(value);
  let items = [];
  let active = 0;
  root.classList.add('picker');
  root.innerHTML = `${multiple ? '<div class="picker-chips"></div>' : ''}
    <input type="text" class="picker-input" autocomplete="off" placeholder="${esc(placeholder)}">
    <ul class="picker-list" role="listbox" hidden></ul>`;
  const input = root.querySelector('.picker-input');
  const list = root.querySelector('.picker-list');
  const chips = root.querySelector('.picker-chips');

  const api = {
    get value() { return multiple ? [...selected] : selected; },
    focus: () => input.focus(),
  };

  const renderChips = () => {
    if (!chips) return;
    chips.innerHTML = selected.map((v, i) =>
      `<span class="chip">${esc(v)}<button type="button" class="chip-x" data-i="${i}" aria-label="Quitar ${esc(v)}">×</button></span>`).join('');
  };
  const renderList = () => {
    list.innerHTML = items.length
      ? items.map((it, i) => `<li role="option" data-i="${i}" class="${i === active ? 'active' : ''}${it.isNew ? ' new' : ''}">${esc(it.label)}</li>`).join('')
      : '<li class="none">Sin resultados</li>';
    list.querySelector('li.active')?.scrollIntoView({ block: 'nearest' });
  };
  const open = () => {
    const all = options();
    const taken = new Set(multiple ? selected.map(normalize) : []);
    items = searchOptions(all, input.value, 30).filter((o) => !taken.has(normalize(o))).map((o) => ({ value: o, label: o }));
    const typed = cleanText(input.value);
    if (typed && !taken.has(normalize(typed)) && !all.some((o) => normalize(o) === normalize(typed))) {
      items.push({ value: typed, label: `Agregar «${typed}»`, isNew: true });
    }
    active = 0;
    renderList();
    list.hidden = false;
  };
  const close = () => { list.hidden = true; };
  const choose = (it) => {
    if (!it) return;
    if (multiple) {
      selected.push(it.value);
      input.value = '';
      renderChips();
      open();
    } else {
      selected = it.value;
      input.value = it.value;
      close();
    }
    onChange(api.value);
  };
  // Single: lo escrito y no elegido se toma igual (con la grafía del catálogo si coincide).
  const commitTyped = () => {
    if (multiple) return;
    const typed = cleanText(input.value);
    const match = options().find((o) => normalize(o) === normalize(typed));
    const next = match ?? typed;
    if (next !== selected) {
      selected = next;
      onChange(api.value);
    }
    input.value = selected;
  };

  input.addEventListener('focus', open);
  input.addEventListener('input', open);
  input.addEventListener('blur', () => { close(); commitTyped(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (list.hidden) open();
      else if (items.length) {
        active = (active + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length;
        renderList();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!list.hidden && items.length) choose(items[active]);
      else commitTyped();
    } else if (e.key === 'Escape' && !list.hidden) {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === 'Backspace' && multiple && !input.value && selected.length) {
      selected.pop();
      renderChips();
      onChange(api.value);
    }
  });
  list.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const li = e.target.closest('li[data-i]');
    if (li) choose(items[Number(li.dataset.i)]);
  });
  chips?.addEventListener('click', (e) => {
    const x = e.target.closest('.chip-x');
    if (!x) return;
    selected.splice(Number(x.dataset.i), 1);
    renderChips();
    onChange(api.value);
  });

  if (!multiple) input.value = selected;
  renderChips();
  return api;
}
```

- [ ] **Step 2: tarjeta y helpers visuales**

`src/ui/card.js`:
```js
import { esc } from '../lib/html.js';
import { familyOf, CONCENTRATIONS, MOODS, moodOf } from '../lib/constants.js';

export function familyChip(value) {
  const f = familyOf(value);
  return f ? `<span class="fam-chip" style="--fam:${f.color}">${esc(f.label)}</span>` : '';
}
export const moodEmoji = (p) => MOODS.find((m) => m.value === moodOf(p))?.emoji ?? '';
export const concShort = (v) => CONCENTRATIONS.find((c) => c.value === v)?.short ?? '';
export const dupeText = (d) => `${d.brand} - ${d.name}`;

export function perfumeCardHTML(p, { actions = '' } = {}) {
  const mood = moodEmoji(p);
  return `<article class="pcard" data-id="${esc(p.id)}" tabindex="0">
    <div class="pcard-top"><span class="pcard-brand">${esc(p.brand)}</span>${p.favorite ? '<span title="Favorito">⭐</span>' : ''}</div>
    <h3 class="pcard-name">${esc(p.name)} <span class="conc">${esc(concShort(p.concentration))}</span></h3>
    <div class="pcard-meta">${mood ? `<span>${mood}</span>` : ''}${familyChip(p.familyMain)}${p.rating ? `<span class="rating">${p.rating}/10</span>` : ''}</div>
    ${(p.dupeOf ?? []).length ? `<p class="pcard-dupe">Dupe de ${esc(p.dupeOf.map(dupeText).join(' & '))}</p>` : ''}
    ${actions}
  </article>`;
}
```

- [ ] **Step 3: formulario**

`src/ui/form.js`:
```js
import { esc } from '../lib/html.js';
import { CONCENTRATIONS, FAMILIES, SEASONS, OCCASIONS, TIMES, STATUSES } from '../lib/constants.js';
import { createPicker } from './picker.js';

const selectOptions = (list, sel, empty) =>
  (empty !== undefined ? `<option value="">${esc(empty)}</option>` : '')
  + list.map((o) => `<option value="${esc(o.value)}"${o.value === sel ? ' selected' : ''}>${esc(o.label)}</option>`).join('');
const toggles = (type, name, list, isOn) =>
  `<div class="check-chips">${list.map((o) => `<label class="cchip"><input type="${type}" name="${name}" value="${esc(o.value)}"${isOn(o.value) ? ' checked' : ''}><span>${esc(o.label)}</span></label>`).join('')}</div>`;

export function perfumeFieldsHTML(p = {}, { collapsed = false } = {}) {
  const optional = `
    <div class="field"><span class="field-label">Dupe de</span><div class="dupes-edit"></div>
      <button type="button" class="btn btn-small" data-add-dupe>+ Agregar original</button></div>
    <div class="row-2">
      <label>Familia principal<select name="familyMain">${selectOptions(FAMILIES, p.familyMain, 'Sin definir')}</select></label>
      <label>Familia secundaria<select name="familySecondary">${selectOptions(FAMILIES, p.familySecondary, 'Ninguna')}</select></label>
    </div>
    <div class="field"><span class="field-label">Notas</span><div class="notes-picker"></div></div>
    <div class="field"><span class="field-label">Temporada</span>${toggles('checkbox', 'seasons', SEASONS, (v) => (p.seasons ?? []).includes(v))}</div>
    <div class="field"><span class="field-label">Ocasión</span>${toggles('checkbox', 'occasions', OCCASIONS, (v) => (p.occasions ?? []).includes(v))}</div>
    <div class="field"><span class="field-label">Momento</span>${toggles('radio', 'timeOfDay', TIMES, (v) => p.timeOfDay === v)}</div>
    <div class="row-2">
      <label>Puntuación<select name="rating"><option value="">Sin puntuar</option>${
        Array.from({ length: 10 }, (_, i) => i + 1).map((n) => `<option value="${n}"${p.rating === n ? ' selected' : ''}>${n}</option>`).join('')
      }</select></label>
      <label class="check"><input type="checkbox" name="favorite"${p.favorite ? ' checked' : ''}> ⭐ Favorito</label>
    </div>`;
  return `
    <div class="field"><span class="field-label">Marca *</span><div class="brand-picker"></div></div>
    <label>Nombre *<input name="name" value="${esc(p.name)}" autocomplete="off"></label>
    <div class="row-2">
      <label>Concentración *<select name="concentration">${selectOptions(CONCENTRATIONS, p.concentration, 'Elegir…')}</select></label>
      <div class="field"><span class="field-label">Estado</span>${toggles('radio', 'status', STATUSES, (v) => (p.status ?? 'owned') === v)}</div>
    </div>
    ${collapsed ? `<details class="more"><summary>Más datos (opcional)</summary>${optional}</details>` : optional}`;
}

export function mountPerfumeFields(form, p = {}, { brands, notes, onDirty = () => {} }) {
  const brand = createPicker(form.querySelector('.brand-picker'), { options: brands, value: p.brand ?? '', placeholder: 'Buscar marca…', onChange: onDirty });
  const notePicker = createPicker(form.querySelector('.notes-picker'), {
    options: notes, value: p.notes ?? [], multiple: true, placeholder: 'Buscar nota… (ej: vainilla)', onChange: onDirty,
  });
  const dupeBox = form.querySelector('.dupes-edit');
  const dupeRows = [];
  const addDupeRow = (d = { brand: '', name: '' }) => {
    const row = document.createElement('div');
    row.className = 'dupe-row';
    row.innerHTML = `<div class="dupe-brand"></div><input class="dupe-name" placeholder="Perfume original" value="${esc(d.name)}" autocomplete="off"><button type="button" class="icon-btn" aria-label="Quitar original">✕</button>`;
    dupeBox.append(row);
    const entry = { row, brand: createPicker(row.querySelector('.dupe-brand'), { options: brands, value: d.brand, placeholder: 'Marca original', onChange: onDirty }) };
    dupeRows.push(entry);
    row.querySelector('.icon-btn').onclick = () => {
      row.remove();
      dupeRows.splice(dupeRows.indexOf(entry), 1);
      onDirty();
    };
    return entry;
  };
  (p.dupeOf ?? []).forEach((d) => addDupeRow(d));
  form.querySelector('[data-add-dupe]').onclick = () => {
    addDupeRow().brand.focus();
    onDirty();
  };
  form.addEventListener('input', onDirty);
  form.addEventListener('change', onDirty);

  const checked = (name) => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value);
  return {
    read() {
      const f = form.elements;
      return {
        brand: brand.value,
        name: f.namedItem('name').value,
        concentration: f.namedItem('concentration').value,
        status: checked('status')[0] ?? 'owned',
        dupeOf: dupeRows.map((r) => ({ brand: r.brand.value, name: r.row.querySelector('.dupe-name').value })),
        familyMain: f.namedItem('familyMain').value || null,
        familySecondary: f.namedItem('familySecondary').value || null,
        notes: notePicker.value,
        seasons: checked('seasons'),
        occasions: checked('occasions'),
        timeOfDay: checked('timeOfDay')[0] ?? null,
        rating: f.namedItem('rating').value,
        favorite: f.namedItem('favorite').checked,
      };
    },
    focusBrand: () => brand.focus(),
  };
}
```

- [ ] **Step 4: tests siguen pasando**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: commit**

```bash
git add -A && git commit -m "feat: picker con buscador, tarjeta y formulario del perfume" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Colección, Wishlist y Agregar

**Files:**
- Modify (reemplazar stub): `src/ui/collection.js`, `src/ui/add.js`

- [ ] **Step 1: vista Colección / Wishlist**

`src/ui/collection.js`:
```js
import { esc } from '../lib/html.js';
import { MOODS, SEASONS, OCCASIONS, FAMILIES, CONCENTRATIONS } from '../lib/constants.js';
import { EMPTY_FILTERS, filterPerfumes, sortPerfumes, summarize } from '../lib/filters.js';
import { uniqueSorted } from '../lib/normalize.js';
import { perfumeCardHTML } from './card.js';
import { toast, errorMessage } from './dom.js';

const SORTS = [
  { value: 'brand', label: 'Marca' },
  { value: 'name', label: 'Nombre' },
  { value: 'rating', label: 'Puntuación' },
];
const options = (list, sel, empty) =>
  `<option value="">${esc(empty)}</option>` + list.map((o) => `<option value="${esc(o.value)}"${o.value === sel ? ' selected' : ''}>${esc(o.label)}</option>`).join('');
const plain = (values) => values.map((v) => ({ value: v, label: v }));

function toolbarHTML(mode, vs, perfumes) {
  const f = vs.filters;
  const brands = uniqueSorted(perfumes.map((p) => p.brand));
  const notes = uniqueSorted(perfumes.flatMap((p) => p.notes ?? []));
  return `
    <section class="toolbar">
      <input type="search" name="q" placeholder="Buscar marca, nombre, nota o dupe…" value="${esc(f.q)}" autocomplete="off">
      <div class="chips-row">
        ${MOODS.map((m) => `<button type="button" class="fchip${f.mood === m.value ? ' active' : ''}" data-k="mood" data-v="${m.value}">${m.emoji} ${esc(m.label)}</button>`).join('')}
        <button type="button" class="fchip${f.favorites ? ' active' : ''}" data-k="favorites">⭐ Favoritos</button>
        ${mode === 'owned' ? `<button type="button" class="fchip${f.onlyDupes ? ' active' : ''}" data-k="onlyDupes">🔁 Solo dupes</button>` : ''}
        <select name="season" class="fchip-select${f.season ? ' active' : ''}" aria-label="Temporada">${options(SEASONS, f.season, 'Temporada')}</select>
        <select name="occasion" class="fchip-select${f.occasion ? ' active' : ''}" aria-label="Ocasión">${options(OCCASIONS, f.occasion, 'Ocasión')}</select>
      </div>
      <details class="adv"${vs.advOpen ? ' open' : ''}>
        <summary>Más filtros y orden</summary>
        <div class="adv-grid">
          <label>Marca<select name="brand">${options(plain(brands), f.brand, 'Todas')}</select></label>
          <label>Familia<select name="family">${options(FAMILIES, f.family, 'Todas')}</select></label>
          <label>Concentración<select name="concentration">${options(CONCENTRATIONS, f.concentration, 'Todas')}</select></label>
          <label>Nota<select name="note">${options(plain(notes), f.note, 'Todas')}</select></label>
          <label>Ordenar por<select name="sort">${SORTS.map((s) => `<option value="${s.value}"${vs.sort === s.value ? ' selected' : ''}>${s.label}</option>`).join('')}</select></label>
          <button type="button" class="btn btn-ghost" data-act="clear">Limpiar filtros</button>
        </div>
      </details>
    </section>
    <p class="summary-line" id="summary"></p>
    <section class="grid" id="results"></section>`;
}

export function renderCollection(view, api, mode, { fromData = false } = {}) {
  const vs = api.state.views[mode];
  const toolbar = view.querySelector('.toolbar');
  // Con datos nuevos se conserva la barra si el usuario está escribiendo o eligiendo en ella.
  const keepToolbar = fromData && view.dataset.screen === mode && toolbar?.contains(document.activeElement);
  if (!keepToolbar) {
    view.dataset.screen = mode;
    view.innerHTML = toolbarHTML(mode, vs, api.perfumes.filter((p) => p.status === mode));
    bind(view, api, mode);
  }
  renderResults(view, api, mode);
}

function bind(view, api, mode) {
  const vs = api.state.views[mode];
  const tb = view.querySelector('.toolbar');
  const set = (patch) => {
    Object.assign(vs.filters, patch);
    syncChips(tb, vs.filters);
    renderResults(view, api, mode);
  };
  tb.querySelector('input[name="q"]').addEventListener('input', (e) => set({ q: e.target.value }));
  tb.addEventListener('change', (e) => {
    const { name, value } = e.target;
    if (!name || name === 'q') return;
    if (name === 'sort') {
      vs.sort = value;
      renderResults(view, api, mode);
    } else {
      set({ [name]: value });
    }
  });
  tb.addEventListener('click', (e) => {
    const chip = e.target.closest('.fchip[data-k]');
    if (chip) {
      const k = chip.dataset.k;
      set(k === 'mood' ? { mood: vs.filters.mood === chip.dataset.v ? '' : chip.dataset.v } : { [k]: !vs.filters[k] });
      return;
    }
    if (e.target.closest('[data-act="clear"]')) {
      vs.filters = { ...EMPTY_FILTERS };
      vs.sort = 'brand';
      view.dataset.screen = '';
      renderCollection(view, api, mode);
    }
  });
  tb.querySelector('details').addEventListener('toggle', (e) => { vs.advOpen = e.target.open; });

  const results = view.querySelector('#results');
  const openCard = (card) => api.go(`#/p/${encodeURIComponent(card.dataset.id)}`);
  results.addEventListener('click', (e) => {
    const card = e.target.closest('.pcard');
    if (!card) return;
    if (e.target.closest('[data-bought]')) {
      api.backend.patchPerfume(card.dataset.id, { status: 'owned' }).catch((x) => toast(errorMessage(x), 'error'));
      toast('¡Pasó a tu colección!', 'success');
      return;
    }
    openCard(card);
  });
  results.addEventListener('keydown', (e) => {
    const card = e.target.closest('.pcard');
    if (card && e.key === 'Enter' && e.target === card) openCard(card);
  });
}

function syncChips(tb, f) {
  tb.querySelectorAll('.fchip[data-k]').forEach((b) => {
    const k = b.dataset.k;
    b.classList.toggle('active', k === 'mood' ? f.mood === b.dataset.v : !!f[k]);
  });
  tb.querySelectorAll('.fchip-select').forEach((s) => s.classList.toggle('active', !!s.value));
}

function renderResults(view, api, mode) {
  const vs = api.state.views[mode];
  const all = api.perfumes.filter((p) => p.status === mode);
  const rows = sortPerfumes(filterPerfumes(all, vs.filters), vs.sort);
  const s = summarize(all);
  view.querySelector('#summary').innerHTML =
    `<strong>${s.total}</strong> ${mode === 'owned' ? 'perfumes' : 'en la wishlist'}`
    + MOODS.map((m) => (s.byMood[m.value] ? ` · ${m.emoji} ${s.byMood[m.value]}` : '')).join('')
    + (s.noFamily ? ` · ${s.noFamily} sin familia` : '')
    + (rows.length !== all.length ? ` — mostrando ${rows.length}` : '');
  const res = view.querySelector('#results');
  if (!all.length) {
    res.innerHTML = `<p class="empty">${mode === 'owned' ? 'Todavía no cargaste perfumes. Tocá <strong>+ Agregar</strong>.' : 'Tu wishlist está vacía. Agregá uno con estado «La quiero».'}</p>`;
    return;
  }
  if (!rows.length) {
    res.innerHTML = '<p class="empty">Ningún perfume coincide con los filtros.</p>';
    return;
  }
  const actions = mode === 'wishlist' ? '<button type="button" class="btn btn-small btn-primary" data-bought>¡Lo compré!</button>' : '';
  res.innerHTML = rows.map((p) => perfumeCardHTML(p, { actions })).join('');
}
```

- [ ] **Step 2: diálogo Agregar**

`src/ui/add.js`:
```js
import { openDialog, closeDialog, toast, errorMessage } from './dom.js';
import { perfumeFieldsHTML, mountPerfumeFields } from './form.js';
import { preparePerfume, findDuplicate } from '../lib/perfume.js';
import { labelOf, CONCENTRATIONS } from '../lib/constants.js';

export function openAddDialog(api) {
  const status = api.currentRoute().name === 'wishlist' ? 'wishlist' : 'owned';
  const dlg = openDialog(`
    <h2>Agregar perfume</h2>
    <form id="add-form" class="pform" novalidate>
      ${perfumeFieldsHTML({ status }, { collapsed: true })}
      <p class="form-error" hidden></p>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" data-close>Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
    </form>`, { wide: true });
  const form = dlg.querySelector('#add-form');
  const errorEl = form.querySelector('.form-error');
  const fields = mountPerfumeFields(form, { status }, { brands: api.brands, notes: api.notes });
  fields.focusBrand();
  form.onsubmit = (e) => {
    e.preventDefault();
    const input = fields.read();
    const { errors, data } = preparePerfume(input);
    if (errors.length) {
      errorEl.textContent = errors.join('. ');
      errorEl.hidden = false;
      return;
    }
    const dup = findDuplicate(api.perfumes, data);
    if (dup && !confirm(`Ya tenés ${dup.brand} ${dup.name} (${labelOf(CONCENTRATIONS, dup.concentration)}). ¿Agregarlo igual?`)) return;
    try {
      const { done } = api.backend.createPerfume(input);
      done.catch((x) => toast(errorMessage(x), 'error'));
      closeDialog();
      toast(`${data.name} agregado`, 'success');
    } catch (x) {
      errorEl.textContent = errorMessage(x);
      errorEl.hidden = false;
    }
  };
}
```

- [ ] **Step 3: verificar en demo (celu y PC)**

Con `npm run dev` corriendo, chrome-devtools en `http://localhost:5174/?demo#/coleccion`:
1. Viewport 390×844: se ven 8 tarjetas en una columna, resumen "8 perfumes · 🧊 3 · 🔥 2 · 🌲 0…" (ajustado a los datos demo) y "1 sin familia".
2. Escribir "cafe" en el buscador → solo Khamrah Qahwa. Escribir "aventus" no da resultados en Colección (el Aventus está en wishlist). Borrar.
3. Chip "🧊 Fresco" → solo los frescos; volver a tocar lo desactiva.
4. "+ Agregar": escribir "latt" en marca → aparece "Lattafa"; elegir; nombre "Asad"; concentración EDP; Guardar → toast y aparece en la grilla.
5. Agregar con marca nueva "Marca Test" → la lista muestra "Agregar «Marca Test»"; guardar funciona.
6. `#/wishlist` → Aventus con botón "¡Lo compré!"; al tocarlo pasa a Colección.
7. Viewport 1280×800: grilla de 3 columnas, pestañas arriba.
8. `list_console_messages` sin errores.

- [ ] **Step 4: commit**

```bash
git add -A && git commit -m "feat: vistas Colección y Wishlist con filtros, y diálogo Agregar" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Ficha del perfume

**Files:**
- Modify (reemplazar stub): `src/ui/detail.js`

- [ ] **Step 1: implementar**

`src/ui/detail.js`:
```js
import { esc } from '../lib/html.js';
import { preparePerfume, findDuplicate, fragranticaUrl } from '../lib/perfume.js';
import { ownedIndex, findOriginal, dupesOf } from '../lib/dupes.js';
import { labelOf, CONCENTRATIONS } from '../lib/constants.js';
import { familyChip, moodEmoji, concShort, dupeText } from './card.js';
import { perfumeFieldsHTML, mountPerfumeFields } from './form.js';
import { toast, errorMessage } from './dom.js';

const link = (p, text) => `<a href="#/p/${encodeURIComponent(p.id)}">${esc(text)}</a>`;

export function renderDetail(view, api, id, { fromData = false } = {}) {
  // No pisar una edición en curso cuando llegan datos nuevos.
  if (fromData && view.dataset.screen === `p:${id}` && view.querySelector('form')?.dataset.dirty === '1') return;
  view.dataset.screen = `p:${id}`;
  const p = api.byId(id);
  if (!p) {
    view.innerHTML = '<div class="empty"><p>No se encontró este perfume.</p><a class="btn" href="#/coleccion">Volver a la colección</a></div>';
    return;
  }
  const index = ownedIndex(api.perfumes);
  const originals = (p.dupeOf ?? []).map((d) => ({ d, owned: findOriginal(index, d) }));
  const myDupes = dupesOf(api.perfumes, p);
  const listHash = p.status === 'wishlist' ? '#/wishlist' : '#/coleccion';

  view.innerHTML = `
    <div class="detail">
      <a href="${listHash}" class="back">← Volver</a>
      <header class="detail-head">
        <div>
          <span class="pcard-brand">${esc(p.brand)}</span>
          <h2>${esc(p.name)} <span class="conc">${esc(concShort(p.concentration))}</span></h2>
          <div class="pcard-meta">${moodEmoji(p)} ${familyChip(p.familyMain)} ${familyChip(p.familySecondary)}</div>
        </div>
        <button type="button" class="icon-btn fav-toggle" data-fav aria-pressed="${!!p.favorite}" title="Favorito">${p.favorite ? '⭐' : '☆'}</button>
      </header>
      <div class="detail-actions">
        <a class="btn" href="${esc(fragranticaUrl(p))}" target="_blank" rel="noopener">Ver en Fragrantica ↗</a>
        ${p.status === 'wishlist' ? '<button type="button" class="btn btn-primary" data-bought>¡Lo compré!</button>' : ''}
      </div>
      ${originals.length ? `<section class="links"><h3>Dupe de</h3><ul>${originals.map(({ d, owned }) =>
        `<li>${owned ? `${link(owned, dupeText(d))} <span class="badge">lo tenés</span>` : esc(dupeText(d))}</li>`).join('')}</ul></section>` : ''}
      ${myDupes.length ? `<section class="links"><h3>Tus dupes de este</h3><ul>${myDupes.map((x) =>
        `<li>${link(x, `${x.brand} - ${x.name}`)}</li>`).join('')}</ul></section>` : ''}
      <form class="pform" novalidate>
        ${perfumeFieldsHTML(p)}
        <p class="form-error" hidden></p>
        <div class="form-actions sticky-actions">
          <button type="button" class="btn btn-danger" data-delete>Eliminar</button>
          <button type="submit" class="btn btn-primary" disabled>Guardar cambios</button>
        </div>
      </form>
    </div>`;

  const form = view.querySelector('form');
  const saveBtn = form.querySelector('[type="submit"]');
  const errorEl = form.querySelector('.form-error');
  const fields = mountPerfumeFields(form, p, {
    brands: api.brands,
    notes: api.notes,
    onDirty: () => { form.dataset.dirty = '1'; saveBtn.disabled = false; },
  });

  form.onsubmit = (e) => {
    e.preventDefault();
    const input = fields.read();
    const { errors, data } = preparePerfume(input);
    if (errors.length) {
      errorEl.textContent = errors.join('. ');
      errorEl.hidden = false;
      return;
    }
    const dup = findDuplicate(api.perfumes, data, p.id);
    if (dup && !confirm(`Ya tenés ${dup.brand} ${dup.name} (${labelOf(CONCENTRATIONS, dup.concentration)}). ¿Guardar igual?`)) return;
    errorEl.hidden = true;
    form.dataset.dirty = '';
    saveBtn.disabled = true;
    api.backend.updatePerfume(p.id, input).catch((x) => toast(errorMessage(x), 'error'));
    toast('Cambios guardados', 'success');
  };

  view.querySelector('[data-fav]').onclick = (e) => {
    const box = form.elements.namedItem('favorite');
    box.checked = !box.checked;
    e.currentTarget.textContent = box.checked ? '⭐' : '☆';
    e.currentTarget.setAttribute('aria-pressed', String(box.checked));
    api.backend.patchPerfume(p.id, { favorite: box.checked }).catch((x) => toast(errorMessage(x), 'error'));
  };

  view.querySelector('[data-bought]')?.addEventListener('click', () => {
    const radio = form.querySelector('input[name="status"][value="owned"]');
    if (radio) radio.checked = true;
    api.backend.patchPerfume(p.id, { status: 'owned' }).catch((x) => toast(errorMessage(x), 'error'));
    toast('¡Pasó a tu colección!', 'success');
  });

  view.querySelector('[data-delete]').onclick = () => {
    if (!confirm(`¿Eliminar ${p.brand} ${p.name}?`)) return;
    form.dataset.dirty = '';
    api.backend.removePerfume(p.id).catch((x) => toast(errorMessage(x), 'error'));
    toast('Perfume eliminado', 'success');
    api.go(listHash);
  };
}
```

- [ ] **Step 2: verificar en demo**

En `http://localhost:5174/?demo`:
1. Abrir Hawas Ice → muestra "Dupe de: Paco Rabanne - Invictus Aqua · lo tenés" con link; el link abre Invictus Aqua, que muestra "Tus dupes de este: Rasasi - Hawas Ice".
2. "Ver en Fragrantica ↗" tiene href `https://duckduckgo.com/?q=%5Csite%3Afragrantica.com%20Rasasi%20Hawas%20Ice`.
3. Agregar la nota "Menta" con el buscador, marcar "Invierno", Guardar → toast; volver y la tarjeta refleja los cambios.
4. Cambiar algo sin guardar y tocar "← Volver" → aparece confirm "¿Descartar…?"; Cancelar mantiene la ficha.
5. ⭐ alterna favorito; Eliminar borra y vuelve a la lista.
6. Abrir Creed Aventus (wishlist) → botón "¡Lo compré!".
7. Viewport 390: botones Guardar/Eliminar quedan pegados arriba de la barra inferior.
8. Consola sin errores.

- [ ] **Step 3: commit**

```bash
git add -A && git commit -m "feat: ficha del perfume editable con enlaces de dupes y Fragrantica" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: ¿Qué me pongo hoy?, Dupes e Importar

**Files:**
- Modify (reemplazar stubs): `src/ui/today.js`, `src/ui/dupes.js`, `src/ui/importer.js`

- [ ] **Step 1: vista Hoy**

`src/ui/today.js`:
```js
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
```

- [ ] **Step 2: vista Dupes**

`src/ui/dupes.js`:
```js
import { esc } from '../lib/html.js';
import { normalize } from '../lib/normalize.js';
import { groupByOriginal } from '../lib/dupes.js';

const link = (p, text) => `<a href="#/p/${encodeURIComponent(p.id)}">${esc(text)}</a>`;

export function renderDupes(view, api) {
  view.dataset.screen = 'dupes';
  const groups = groupByOriginal(api.perfumes);
  if (!groups.length) {
    view.innerHTML = '<p class="empty">Ningún perfume de tu colección tiene cargado «Dupe de».</p>';
    return;
  }
  view.innerHTML = `
    <p class="summary-line"><strong>${groups.length}</strong> originales cubiertos por tus dupes</p>
    <input type="search" id="dq" placeholder="Buscar original…" value="${esc(api.state.dupesQuery)}" autocomplete="off">
    <div class="dupe-groups">${groups.map((g) => `
      <section class="dgroup" data-key="${esc(normalize(`${g.brand} ${g.name}`))}">
        <h3>${g.owned ? `${link(g.owned, `${g.brand} - ${g.name}`)} <span class="badge">lo tenés</span>` : esc(`${g.brand} - ${g.name}`)}</h3>
        <ul>${g.dupes.map((p) => `<li>${link(p, `${p.brand} - ${p.name}`)}</li>`).join('')}</ul>
      </section>`).join('')}
    </div>`;
  const input = view.querySelector('#dq');
  const apply = () => {
    const q = normalize(input.value);
    api.state.dupesQuery = input.value;
    view.querySelectorAll('.dgroup').forEach((s) => { s.hidden = !!q && !s.dataset.key.includes(q); });
  };
  input.oninput = apply;
  apply();
}
```

- [ ] **Step 3: vista Importar (migración)**

`src/ui/importer.js`:
```js
import { esc } from '../lib/html.js';
import { parseImport } from '../lib/importer.js';
import { errorMessage } from './dom.js';

export function renderImporter(view, api) {
  view.dataset.screen = 'importar';
  view.innerHTML = `
    <section class="card-ish">
      <h2>Importar perfumes</h2>
      <p class="muted">Elegí el archivo <code>perfumes.json</code> de la migración. Los perfumes se suman a los que ya tenés.</p>
      <input type="file" accept="application/json,.json" id="file">
      <div id="import-result"></div>
    </section>`;
  const out = view.querySelector('#import-result');
  view.querySelector('#file').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    let json;
    try {
      json = JSON.parse(await file.text());
    } catch {
      out.innerHTML = '<p class="form-error">El archivo no es un JSON válido.</p>';
      return;
    }
    const { items, errors } = parseImport(json);
    if (errors.length) {
      out.innerHTML = `<p class="form-error">${errors.length} perfume(s) con errores; no se importó nada:</p>
        <ul>${errors.slice(0, 20).map((x) => `<li>#${x.index + 1} ${esc(x.label)}: ${esc(x.errors.join(', '))}</li>`).join('')}</ul>`;
      return;
    }
    const existing = api.perfumes.length;
    if (!confirm(`¿Importar ${items.length} perfumes?${existing ? ` Ya tenés ${existing} cargados: se suman, no se reemplazan.` : ''}`)) return;
    out.innerHTML = '<p>Importando…</p>';
    try {
      const n = await api.backend.importPerfumes(items, (done) => { out.innerHTML = `<p>Importando… ${done}/${items.length}</p>`; });
      out.innerHTML = `<p class="ok">✔ ${n} perfumes importados.</p><a class="btn" href="#/coleccion">Ver colección</a>`;
    } catch (x) {
      out.innerHTML = `<p class="form-error">${esc(errorMessage(x))}</p>`;
    }
  };
}
```

- [ ] **Step 4: verificar en demo**

En `http://localhost:5174/?demo`:
1. `#/hoy`: muestra el recuadro de clima (en el Chrome de pruebas la geolocalización probablemente falle → texto "Sin datos del clima… uso la estación, Primavera/Otoño"), 5 chips de ocasión con "Diario" activo y hasta 3 tarjetas. "🔄 Otra vez" cambia las sugerencias. Elegir "Cita" → solo perfumes con ocasión Cita o sin ocasiones cargadas.
2. Si se puede, emular geolocalización (`emulate` con geolocation, p. ej. Buenos Aires -34.6, -58.4) y recargar `#/hoy` → muestra temperatura real.
3. `#/dupes`: 3 grupos (By Kilian - Angels' Share, Chanel - Bleu de Chanel EDP, Paco Rabanne - Invictus Aqua con "lo tenés"). El buscador filtra.
4. `#/importar`: crear `migration/test.json` con `[{"brand":"Afnan","name":"9 PM","concentration":"edp"}]` y subirlo con `upload_file` → confirm → "✔ 1 perfumes importados". Borrar `migration/test.json` después.
5. Consola sin errores.

- [ ] **Step 5: commit**

```bash
git add -A && git commit -m "feat: vistas ¿Qué me pongo hoy?, Dupes e Importar" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Catálogo completo de marcas

**Files:**
- Modify: `src/seed/brands.js`
- Test: `tests/unit/seeds.test.js`

- [ ] **Step 1: test de semillas**

`tests/unit/seeds.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { BRAND_SEED } from '../../src/seed/brands.js';
import { NOTE_SEED } from '../../src/seed/notes.js';
import { normalize, cleanText } from '../../src/lib/normalize.js';

// Marcas de la planilla "Mis perfumes" (ya corregidas) y de los originales que dupean.
const SHEET_BRANDS = [
  'Afnan', 'Al Haramain', 'Armaf', 'Azzaro', 'Borouj', 'Carolina Herrera', 'Dior', 'Dolce & Gabbana', 'Fragrance World',
  'French Avenue', 'Giorgio Armani', 'Givenchy', 'Guerlain', 'Gulf Orchid', 'Hugo Boss', 'Issey Miyake', 'Jean Paul Gaultier',
  'Lattafa', 'Maison Alhambra', 'Maison Asrar', 'Mancera', 'Mary Kay', 'Mast', 'Montblanc', 'Mykonos', 'Paco Rabanne',
  'Paris Corner', 'Prada', 'Ralph Lauren', 'Rasasi', 'Rayhaan', 'Tom Ford', 'Valentino', 'Versace', 'Viktor&Rolf',
  'Yves Saint Laurent', 'Zara',
];
const ORIGINAL_BRANDS = [
  'Amouage', 'Bond No. 9', 'Bottega Veneta', 'Bvlgari', 'By Kilian', 'Chanel', 'Clive Christian', 'Creed', 'Emporio Armani',
  'Ex Nihilo', 'Initio', 'Lorenzo Pazzaglia', 'Louis Vuitton', 'Maison Francis Kurkdjian', 'Maison Margiela', 'Montale',
  'Mugler', 'Nishane', 'Orto Parisi', 'Parfums de Marly', 'Room 1015', 'Stéphane Humbert Lucas', 'Xerjoff',
];

const keys = (list) => list.map(normalize);

describe('BRAND_SEED', () => {
  it('includes every brand from the sheet and the dupe originals', () => {
    const have = new Set(keys(BRAND_SEED));
    const missing = [...SHEET_BRANDS, ...ORIGINAL_BRANDS].filter((b) => !have.has(normalize(b)));
    expect(missing).toEqual([]);
  });
  it('has at least 600 clean, non-duplicated brands', () => {
    expect(BRAND_SEED.length).toBeGreaterThanOrEqual(600);
    expect(new Set(keys(BRAND_SEED)).size).toBe(BRAND_SEED.length);
    for (const b of BRAND_SEED) expect(b).toBe(cleanText(b));
  });
});

describe('NOTE_SEED', () => {
  it('has at least 120 clean, non-duplicated notes', () => {
    expect(NOTE_SEED.length).toBeGreaterThanOrEqual(120);
    expect(new Set(keys(NOTE_SEED)).size).toBe(NOTE_SEED.length);
  });
});
```

- [ ] **Step 2: correr y verificar que falla**

Run: `npm test -- seeds`
Expected: FAIL en BRAND_SEED (faltan marcas y hay menos de 600). Si NOTE_SEED falla por duplicados, quitar el duplicado que indique el test.

- [ ] **Step 3: completar `src/seed/brands.js`**

Reemplazar el array por un catálogo de **≥600 marcas**, una por string, con la grafía usada por Fragrantica (sin "Parfums"/"Paris" extra salvo que sea parte del nombre conocido). Debe cubrir, en este orden de prioridad:
1. Todas las de `SHEET_BRANDS` y `ORIGINAL_BRANDS` del test.
2. **Árabes / Medio Oriente / clones:** Lattafa, Lattafa Pride, Armaf, Afnan, Rasasi, Al Haramain, Ajmal, Arabian Oud, Swiss Arabian, Maison Alhambra, Fragrance World, French Avenue, Rayhaan, Paris Corner, Emper, Ard Al Zaafaran, Khadlaj, Zimaya, Al Wataniah, Nabeel, Asdaaf, Gulf Orchid, Maison Asrar, Borouj, Mykonos, Mast, Fa Paris, Alexandria Fragrances, Dua Fragrances, Milestone, Le Falcone, Orientica, Anfas Al Khaleej, Abdul Samad Al Qurashi, Amouage, Ibraheem Al Qurashi, Junaid, Surrati, Ahmed Al Maghribi, Ard Al Khaleej, Riiffs, Pendora Scents, Sapil, Hamidi, Nusuk, Bait Al Bakhoor, Atyab Al Marshoud, Kayali, Ojar, Ateliers Bitter, etc.
3. **Diseñador:** Dior, Chanel, Giorgio Armani, Emporio Armani, Armani Privé, Versace, Gucci, Prada, Yves Saint Laurent, Givenchy, Dolce & Gabbana, Hugo Boss, Burberry, Calvin Klein, Carolina Herrera, Paco Rabanne, Jean Paul Gaultier, Valentino, Montblanc, Azzaro, Hermès, Guerlain, Lancôme, Bvlgari, Cartier, Mugler, Viktor&Rolf, Issey Miyake, Kenzo, Lacoste, Ralph Lauren, Tommy Hilfiger, Davidoff, Diesel, Ferrari, Mercedes-Benz, Abercrombie & Fitch, Hollister, Banana Republic, Michael Kors, Coach, Ferragamo, Bottega Veneta, Loewe, Balenciaga, Louis Vuitton, Fendi, Moschino, Marc Jacobs, Narciso Rodriguez, Chloé, Jimmy Choo, Estée Lauder, Elizabeth Arden, Clinique, Shiseido, Kenneth Cole, John Varvatos, Zara, Antonio Banderas, Adolfo Domínguez, Loewe, Jo Malone London, Penhaligon's, Acqua di Parma, Bentley, Lalique, Rochas, Nina Ricci, Lanvin, Cacharel, Celine, Alexander McQueen, Mancera, Montale, etc.
4. **Nicho:** Creed, Parfums de Marly, Xerjoff, Initio, Nishane, By Kilian, Maison Francis Kurkdjian, Tom Ford, Le Labo, Byredo, Diptyque, Frédéric Malle, Serge Lutens, Amouage, Roja Dove, Clive Christian, Memo Paris, Ex Nihilo, Orto Parisi, Nasomatto, Mind Games, Sospiro, Bond No. 9, Room 1015, Stéphane Humbert Lucas, BDK Parfums, Maison Crivelli, Vilhelm Parfumerie, Escentric Molecules, Juliette Has a Gun, Montale, Mancera, Atelier Cologne, Goldfield & Banks, Electimuss, Zoologist, Imaginary Authors, D.S. & Durga, Etat Libre d'Orange, Nicolai, Histoires de Parfums, Tiziana Terenzi, Lorenzo Pazzaglia, Matiere Premiere, Marc-Antoine Barrois, Louis Vuitton, Maison Margiela, Arquiste, Fragrance Du Bois, Simone Andreoli, Parfums Vintage, Areej Le Doré, Rogue Perfumery, Ormonde Jayne, Thameen, Profumum Roma, Masque Milano, Unique'e Luxury, Les Indémodables, MOPC (si existe en Fragrantica; si no, omitir), etc.
5. **Masivas / celebridades / Latam:** Natura, O Boticário, Avon, Mary Kay, Ésika, L'Bel, Cyzone, Jafra, Yanbal, Halloween, Ricci Ricci, Antonio Banderas, Shakira, Paris Hilton, Britney Spears, Ariana Grande, Victoria's Secret, Bath & Body Works, Al Rehab, Adidas, Puma, Nautica, Perry Ellis, Playboy, etc.

Formato:
```js
// Catálogo precargado de marcas (≥600). La app suma además las marcas que se usen en los perfumes.
export const BRAND_SEED = [
  'Abercrombie & Fitch',
  'Acqua di Parma',
  // … una por línea, ordenadas alfabéticamente, sin duplicados por normalize …
];
```

- [ ] **Step 4: correr tests**

Run: `npm test`
Expected: PASS (si faltan marcas o hay duplicados, el test lista cuáles; corregir y repetir).

- [ ] **Step 5: commit**

```bash
git add -A && git commit -m "feat: catálogo precargado de marcas (≥600)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Proyecto de Firebase

**Files:**
- Create: `.firebaserc`
- Modify: `src/config.js`

- [ ] **Step 1: crear proyecto y app web**

Run:
```bash
cd C:/Users/rodri/perfumes
firebase projects:create perfumes-rr --display-name "Mis Perfumes"
firebase apps:create web "Mis Perfumes" --project perfumes-rr
firebase firestore:databases:create "(default)" --location southamerica-east1 --project perfumes-rr
```
Expected: proyecto, app y base creados. Si `perfumes-rr` está tomado, usar `perfumes-rr-2026` en todos los comandos y archivos de esta task.

- [ ] **Step 2: `.firebaserc` y config**

`.firebaserc`:
```json
{ "projects": { "default": "perfumes-rr" } }
```

Run: `firebase apps:sdkconfig web --project perfumes-rr`
Copiar los campos `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId` de la salida dentro de `firebaseConfig` en `src/config.js` (mismo formato que `inventario-samples/src/config.js`).

- [ ] **Step 3: deployar reglas**

Run: `firebase deploy --only firestore:rules --project perfumes-rr`
Expected: `Deploy complete!`

- [ ] **Step 4: pasos manuales (los hace Rodrigo en la consola)**

Pedirle a Rodrigo, con links directos:
1. `https://console.firebase.google.com/project/perfumes-rr/authentication/providers` → "Comenzar" → habilitar **Google** → correo de asistencia `rodri.rita24@gmail.com` → Guardar.
2. `https://console.firebase.google.com/project/perfumes-rr/authentication/settings` → Dominios autorizados → agregar `rodririta24-spec.github.io`.

Esperar confirmación antes de seguir.

- [ ] **Step 5: commit**

```bash
git add -A && git commit -m "chore: proyecto Firebase perfumes-rr (config y reglas deployadas)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Publicar en GitHub Pages

- [ ] **Step 1: crear repo y subir**

Run:
```bash
cd C:/Users/rodri/perfumes
gh repo create rodririta24-spec/perfumes --public --source . --remote origin --push
gh api -X POST repos/rodririta24-spec/perfumes/pages -f "source[branch]=main" -f "source[path]=/"
```
Expected: repo creado y Pages activado. (Público es necesario para Pages gratis; los datos están protegidos por las reglas de Firestore y la migración no se sube porque `migration/` está en `.gitignore`.)

- [ ] **Step 2: esperar el deploy y verificar**

Run: `gh api repos/rodririta24-spec/perfumes/pages/builds/latest --jq .status` hasta que diga `built`.
Abrir `https://rodririta24-spec.github.io/perfumes/` con chrome-devtools → se ve la pantalla "Ingresar con Google", consola sin errores, `manifest.webmanifest` y los íconos responden 200 (`list_network_requests`).

- [ ] **Step 3: prueba real con Rodrigo**

Pedirle que:
1. Entre desde la PC, ingrese con Google → ve la Colección vacía.
2. Entre desde el celular, ingrese, y use "Agregar a la pantalla de inicio" (Chrome: menú ⋮ → "Agregar a pantalla principal" / "Instalar app"). Al abrir el ícono, abre sin barra del navegador.
3. Agregue un perfume de prueba en el celu y lo vea aparecer en la PC; después lo borre.

---

### Task 18: Migración de los 139 perfumes

**Files:**
- Create: `tools/build-review.mjs`
- Create (gitignored): `migration/perfumes.json`, `migration/review.html`

- [ ] **Step 1: herramienta de revisión**

`tools/build-review.mjs`:
```js
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
const rows = items.map((p, i) => {
  const changes = list[i]._changes ?? [];
  return `<tr class="${changes.length ? 'changed' : ''}">
    <td>${i + 1}</td><td>${esc(p.brand)}</td><td>${esc(p.name)}</td><td>${esc(labelOf(CONCENTRATIONS, p.concentration))}</td>
    <td>${esc(p.dupeOf.map((d) => `${d.brand} - ${d.name}`).join(' & '))}</td>
    <td>${esc(labelOf(FAMILIES, p.familyMain))}</td><td>${esc(labelOf(FAMILIES, p.familySecondary))}</td>
    <td>${esc(p.notes.join(', '))}</td><td>${esc(labels(SEASONS, p.seasons))}</td><td>${esc(labels(OCCASIONS, p.occasions))}</td>
    <td>${esc(labelOf(TIMES, p.timeOfDay))}</td><td class="chg">${esc(changes.join(' · '))}</td></tr>`;
}).join('\n');

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Revisión de migración</title><style>
:root { color-scheme: light dark; --bg: #fff; --text: #1f1a2b; --muted: #6c6580; --border: #e0dae9; --hl: #fff4cc; }
@media (prefers-color-scheme: dark) { :root { --bg: #121016; --text: #ece8f3; --muted: #9d95ad; --border: #332d3f; --hl: #3a3010; } }
body { margin: 0; padding: 16px; background: var(--bg); color: var(--text); font: 14px/1.4 system-ui, sans-serif; }
input { width: 100%; max-width: 420px; padding: 8px; font: inherit; margin: 8px 0 12px; }
.wrap { overflow-x: auto; } table { border-collapse: collapse; width: 100%; }
th, td { border-bottom: 1px solid var(--border); padding: 6px 8px; text-align: left; vertical-align: top; }
th { position: sticky; top: 0; background: var(--bg); font-size: 12px; color: var(--muted); }
tr.changed td.chg { background: var(--hl); } .chg { font-size: 12px; }
</style></head><body>
<h1>Revisión: ${items.length} perfumes</h1>
<p>${list.filter((x) => x._changes?.length).length} con correcciones (resaltadas en la última columna) · ${missing.length} con datos incompletos.</p>
<input type="search" id="q" placeholder="Filtrar…">
<div class="wrap"><table><thead><tr><th>#</th><th>Marca</th><th>Nombre</th><th>Conc.</th><th>Dupe de</th><th>Familia</th><th>2ª</th><th>Notas</th><th>Temporada</th><th>Ocasión</th><th>Momento</th><th>Correcciones</th></tr></thead>
<tbody>${rows}</tbody></table></div>
<script>document.getElementById('q').oninput=(e)=>{const q=e.target.value.toLowerCase();document.querySelectorAll('tbody tr').forEach(r=>{r.hidden=!!q&&!r.textContent.toLowerCase().includes(q)})}</script>
</body></html>`;

writeFileSync('migration/review.html', html);
const byFamily = Object.fromEntries(FAMILIES.map((f) => [f.label, items.filter((p) => p.familyMain === f.value).length]));
console.log(`${items.length} perfumes OK. Incompletos: ${missing.length}.`);
console.log(byFamily);
console.log('→ migration/review.html');
```

- [ ] **Step 2: armar `migration/perfumes.json` (investigación)**

Fuente: Sheet "Mis perfumes" (id `1lUve3qARZkQ_q_9PLLbq227vrzX_22kcDNmbKA1fYks`), leer con `mcp__claude_ai_Google_Drive__read_file_content`. Son 139 filas.

Formato de cada entrada (array JSON):
```json
{
  "brand": "Lattafa",
  "name": "Khamrah Qahwa",
  "concentration": "edp",
  "status": "owned",
  "dupeOf": [{ "brand": "By Kilian", "name": "Angels' Share" }],
  "familyMain": "gourmand",
  "familySecondary": "especiado",
  "notes": ["Café", "Canela", "Cardamomo", "Praliné", "Vainilla", "Haba tonka"],
  "seasons": ["invierno"],
  "occasions": ["salida", "cita"],
  "timeOfDay": "noche",
  "_changes": ["Dupe: «By Killian - Angels Share» → By Kilian - Angels' Share"]
}
```

Reglas:
- **Concentración:** Eau de Toilette → `edt`, Eau de Parfum → `edp`, Parfum → `parfum`, Extrait de Parfum → `extrait`.
- **Marcas:** trim; "Christian Dior" → Dior; Paco Rabbane → Paco Rabanne; Fragance World → Fragrance World; Rassasi → Rasasi; Viktor\&Rolf → Viktor&Rolf. La grafía final de cada marca debe existir en `BRAND_SEED`.
- **Nombres:** corregir typos verificando el nombre oficial en Fragrantica/iFragrance (Farenheit → Fahrenheit, Yatch Club → Yacht Club, Aqua Di Gio Profondo → Acqua di Giò Profondo, Luquid Brun → Liquid Brun, Le Beau Narcise → nombre oficial, Bade'e Al Oud Our for Glory → nombre oficial, etc.).
- **Dupe de:** separar en `{brand, name}`; expandir abreviaturas (PDM → Parfums de Marly, TF → Tom Ford, LV → Louis Vuitton, JPG → Jean Paul Gaultier, MFK → Maison Francis Kurkdjian, CH → Carolina Herrera, YSL → Yves Saint Laurent, Rabbane → Paco Rabanne, Armani → Giorgio Armani o Emporio Armani según corresponda, Killian/By Killian → By Kilian); invertir cuando viene "Perfume - Marca" ("Tobacolor - Dior" → Dior - Tobacolor, "Sand Dance - Stephane Humbert Lucas", "Sun Gria - Lorenzo Passaglia" → Lorenzo Pazzaglia - Sun Gria, "Tales from Zenzibar - MOPC" → verificar marca real); separar múltiples ("Creed - Aventus & Dior - Sauvage" → 2 entradas); entradas sin guion ("LV Pacific Chill", "Bleu de Chanel L'Exclusif", "YSL La Nuit Del Homme Blue Electric") → separar marca y nombre.
- Cada corrección se anota en `_changes` con el formato `Campo: «antes» → después`.
- **Investigación** por perfume (WebSearch en `ifragranceofficial.com/perfumes/…` y Fragrantica; los snippets alcanzan): familia principal y secundaria según los acordes principales, mapeados a las 11 familias; 5–8 notas principales **en español** (preferir grafías de `NOTE_SEED`); temporada/s, ocasión/es y momento según el perfil (acordes + votos de temporada/día-noche de Fragrantica cuando aparecen).
- Trabajar en tandas de ~30 perfumes; después de cada tanda correr `node tools/build-review.mjs` para validar.

- [ ] **Step 3: validar y generar la revisión**

Run: `node tools/build-review.mjs`
Expected: `139 perfumes OK. Incompletos: 0.` + conteo por familia + `→ migration/review.html`.

- [ ] **Step 4: revisión de Rodrigo**

Abrir la tabla: `Start-Process C:\Users\rodri\perfumes\migration\review.html` (PowerShell). Pedirle que la revise y diga qué cambiar. Aplicar las correcciones en `perfumes.json`, volver a correr el Step 3 y repetir hasta que apruebe.

- [ ] **Step 5: importar**

Con la aprobación: pedirle a Rodrigo que en la PC abra `https://rodririta24-spec.github.io/perfumes/#/importar`, elija `C:\Users\rodri\perfumes\migration\perfumes.json` y confirme. Expected: "✔ 139 perfumes importados". Verificar con él que la Colección muestra 139 y que Dupes lista los originales.

- [ ] **Step 6: commit (solo la herramienta)**

```bash
git add tools/build-review.mjs && git commit -m "chore: herramienta de validación y revisión de la migración" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git push
```

---

### Task 19: Cierre

- [ ] **Step 1: tests completos**

Run: `npm test && npm run test:rules`
Expected: todo PASS.

- [ ] **Step 2: verificación final en demo (celu y PC)**

Con chrome-devtools sobre `http://localhost:5174/?demo`, a 390×844 y 1280×800, en tema claro y oscuro (botón ◐): recorrer Colección, Ficha, Agregar, Hoy, Wishlist, Dupes. Sin errores de consola, sin scroll horizontal (`evaluate_script`: `document.documentElement.scrollWidth <= innerWidth`), chips de familia legibles en ambos temas.

- [ ] **Step 3: push final**

```bash
git push
```

- [ ] **Step 4: actualizar memoria**

Actualizar `C:\Users\rodri\.claude\projects\C--Users-rodri\memory\project_inventario_perfumes.md` con: URL publicada, repo, proyecto Firebase, estado de la migración y que `#/importar` existe para futuras importaciones.
