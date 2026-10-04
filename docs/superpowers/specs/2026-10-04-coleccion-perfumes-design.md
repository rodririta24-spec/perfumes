# Colección de Perfumes — Diseño

**Fecha:** 2026-10-04
**Estado:** Aprobado en brainstorming, pendiente de revisión del documento

## Objetivo

App web personal para administrar la colección de perfumes de Rodrigo y elegir qué usar cada día. Reemplaza el Google Sheet "Mis perfumes" (id `1lUve3qARZkQ_q_9PLLbq227vrzX_22kcDNmbKA1fYks`, 139 perfumes, columnas Brand / Name / Concentration / Dupe Of). El Sheet no se modifica y queda como respaldo; la app no depende de él.

## Usuarios y acceso

- **Único usuario:** Rodrigo (rodri.rita24@gmail.com). Lee y edita todo.
- Cualquier otra cuenta ve "No tenés acceso" y Firestore le niega todo.
- Uso en **celular y PC**. Diseño responsive; en celular se instala en pantalla de inicio como PWA. **Sin APK.**

## Arquitectura

```
index.html (GitHub Pages, PWA)  ──login Google──►  Firebase Auth
        │
        ├── lee/escribe ──►  Firestore
        │                     ├─ perfumes/{perfumeId}
        │                     ├─ brands/{brandId}
        │                     └─ notes/{noteId}
        │
        └── clima ──►  Open-Meteo (sin API key)
```

- **Frontend:** `index.html` estático + ES modules, Firebase JS SDK desde CDN. Misma estructura que `inventario-samples`. Lógica pura (sugerencias, normalización, enlace de dupes, mood) en módulos separados y testeables.
- **Backend:** Firebase, **proyecto nuevo** separado de inventario-samples. Plan gratuito (Spark).
- **Hosting:** repo GitHub nuevo `perfumes` con GitHub Pages. Repo local en `C:\Users\rodri\perfumes`.
- **Offline:** persistencia offline de Firestore habilitada; la colección se ve sin conexión y los cambios se sincronizan al volver.
- **PWA:** `manifest.json` + íconos para "Agregar a pantalla de inicio" (modo standalone).

### Reglas de seguridad de Firestore

- Lectura y escritura de todas las colecciones: solo si `request.auth.token.email == "rodri.rita24@gmail.com"` y `email_verified == true`.
- Todo lo demás denegado.

## Modelo de datos

### `perfumes/{perfumeId}`

| Campo | Tipo | Reglas |
|---|---|---|
| `brand` | string | obligatorio, elegido del catálogo `brands` |
| `name` | string | obligatorio, texto libre |
| `concentration` | enum | obligatorio: `edt`, `edp`, `parfum`, `extrait`, `cologne`, `elixir` |
| `status` | enum | `owned` (colección) o `wishlist` |
| `dupeOf` | array de `{brand, name}` | opcional, admite varios originales |
| `familyMain` | enum | una de las 11 familias (ver abajo); opcional en altas nuevas |
| `familySecondary` | enum | opcional, misma lista, distinta de `familyMain` |
| `notes` | string[] | opcional, lista simple de notas principales (5–8 sugeridas), del catálogo `notes` |
| `seasons` | enum[] | `verano`, `invierno`, `entretiempo`, `todo_el_anio` |
| `occasions` | enum[] | `diario`, `oficina`, `salida`, `cita`, `evento` |
| `timeOfDay` | enum | `dia`, `noche`, `ambos` |
| `rating` | int | opcional, 1–10 |
| `favorite` | bool | default `false` |
| `createdAt`, `updatedAt` | timestamp | automáticos |

### Familias y mood

El **mood** no se guarda: se deriva de `familyMain`.

| Familia (`familyMain`) | Mood |
|---|---|
| Cítrico, Acuático, Aromático, Verde | 🧊 Fresco |
| Floral, Frutal | 🌸 Floral |
| Amaderado | 🌲 Amaderado |
| Cuero/Tabaco, Oriental/Ámbar, Especiado, Gourmand | 🔥 Cálido |

Cada familia tiene un color propio para su chip.

### `brands/{brandId}`

- `name` (string, único por nombre normalizado), `custom` (bool: `true` si la agregó el usuario).
- Precarga de ~800 marcas: diseñador, nicho y árabes/clones.
- El selector de marca es un dropdown con buscador; si no existe, opción "Agregar «X»" que la crea con `custom: true`.

### `notes/{noteId}`

- `name` (string, único normalizado). Se precarga con todas las notas usadas en la migración.
- Selector de notas: buscador con chips; si no existe, "Agregar «X»".

### Normalización

Para comparar (unicidad de marcas/notas y enlace de dupes): minúsculas, trim, sin acentos, espacios colapsados, `&` ≡ `and`.

### Enlace de dupes

Un dupe se enlaza con un perfume de la colección cuando `normalize(dupeOf.brand) == normalize(brand)` y `normalize(dupeOf.name) == normalize(name)`. Se calcula en el cliente, no se guarda.

## Pantallas

