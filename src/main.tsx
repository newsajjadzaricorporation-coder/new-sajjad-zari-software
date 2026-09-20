import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppProvider } from './context/AppProvider';
import { LanguageProvider } from './context/LanguageContext';
import './index.css';

// Startup logging for diagnostics
console.info('[Init] New Sajjad Zari Corporation starting...');

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

