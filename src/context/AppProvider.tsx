import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { db, auth, isConfigured, testFirestoreConnection } from '../services/firebase';
import { OfflineDB } from '../services/db';
import { UserProfile } from '../types';

export interface AppContextType {
  isInitializing: boolean;
  isOnline: boolean;
  firestoreStatus: 'connected' | 'offline_cache' | 'unconfigured' | 'error';
  isSyncing: boolean;
  errorMessage: string | null;
  lastSyncTime: Date | null;
  isCheckingSync: boolean;
  isSessionLocked: boolean;
  setSessionLocked: (locked: boolean) => void;
  checkSyncNow: () => Promise<boolean>;
  retryInit: () => Promise<void>;
  validateAuthSession: () => boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [firestoreStatus, setFirestoreStatus] = useState<
    'connected' | 'offline_cache' | 'unconfigured' | 'error'
  >('unconfigured');
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isCheckingSync, setIsCheckingSync] = useState(false);
  const [isSessionLocked, setIsSessionLockedState] = useState<boolean>(() =>
    OfflineDB.isSessionLocked()
  );

  const setSessionLocked = useCallback((locked: boolean) => {
    OfflineDB.setSessionLocked(locked);
    setIsSessionLockedState(locked);
  }, []);

  // Authentication Guard: verifies if an authorized user is logged in
  const validateAuthSession = useCallback((): boolean => {
    const currentUser = OfflineDB.getCurrentUser();
    const isLocked = OfflineDB.isSessionLocked();
    const hasValidLocalUser = currentUser && (currentUser.role === 'admin' || currentUser.role === 'staff');
    const hasValidCloudUser = Boolean(auth?.currentUser);

    const isAuthorized = Boolean(hasValidLocalUser || hasValidCloudUser) && !isLocked;
    if (!isAuthorized) {
      setSessionLocked(true);
      return false;
    }
    return true;
  }, [setSessionLocked]);

  const checkSyncNow = useCallback(async (): Promise<boolean> => {
    setIsCheckingSync(true);
    setIsSyncing(true);
    try {
      if (isConfigured && db) {
        const isConnected = await testFirestoreConnection();
        if (isConnected) {
          setFirestoreStatus('connected');
          setLastSyncTime(new Date());
          setIsCheckingSync(false);
          setIsSyncing(false);
          return true;
        } else {
          setFirestoreStatus('offline_cache');
          setLastSyncTime(new Date());
          setIsCheckingSync(false);
          setIsSyncing(false);
          return false;
        }
      } else {
        setFirestoreStatus('offline_cache');
        setLastSyncTime(new Date());
        setIsCheckingSync(false);
        setIsSyncing(false);
        return false;
      }
    } catch {
      setFirestoreStatus('offline_cache');
      setIsCheckingSync(false);
      setIsSyncing(false);
      return false;
    }
  }, []);

  const initSystem = async () => {
    console.info('[AppProvider] Initializing New Sajjad Zari Corporation Cloud & Local Core...');
    setIsSyncing(true);
    try {
      // 1. Verify Browser Network Status
      const onlineNow = typeof navigator !== 'undefined' ? navigator.onLine : true;
      setIsOnline(onlineNow);

      // 2. Hydrate & verify local database cache
      OfflineDB.initDatabase();

      // 3. Inspect Firebase / Firestore configuration & persistentLocalCache status
      if (isConfigured && db) {
        console.info('[AppProvider] Firestore detected. Testing persistentLocalCache & server connection...');
        try {
          const isConnected = await testFirestoreConnection();
          if (isConnected) {
            console.info('[AppProvider] Firestore connection confirmed live.');
            setFirestoreStatus('connected');
            setLastSyncTime(new Date());
          } else {
            console.warn('[AppProvider] Firestore operating in high-speed offline persistentLocalCache mode.');
            setFirestoreStatus('offline_cache');
            setLastSyncTime(new Date());
          }
        } catch (dbErr: any) {
          const errCode = dbErr?.code || 'UNKNOWN_CACHE_ERR';
          console.warn(`[AppProvider] Warning: persistentLocalCache test warning [Code: ${errCode}]:`, dbErr);
          setFirestoreStatus('offline_cache');
          setLastSyncTime(new Date());
        }
      } else {
        console.info('[AppProvider] Firestore not cloud-provisioned. Operating in offline-first IndexedDB/LocalStorage mode.');
        setFirestoreStatus('offline_cache');
        setLastSyncTime(new Date());
      }

      // 4. Verify Authentication & Session Guard
      if (auth) {
        auth.onAuthStateChanged(
          (user) => {
            console.info('[AppProvider] Auth State Checked:', user ? user.email : 'No Cloud Session (Using Local Profiles)');
            if (!user && OfflineDB.isSessionLocked()) {
              setIsSessionLockedState(true);
            }
          },
          (authErr) => {
            console.warn('[AppProvider] Auth Listener warning:', authErr);
          }
        );
      }

      // Ensure local session lock integrity
      if (OfflineDB.isSessionLocked()) {
        setIsSessionLockedState(true);
      }

      setErrorMessage(null);
    } catch (err: any) {
      console.error('[AppProvider] Critical initialization exception:', err);
      setErrorMessage(err?.message || 'Initialization failed');
      setFirestoreStatus('error');
    } finally {
      setIsSyncing(false);
      setTimeout(() => {
        setIsInitializing(false);
      }, 350);
    }
  };

  useEffect(() => {
    initSystem();

    const handleOnline = () => {
      console.info('[AppProvider] Network back online.');
      setIsOnline(true);
      checkSyncNow();
    };

    const handleOffline = () => {
      console.warn('[AppProvider] Network is offline. Switched to persistent local cache.');
      setIsOnline(false);
      setFirestoreStatus('offline_cache');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Subscribe to cross-tab lock and sync messages
    const unsubscribeSync = OfflineDB.onSyncUpdate(() => {
      setIsSessionLockedState(OfflineDB.isSessionLocked());
    });

    // Periodic heartbeat sync check every 60s
    const syncInterval = setInterval(() => {
      if (navigator.onLine && isConfigured) {
        checkSyncNow();
      }
    }, 60000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(syncInterval);
      unsubscribeSync();
    };
  }, [checkSyncNow]);

  return (
    <AppContext.Provider
      value={{
        isInitializing,
        isOnline,
        firestoreStatus,
        isSyncing,
        errorMessage,
        lastSyncTime,
        isCheckingSync,
        isSessionLocked,
        setSessionLocked,
        checkSyncNow,
        retryInit: initSystem,
        validateAuthSession,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};


