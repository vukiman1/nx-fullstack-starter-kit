import { fireEvent, render, screen } from '@testing-library/react';
import { ErrorBoundary, type ErrorFallbackProps } from './error-boundary';
import { reportError } from '@/lib/error-reporting';

jest.mock('@/lib/error-reporting', () => ({ reportError: jest.fn() }));

function Boom({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('kaboom');
  }
  return <p>all good</p>;
}

function Fallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div>
      <p>caught: {error instanceof Error ? error.message : 'unknown'}</p>
      <button onClick={resetError} type="button">
        Try again
      </button>
    </div>
  );
}

function boundary(shouldThrow: boolean) {
  return (
    <ErrorBoundary fallback={(props) => <Fallback {...props} />}>
      <Boom shouldThrow={shouldThrow} />
    </ErrorBoundary>
  );
}

function renderBoundary(shouldThrow: boolean) {
  return render(boundary(shouldThrow));
}

describe('ErrorBoundary', () => {
  // React logs caught render errors to the console; silence it so a passing run stays readable.
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => consoleError.mockRestore());

  it('renders children while nothing throws', () => {
    renderBoundary(false);

    expect(screen.getByText('all good')).toBeTruthy();
  });

  it('shows the fallback with the thrown error', () => {
    renderBoundary(true);

    expect(screen.getByText('caught: kaboom')).toBeTruthy();
  });

  it('reports the error so it is not swallowed silently', () => {
    renderBoundary(true);

    expect(reportError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('goes back to the children after a reset', () => {
    const { rerender } = renderBoundary(true);
    expect(screen.getByText('caught: kaboom')).toBeTruthy();

    rerender(boundary(false));
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByText('all good')).toBeTruthy();
  });
});
