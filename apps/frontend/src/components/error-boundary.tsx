import { Component, type ReactNode } from 'react';
import { reportError } from '@/lib/error-reporting';

export interface ErrorFallbackProps {
  error: unknown;
  resetError: () => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: (props: ErrorFallbackProps) => ReactNode;
}

interface ErrorBoundaryState {
  error: unknown;
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null, hasError: false };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error, hasError: true };
  }

  override componentDidCatch(error: unknown): void {
    reportError(error);
  }

  private readonly resetError = (): void => {
    this.setState({ error: null, hasError: false });
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback({ error: this.state.error, resetError: this.resetError });
    }
    return this.props.children;
  }
}
