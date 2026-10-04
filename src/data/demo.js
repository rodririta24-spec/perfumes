// Backend en memoria con la misma interfaz que backend.js. Solo para probar en localhost con ?demo.
import { preparePerfume, importId, validPatch } from '../lib/perfume.js';
import { ValidationError } from '../lib/errors.js';
import { DEMO_PERFUMES } from '../seed/demo-perfumes.js';

let perfumes = DEMO_PERFUMES.map((p, i) => ({ id: `demo${i}`, ...preparePerfume(p).data }));
let listener = null;
let seq = 1000;

const emit = () => setTimeout(() => listener?.(structuredClone(perfumes)), 0);

function validated(input) {
  const { errors, data } = preparePerfume(input);
  if (errors.length) throw new ValidationError(errors);
  return data;
}

export const login = async () => {};
export const logout = async () => { location.href = location.pathname + '?demo'; };
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
  if (!perfumes.some((p) => p.id === id)) throw new Error('No existe');
  perfumes = perfumes.map((p) => (p.id === id ? { id, ...data } : p));
  emit();
}

export async function patchPerfume(id, patch) {
  const errors = validPatch(patch);
  if (errors.length) throw new ValidationError(errors);
  if (!perfumes.some((p) => p.id === id)) throw new Error('No existe');
  perfumes = perfumes.map((p) => (p.id === id ? { ...p, ...patch } : p));
  emit();
}

export async function removePerfume(id) {
  perfumes = perfumes.filter((p) => p.id !== id);
  emit();
}

// Los llamadores deben pasar planImport(...).toAdd (nunca pisa perfumes existentes).
export async function importPerfumes(items, onProgress = () => {}) {
  for (const data of items) {
    const rec = { id: importId(data), ...data };
    const i = perfumes.findIndex((p) => p.id === rec.id);
    if (i >= 0) perfumes[i] = rec; else perfumes.push(rec);
  }
  emit();
  onProgress(items.length);
  return items.length;
}