Navegación: barra inferior en celular (Colección · Hoy · Wishlist · Dupes), barra superior en PC.

### 1. Colección (principal)

- Buscador: nombre, marca, nota, o marca/nombre de `dupeOf`.
- Chips de filtro rápido: Mood, Temporada, Ocasión, Favoritos, Solo dupes.
- Filtros avanzados plegables: marca, familia, concentración, nota.
- Orden: marca, nombre, puntuación.
- Celular: tarjetas. PC: grilla/tabla. Cada ítem muestra marca, nombre, concentración, chip de familia, ⭐ y "dupe de" si aplica.
- Resumen: total y conteo por mood.

### 2. Ficha del perfume

- Todos los campos, editables en la misma pantalla.
- Botón **"Ver en Fragrantica"**: abre `https://www.fragrantica.com/search/?query=<marca> <nombre>` en pestaña nueva, para elegir familia/notas/temporada mirando la ficha.
- Si es dupe de un perfume que el usuario tiene: link al original. Si es un original: "Tus dupes de este: …".
- Eliminar perfume (con confirmación).

### 3. Agregar perfume

- Obligatorios: marca, nombre, concentración, estado (Colección / Wishlist). El resto se completa después desde la ficha.

### 4. ¿Qué me pongo hoy?

- Muestra el clima actual (temperatura y estado) obtenido de Open-Meteo con la geolocalización del navegador.
- Chips de ocasión (uno seleccionado; default `diario`).
- Muestra **3 sugerencias** de la colección (`status == owned`) y botón 🔄 para volver a sortear.
- **Algoritmo:** puntaje por perfume + sorteo ponderado sin repetición:
  - Filtra por ocasión si el perfume tiene `occasions` cargadas; los que no tienen ocasiones cargadas entran con peso reducido.
  - Temperatura > 25°: prioriza mood Fresco y temporada `verano`. < 15°: prioriza Cálido y `invierno`. 15–25°: neutral, prioriza `entretiempo`. `todo_el_anio` siempre suma.
  - Momento: según la hora local (día 7–19 h, noche el resto) suma si `timeOfDay` coincide o es `ambos`.
  - Bonus por `favorite` y por `rating` alto.
- **Fallback:** sin permiso de ubicación o si falla Open-Meteo, usa la estación según la fecha (hemisferio sur: dic–feb verano, jun–ago invierno, resto entretiempo) y lo indica en pantalla.

### 5. Wishlist

- Misma vista que Colección filtrada a `status == wishlist`. Botón **"¡Lo compré!"** que pasa a `owned`.

### 6. Dupes

- Agrupado por original (`dupeOf`): "Creed - Aventus → Supremacy Silver, Club de Nuit Urban Elixir". Si el original está en la colección, se marca.

## Migración inicial (una sola vez, la hace Claude)

1. Leer el Sheet "Mis perfumes".
2. Normalizar:
   - Marcas: unificar "Christian Dior"/"Dior", Paco Rabbane → Rabanne (Paco Rabanne), Fragance World → Fragrance World, Rassasi → Rasasi, trim de espacios.
   - Nombres: Farenheit → Fahrenheit, Yatch Club → Yacht Club, Aqua Di Gio → Acqua di Giò, Luquid Brun → Liquid Brun, y otros errores de tipeo que aparezcan.
   - Concentración: mapear al enum.
   - `Dupe Of`: separar en `{brand, name}`, expandir abreviaturas (PDM → Parfums de Marly, TF → Tom Ford, LV → Louis Vuitton, JPG → Jean Paul Gaultier, MFK → Maison Francis Kurkdjian, CH → Carolina Herrera, YSL → Yves Saint Laurent, etc.), corregir órdenes invertidos ("Tobacolor - Dior" → Dior - Tobacolor) y separar múltiples ("Creed - Aventus & Dior - Sauvage" → 2 originales).
3. Investigar los 139 (iFragrance, Fragrantica y otras fuentes vía buscador): `familyMain`, `familySecondary`, `notes` (5–8), `seasons`, `occasions`, `timeOfDay`.
4. Generar una **tabla de revisión** con todos los datos y las correcciones marcadas, para que el usuario la apruebe o corrija.
5. Con el OK, importar a Firestore con un script. `status = owned`, `rating` vacío, `favorite = false`.

## Fuera de alcance

- Autocompletado automático de notas desde la app (iFragrance bloquea pedidos automáticos y no tiene API; Fragella API descartada por el usuario). Los perfumes nuevos se completan a mano con "Ver en Fragrantica" o pidiéndoselo a Claude.
- Tamaño, cantidad restante, precio, original/decant, foto, última vez usado, duración/proyección.
- Pirámide de notas (salida/corazón/fondo).
- Acceso de otros usuarios.

## Pruebas

- Tests unitarios de la lógica pura: normalización, derivación de mood, enlace de dupes, algoritmo de sugerencias (incluye fallback por estación) y parseo de la migración.
- Verificación manual en navegador (celular y PC) antes de publicar. El login de Google se prueba en el navegador del usuario (no funciona en el Chrome del MCP).
