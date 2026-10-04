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
  it('subcollections under perfumes are closed', async () => {
    await assertFails(setDoc(doc(as(OWNER), 'perfumes/p1/x/y'), { a: 1 }));
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
  it('unauthenticated cannot write', async () => {
    await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), 'perfumes/x'), { brand: 'X' }));
  });
  it('unauthenticated cannot read', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'perfumes/p1')));
  });
});
