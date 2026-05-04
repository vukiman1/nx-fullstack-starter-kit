import { fireEvent, render } from '@testing-library/react';

import App from './app';

describe('App', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('renders the home page header with auth navigation', async () => {
    const { findByRole, findByText } = render(<App />);

    expect(await findByText('My Workspace')).toBeTruthy();
    expect((await findByRole('link', { name: /login/i })).getAttribute('href')).toBe(
      '/login',
    );
    expect(
      (await findByRole('link', { name: /register/i })).getAttribute('href'),
    ).toBe('/register');
  });

  it('navigates to the login page', async () => {
    const { findByLabelText, findByRole, findByText } = render(<App />);

    fireEvent.click(await findByRole('link', { name: /login/i }));

    expect(await findByRole('heading', { name: /sign in/i })).toBeTruthy();
    expect(await findByText(/enter your credentials/i)).toBeTruthy();
    expect(await findByLabelText(/email/i)).toBeTruthy();
    expect(await findByLabelText(/password/i)).toBeTruthy();
    expect(await findByRole('button', { name: /sign in/i })).toBeTruthy();
  });

  it('validates login input before submit', async () => {
    const { findByLabelText, findByRole, findByText } = render(<App />);

    fireEvent.click(await findByRole('link', { name: /login/i }));

    const emailInput = await findByLabelText(/email/i);
    const passwordInput = await findByLabelText(/password/i);
    fireEvent.change(emailInput, { target: { value: '' } });
    fireEvent.change(passwordInput, { target: { value: '' } });

    fireEvent.click(await findByRole('button', { name: /sign in/i }));

    expect(await findByText('Enter a valid email address.')).toBeTruthy();
    expect(await findByText('Enter your password.')).toBeTruthy();
  });
});
