import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './app/app';
import { ErrorBoundary } from '@/components/error-boundary';
import { RootErrorFallback } from '@/features/error/root-error-fallback';
import { initErrorReporting } from '@/lib/error-reporting';

void initErrorReporting();

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <StrictMode>
    <ErrorBoundary fallback={RootErrorFallback}>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
