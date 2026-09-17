import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
  doc,
  getDocFromServer,
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
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';
import firebaseConfig from '../../firebase-applet-config.json';

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

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let analytics: Analytics | null = null;
let isConfigured = false;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  const dbId = (firebaseConfig as any).firestoreDatabaseId;

  // Configure Firestore with persistent local cache and multi-tab manager
  try {
    if (dbId) {
      db = initializeFirestore(
        app,
        {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
        },
        dbId
      );
    } else {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    }
  } catch {
    // If already initialized in this runtime instance
    db = dbId ? getFirestore(app, dbId) : getFirestore(app);
  }

  // Initialize Auth with local browser persistence
  try {
    auth = initializeAuth(app, {
      persistence: browserLocalPersistence,
    });
  } catch {
    auth = getAuth(app);
  }

  isConfigured = true;

  // Initialize Analytics if supported in the browser
  if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
    isSupported()
      .then((supported) => {
        if (supported) {
          analytics = getAnalytics(app);
        }
      })
      .catch(() => {
        // Ignore analytics in restricted iframe/browser environments
      });
  }
} catch (err) {
  console.warn('Fallback initializing Firestore & Auth:', err);
  app = getApps()[0] || initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  isConfigured = true;
}

export async function testFirestoreConnection(): Promise<boolean> {
  if (!db) return false;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client is offline or running in persistent local cache mode.');
    }
    return false;
  }
}

export { app, db, auth, analytics, isConfigured };

export async function loginWithGoogle() {
  if (!auth) {
    throw new Error('Firebase Auth not configured.');
  }
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export async function logoutUser() {
  if (auth) {
    return signOut(auth);
  }
}


