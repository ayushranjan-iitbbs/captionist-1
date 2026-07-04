import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getStorage, type Storage } from 'firebase-admin/storage';
import fs from 'fs';

/**
 * Hardened service-account loader.
 * Accepts (in priority order):
 *   1. FIREBASE_SERVICE_ACCOUNT  -> single-line JSON string
 *   2. FIREBASE_SERVICE_ACCOUNT_PATH -> path to a JSON key file
 *   3. Three split vars: FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
 *
 * Private keys are normalized so escaped "\n" sequences become real newlines.
 * This is the same loader pattern reused across the Baba-family projects to
 * avoid the custom-domain vs Vercel-preview env mismatch.
 *
 * Initialization is LAZY: the admin app is only created the first time one of
 * the exported services is actually used at runtime. This keeps `next build`
 * (which imports route modules to collect metadata) from throwing when env
 * vars aren't present in the build environment.
 */
function normalizePrivateKey(key: string): string {
  let k = key.trim();
  // Strip wrapping quotes if the value was pasted with them
  if (
    (k.startsWith('"') && k.endsWith('"')) ||
    (k.startsWith("'") && k.endsWith("'"))
  ) {
    k = k.slice(1, -1);
  }
  // Convert escaped newlines into real newlines
  k = k.replace(/\\n/g, '\n');
  return k;
}

function loadServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    const parsed = JSON.parse(raw);
    if (parsed.private_key) parsed.private_key = normalizePrivateKey(parsed.private_key);
    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key,
    };
  }

  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (path && fs.existsSync(path)) {
    const parsed = JSON.parse(fs.readFileSync(path, 'utf8'));
    if (parsed.private_key) parsed.private_key = normalizePrivateKey(parsed.private_key);
    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key,
    };
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    return {
      projectId,
      clientEmail,
      privateKey: normalizePrivateKey(privateKey),
    };
  }

  throw new Error(
    'Firebase admin credentials missing. Set FIREBASE_SERVICE_ACCOUNT (single-line JSON), ' +
      'FIREBASE_SERVICE_ACCOUNT_PATH, or the three split vars FIREBASE_PROJECT_ID / ' +
      'FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY.'
  );
}

let _app: App | null = null;
function getAdminApp(): App {
  if (_app) return _app;
  if (getApps().length) {
    _app = getApps()[0];
    return _app;
  }
  const sa = loadServiceAccount();
  _app = initializeApp({
    credential: cert(sa),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
  return _app;
}

/**
 * Lazy proxy: behaves exactly like the underlying service object, but the
 * admin app (and credential loading) is only initialized on first property
 * access. Call sites keep using `adminDb.collection(...)` unchanged.
 */
function lazy<T extends object>(resolve: () => T): T {
  return new Proxy({} as T, {
    get(_t, prop, receiver) {
      const target = resolve();
      const value = Reflect.get(target as object, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

// Memoize Firestore and enable `ignoreUndefinedProperties` so writes can omit
// `undefined` fields instead of throwing "Cannot use 'undefined' as a value".
//
// `settings()` may only be called once, before any other Firestore method. In
// dev, Next.js hot-reloads recompile this module (resetting `_db`) while the
// underlying firebase-admin app persists across reloads — so a later compile
// can receive a Firestore singleton that was already used, making `settings()`
// throw "already initialized". The first successful call (in whichever compile
// ran first) has already applied the option to that persistent singleton, so
// we simply swallow the throw on subsequent attempts.
let _db: Firestore | null = null;
function getDb(): Firestore {
  if (_db) return _db;
  const db = getFirestore(getAdminApp());
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // settings already applied to this (persistent) instance — safe to ignore
  }
  _db = db;
  return _db;
}

export const adminDb: Firestore = lazy(() => getDb());
export const adminAuth: Auth = lazy(() => getAuth(getAdminApp()));
export const adminStorage: Storage = lazy(() => getStorage(getAdminApp()));
export default getAdminApp;