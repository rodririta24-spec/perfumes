import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, writeBatch,
} from '../fs.js';
import { firebaseConfig, OWNER_EMAIL } from '../config.js';
import { preparePerfume, importId, validPatch } from '../lib/perfume.js';
import { ValidationError } from '../lib/errors.js';
import { chunk } from '../lib/chunk.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// Caché persistente: la colección se ve sin conexión y las escrituras se sincronizan al volver.
const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
const col = collection(db, 'perfumes');

export const login = () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(auth, provider);
};
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

export async function updatePerfume(id, input) {
  const data = validated(input);
  return updateDoc(doc(col, id), { ...data, updatedAt: serverTimestamp() });
}

export async function patchPerfume(id, patch) {
  const errors = validPatch(patch);
  if (errors.length) throw new ValidationError(errors);
  return updateDoc(doc(col, id), { ...patch, updatedAt: serverTimestamp() });
}
export const removePerfume = (id) => deleteDoc(doc(col, id));

// Los llamadores deben pasar planImport(...).toAdd (nunca pisa perfumes existentes).
export async function importPerfumes(items, onProgress = () => {}) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('Sin conexión: conectate a internet para importar.');
  let done = 0;
  for (const part of chunk(items, 200)) {
    const batch = writeBatch(db);
    for (const data of part) batch.set(doc(col, importId(data)), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    await batch.commit();
    done += part.length;
    onProgress(done);
  }
  return done;
}
