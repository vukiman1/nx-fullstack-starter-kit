import { fireEvent, render } from '@testing-library/react';

import App from './app';

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
  beforeEach(() => {
    window.history.pushState({}, '', '/');
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

    expect(await findByRole('dialog')).toBeTruthy();
    expect(await findByText(/enter your credentials/i)).toBeTruthy();
    expect(await findByLabelText(/email/i)).toBeTruthy();
    expect(await findByLabelText(/password/i)).toBeTruthy();
    expect(await findByRole('button', { name: /^sign in$/i })).toBeTruthy();
    expect(window.location.pathname).toBe('/');
  });

  it('validates login input before submit', async () => {
    const { findByLabelText, findByRole, findByText } = render(<App />);

    fireEvent.click(await findByRole('button', { name: /login/i }));

    const emailInput = await findByLabelText(/email/i);
    const passwordInput = await findByLabelText(/password/i);
    fireEvent.change(emailInput, { target: { value: '' } });
    fireEvent.change(passwordInput, { target: { value: '' } });

    fireEvent.click(await findByRole('button', { name: /^sign in$/i }));

    expect(await findByText('Enter a valid email address.')).toBeTruthy();
    expect(await findByText('Enter your password.')).toBeTruthy();
  });

  it('switches from sign-in to register inside the modal', async () => {
    const { findByRole, findByText } = render(<App />);

    fireEvent.click(await findByRole('button', { name: /login/i }));
    fireEvent.click(await findByRole('button', { name: /create an account/i }));

    expect(await findByRole('heading', { name: /register/i })).toBeTruthy();
    expect(await findByText(/create account flow/i)).toBeTruthy();
  });
});
