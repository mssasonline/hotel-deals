import { test, expect } from '@playwright/test';

// No storageState — all tests start with a clean unauthenticated browser context

test.describe('RBAC — unauthenticated access', () => {

  test('redirects to /login when accessing /admin without session', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('redirects to /login when accessing /partner without session', async ({ page }) => {
    await page.goto('/partner/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

});
