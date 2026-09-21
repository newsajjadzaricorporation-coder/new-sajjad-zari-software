/**
 * Network Diagnostic & Health Service
 * Handles connectivity probes, WebSocket / HMR health checks,
 * persistent cache verification, and offline state monitoring.
 */

export interface NetworkHealthState {
  isOnline: boolean;
  latencyMs: number | null;
  wsStatus: 'connected' | 'fallback_polling' | 'disconnected' | 'error';
  lastPingTime: number | null;
  serviceWorkerStatus: 'active' | 'installing' | 'waiting' | 'unsupported' | 'not_registered';
  storageQuota: {
    usedKb: number;
    quotaKb: number;
    percentUsed: number;
  };
  persistentCacheStatus: 'synced' | 'offline_cache' | 'conflict' | 'error';
  hasWebSocketError: boolean;
  webSocketErrorMessage: string | null;
}

type HealthListener = (state: NetworkHealthState) => void;

class NetworkDiagnosticService {
  private state: NetworkHealthState = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    latencyMs: null,
    wsStatus: 'connected',
    lastPingTime: null,
    serviceWorkerStatus: 'not_registered',
    storageQuota: { usedKb: 0, quotaKb: 0, percentUsed: 0 },
    persistentCacheStatus: 'synced',
    hasWebSocketError: false,
    webSocketErrorMessage: null,
  };

  private listeners: Set<HealthListener> = new Set();
  private pingIntervalId: number | null = null;
  private wsRetryCount = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initListeners();
      this.checkServiceWorker();
      this.checkStorageQuota();
      this.startHeartbeat(15000);
    }
  }

  private initListeners() {
    window.addEventListener('online', () => {
      this.state.isOnline = true;
      this.ping();
      this.notify();
    });

    window.addEventListener('offline', () => {
      this.state.isOnline = false;
      this.state.latencyMs = null;
      this.state.wsStatus = 'disconnected';
      this.notify();
    });

    // Listen for WebSocket connection errors caught by Vite client or window
    window.addEventListener('vite:ws:disconnect', () => {
      this.handleWebSocketFailure('Vite HMR WebSocket disconnected');
    });

    // Global custom event for reporting websocket issues
    window.addEventListener('ws-error-detected', ((event: CustomEvent) => {
      this.handleWebSocketFailure(event.detail?.message || 'WebSocket closed without opened');
    }) as EventListener);
  }

  public subscribe(listener: HealthListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(currentState);
      } catch (err) {
        console.warn('[NetworkService] Listener notification error:', err);
      }
    });
  }

  public getState(): NetworkHealthState {
    return { ...this.state, storageQuota: { ...this.state.storageQuota } };
  }

  public handleWebSocketFailure(message: string) {
    this.wsRetryCount++;
    this.state.hasWebSocketError = true;
    this.state.webSocketErrorMessage = message;
    this.state.wsStatus = this.wsRetryCount > 2 ? 'fallback_polling' : 'disconnected';
    this.notify();
  }

  public clearWebSocketError() {
    this.state.hasWebSocketError = false;
    this.state.webSocketErrorMessage = null;
    this.state.wsStatus = 'connected';
    this.wsRetryCount = 0;
    this.notify();
  }

  /**
   * Performs an active HTTP/HTTPS latency ping test
   */
  public async ping(): Promise<{ ok: boolean; latency: number }> {
    const start = performance.now();
    try {
      // Ping a lightweight local asset or timestamp with cache busting
      const response = await fetch(`/?_ping=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store',
      });
      const latency = Math.round(performance.now() - start);
      if (response.ok || response.status < 500) {
        this.state.isOnline = true;
        this.state.latencyMs = latency;
        this.state.lastPingTime = Date.now();
        this.notify();
        return { ok: true, latency };
      }
      throw new Error(`Ping failed with status ${response.status}`);
    } catch {
      // Fallback: check navigator.onLine
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : false;
      this.state.isOnline = isOnline;
      this.state.latencyMs = null;
      this.notify();
      return { ok: isOnline, latency: -1 };
    }
  }

  /**
   * Inspects Service Worker status
   */
  public async checkServiceWorker(): Promise<string> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      this.state.serviceWorkerStatus = 'unsupported';
      this.notify();
      return 'unsupported';
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        this.state.serviceWorkerStatus = 'not_registered';
      } else if (registration.active) {
        this.state.serviceWorkerStatus = 'active';
      } else if (registration.waiting) {
        this.state.serviceWorkerStatus = 'waiting';
      } else if (registration.installing) {
        this.state.serviceWorkerStatus = 'installing';
      }
    } catch {
      this.state.serviceWorkerStatus = 'not_registered';
    }
    this.notify();
    return this.state.serviceWorkerStatus;
  }

  /**
   * Checks Storage Quota & Usage for persistentLocalCache
   */
  public async checkStorageQuota(): Promise<{ usedKb: number; quotaKb: number; percentUsed: number }> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const usedKb = Math.round((estimate.usage || 0) / 1024);
        const quotaKb = Math.round((estimate.quota || 0) / 1024);
        const percentUsed = quotaKb > 0 ? Math.round((usedKb / quotaKb) * 100) : 0;
        this.state.storageQuota = { usedKb, quotaKb, percentUsed };
        this.notify();
        return this.state.storageQuota;
      } catch {
        // ignore
      }
    }

    // Fallback: approximate localStorage usage
    let totalChars = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          totalChars += (localStorage.getItem(key) || '').length;
        }
      }
    } catch {
      // ignore
    }
    const usedKb = Math.round((totalChars * 2) / 1024);
    const quotaKb = 5120; // standard 5MB localstorage limit
    const percentUsed = Math.min(100, Math.round((usedKb / quotaKb) * 100));
    this.state.storageQuota = { usedKb, quotaKb, percentUsed };
    this.notify();
    return this.state.storageQuota;
  }

  public startHeartbeat(intervalMs = 15000) {
    if (this.pingIntervalId) clearInterval(this.pingIntervalId);
    this.ping();
    this.pingIntervalId = window.setInterval(() => {
      this.ping();
      this.checkStorageQuota();
    }, intervalMs);
  }

  public stopHeartbeat() {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
  }

  /**
   * Performs a hard window reload to reset the dev server connection state
   */
  public hardReload() {
    console.info('[NetworkService] Performing hard window reload to re-establish WebSocket/dev connection...');
    window.location.reload();
  }
}

export const NetworkService = new NetworkDiagnosticService();
