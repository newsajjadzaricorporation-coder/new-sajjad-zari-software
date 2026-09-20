import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  Firestore,
  doc,
  getDocFromServer,
  setLogLevel,
} from 'firebase/firestore';
import {
  initializeAuth,
  getAuth,
  browserLocalPersistence,
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import type { Analytics } from 'firebase/analytics';
import rawFirebaseConfig from '../../firebase-applet-config.json';

// Suppress noisy Firestore internal retry warnings when operating in offline/local cache mode
try {
  setLogLevel('silent');
} catch {
  // Ignored if not supported in environment
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
  authInstance?: Auth | null
) {
  const currentAuth = authInstance || auth;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuth?.currentUser?.uid,
      email: currentAuth?.currentUser?.email,
      emailVerified: currentAuth?.currentUser?.emailVerified,
      isAnonymous: currentAuth?.currentUser?.isAnonymous,
      tenantId: currentAuth?.currentUser?.tenantId,
      providerInfo:
        currentAuth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let analytics: Analytics | null = null;
let isConfigured = false;

// Validate that Firebase configuration has valid, non-empty credentials to prevent auth/argument-error
function isValidFirebaseConfig(cfg: any): boolean {
  if (!cfg || typeof cfg !== 'object') return false;
  const hasApiKey = typeof cfg.apiKey === 'string' && cfg.apiKey.trim().length > 5;
  const hasProjectId = typeof cfg.projectId === 'string' && cfg.projectId.trim().length > 2;
  return Boolean(hasApiKey && hasProjectId);
}

try {
  if (isValidFirebaseConfig(rawFirebaseConfig)) {
    if (!getApps().length) {
      app = initializeApp(rawFirebaseConfig);
    } else {
      app = getApps()[0];
    }

    const dbId = (rawFirebaseConfig as any).firestoreDatabaseId;

    // Configure Firestore with persistent local cache, multi-tab manager and long polling
    try {
      const cacheSetting = persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      });

      const firestoreSettings = {
        localCache: cacheSetting,
        experimentalForceLongPolling: true,
        experimentalAutoDetectLongPolling: true,
      };

      if (dbId) {
        db = initializeFirestore(app, firestoreSettings, dbId);
      } else {
        db = initializeFirestore(app, firestoreSettings);
      }
    } catch (cacheErr) {
      console.warn('Persistent cache initialization fallback to memoryLocalCache:', cacheErr);
      try {
        const memorySettings = {
          localCache: memoryLocalCache(),
          experimentalForceLongPolling: true,
        };
        db = dbId ? initializeFirestore(app, memorySettings, dbId) : initializeFirestore(app, memorySettings);
      } catch {
        db = dbId ? getFirestore(app, dbId) : getFirestore(app);
      }
    }

    // Initialize Auth safely with local browser persistence & argument validation
    try {
      auth = initializeAuth(app, {
        persistence: browserLocalPersistence,
      });
    } catch (authInitErr: any) {
      if (authInitErr?.code === 'auth/already-initialized') {
        auth = getAuth(app);
      } else {
        console.warn('Fallback initializing default Auth:', authInitErr);
        auth = getAuth(app);
      }
    }

    isConfigured = true;
  } else {
    console.info('[Firebase] Valid configuration not detected. Operating securely in offline-first mode.');
    isConfigured = false;
  }
} catch (err) {
  console.warn('[Firebase] Graceful initialization fallback:', err);
  if (app) {
    try {
      db = getFirestore(app);
      auth = getAuth(app);
      isConfigured = true;
    } catch {
      // offline-only mode
      isConfigured = false;
    }
  }
}

export async function testFirestoreConnection(): Promise<boolean> {
  if (!db) return false;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }
  try {
    const timeoutPromise = new Promise<boolean>((resolve) =>
      setTimeout(() => resolve(false), 2000)
    );
    const fetchPromise = getDocFromServer(doc(db, 'test', 'connection'))
      .then(() => true)
      .catch((err) => {
        // Suppress expected offline / unreachable errors cleanly
        if (err?.code === 'unavailable' || err?.code === 'failed-precondition' || String(err).includes('offline')) {
          return false;
        }
        return false;
      });

    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.info('Firestore client is offline or running in persistent local cache mode.');
    }
    return false;
  }
}

export { app, db, auth, analytics, isConfigured };

export async function loginWithGoogle() {
  if (!auth) {
    throw new Error('Firebase Auth not configured or running in offline mode.');
  }
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export async function logoutUser() {
  if (auth) {
    return signOut(auth);
  }
}



