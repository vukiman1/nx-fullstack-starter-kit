import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './app/app';
import { RootErrorFallback } from '@/features/error/root-error-fallback';
import { initSentry } from '@/lib/sentry';

initSentry();

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={RootErrorFallback}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
