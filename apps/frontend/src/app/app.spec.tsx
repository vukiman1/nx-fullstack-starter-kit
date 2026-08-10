import { act, fireEvent, render } from '@testing-library/react';

import App from './app';
import { router } from './router';

// Without this the auth bootstrap issues a real request, which jsdom rejects as cross-origin at an
// unpredictable moment — landing a toast in the middle of an unrelated assertion.
jest.mock('@/services/auth-service', () => ({
  authService: {
    getMe: jest.fn().mockRejectedValue(new Error('no session')),
    login: jest.fn(),
    logout: jest.fn(),
  },
}));

describe('App', () => {
  // The router is a module singleton, so a test that opens the auth modal leaves `?auth=` in its
  // state for the next test. Navigating back while still mounted is the only reset the router honours.
  afterEach(async () => {
    await act(async () => {
      await router.navigate({ to: '/', search: {} });
    });
  });

  it('renders the home page header with auth actions', async () => {
    const { findByRole, findByText } = render(<App />);

    expect(await findByText('My Workspace')).toBeTruthy();
    expect(await findByRole('button', { name: /login/i })).toBeTruthy();
    expect(await findByRole('button', { name: /register/i })).toBeTruthy();
  });

  it('opens the sign-in modal without leaving the page', async () => {
    const { findByLabelText, findByRole, findByText } = render(<App />);

    fireEvent.click(await findByRole('button', { name: /login/i }));
    fireEvent.click(await findByRole('button', { name: /continue with email/i }));

    expect(await findByRole('dialog')).toBeTruthy();
    expect(await findByText(/welcome back/i)).toBeTruthy();
    expect(await findByLabelText('Email')).toBeTruthy();
    expect(await findByLabelText('Password')).toBeTruthy();
    expect(await findByRole('button', { name: /^sign in$/i })).toBeTruthy();
    expect(window.location.pathname).toBe('/');
  });

  it('validates login input before submit', async () => {
    const { findByLabelText, findByRole, findByText } = render(<App />);

    fireEvent.click(await findByRole('button', { name: /login/i }));
    fireEvent.click(await findByRole('button', { name: /continue with email/i }));

    const emailInput = await findByLabelText('Email');
    const passwordInput = await findByLabelText('Password');
    fireEvent.change(emailInput, { target: { value: '' } });
    fireEvent.change(passwordInput, { target: { value: '' } });

    fireEvent.click(await findByRole('button', { name: /^sign in$/i }));

    expect(await findByText('Enter a valid email address.')).toBeTruthy();
    expect(await findByText('Enter your password.')).toBeTruthy();
  });

  it('switches from sign-in to register inside the modal', async () => {
    const { findByLabelText, findByRole } = render(<App />);

    fireEvent.click(await findByRole('button', { name: /login/i }));
    fireEvent.click(await findByRole('button', { name: /create an account/i }));

    expect(await findByRole('heading', { name: /create your account/i })).toBeTruthy();

    // Register opens on the same provider choice as sign-in; the fields are one step in.
    fireEvent.click(await findByRole('button', { name: /continue with email/i }));
    expect(await findByLabelText('Confirm password')).toBeTruthy();
  });
});
