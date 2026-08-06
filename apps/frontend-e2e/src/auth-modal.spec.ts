import { test, expect } from '@playwright/test';

test('opens the sign-in modal without leaving the page', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('My Workspace')).toBeVisible();
  await page.getByRole('button', { name: /login/i }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: /welcome back/i })).toBeVisible();

  // The modal opens on the choice of provider; the password fields are one step in.
  await dialog.getByRole('button', { name: /continue with email/i }).click();
  await expect(dialog.getByLabel('Email', { exact: true })).toBeVisible();
  // exact: the show/hide toggle is labelled 'Show password' and would match otherwise.
  await expect(dialog.getByLabel('Password', { exact: true })).toBeVisible();

  await expect(page).toHaveURL(/\?auth=login/);
});

test('closing the modal leaves the user where they were', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /login/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  await page.getByRole('button', { name: 'Close' }).click();

  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page).toHaveURL('/');
});
