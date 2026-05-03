import { test, expect } from '@playwright/test';

test('navigates from home to login', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('My Workspace')).toBeVisible();
  await page.getByRole('link', { name: /login/i }).click();

  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
});
