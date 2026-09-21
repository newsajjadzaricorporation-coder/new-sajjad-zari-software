import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppProvider } from './context/AppProvider';
import { LanguageProvider } from './context/LanguageContext';
import { NetworkService } from './services/network';
import './index.css';

// Startup logging and global rejection safety
console.info('[Init] New Sajjad Zari Corporation starting...');

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reasonMsg = event.reason?.message || String(event.reason || '');
    
    // Robust recovery and suppression mechanism for WebSocket / HMR connection failures
    if (
      reasonMsg.includes('WebSocket') ||
      reasonMsg.includes('websocket') ||
      reasonMsg.includes('closed without opened') ||
      event.reason?.code === 1006
    ) {
      console.warn('[Network Diagnostic] Handled WebSocket connection drop gracefully:', reasonMsg);
      NetworkService.handleWebSocketFailure(reasonMsg);
      event.preventDefault();
      return;
    }

    if (
      reasonMsg.includes('print') ||
      reasonMsg.includes('aborted') ||
      event.reason?.name === 'AbortError'
    ) {
      event.preventDefault();
      return;
    }

    console.warn('[Global Unhandled Rejection Caught]:', event.reason);
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (
      msg.includes('WebSocket') ||
      msg.includes('websocket') ||
      msg.includes('closed without opened') ||
      msg.includes('ResizeObserver')
    ) {
      if (msg.includes('WebSocket') || msg.includes('websocket')) {
        NetworkService.handleWebSocketFailure(msg);
      }
      // Suppress benign dev-environment websocket / layout observer noise
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppProvider>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </AppProvider>
    </ErrorBoundary>
  </StrictMode>
);
