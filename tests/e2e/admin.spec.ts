import { test, expect } from '@playwright/test';
import { ADMIN_AUTH_STATE, PARTNER_AUTH_STATE } from '../../playwright.config';

test.use({ storageState: ADMIN_AUTH_STATE });

test.describe('Admin — access & navigation', () => {

  test('dashboard loads with platform overview', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.locator('h1', { hasText: 'Platform Overview' })).toBeVisible({ timeout: 10_000 });
  });

  test('bookings page loads with data table', async ({ page }) => {
    await page.goto('/admin/bookings');
    await expect(page).toHaveURL(/\/admin\/bookings/);
    // Wait for at least one table row to appear
    await expect(page.locator('table, [role="table"], tbody tr').first()).toBeVisible({ timeout: 12_000 });
  });

  test('users page loads with suspend controls', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(page.locator('button', { hasText: 'Suspend' }).first()).toBeVisible({ timeout: 12_000 });
  });

  test('financials page loads', async ({ page }) => {
    await page.goto('/admin/financials');
    await expect(page).toHaveURL(/\/admin\/financials/);
    // Page should render content, not a blank/error state
    await expect(page.locator('main, [class*="p-6"]').first()).toBeVisible({ timeout: 12_000 });
  });

  test('reports page loads', async ({ page }) => {
    await page.goto('/admin/reports');
    await expect(page).toHaveURL(/\/admin\/reports/);
    await expect(page.locator('main, [class*="p-6"]').first()).toBeVisible({ timeout: 12_000 });
  });

});

test.describe('Admin — RBAC', () => {

  test('partner session cannot access admin (redirected to /)', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: PARTNER_AUTH_STATE });
    const page = await ctx.newPage();
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL('http://localhost:3000/', { timeout: 8_000 });
    await ctx.close();
  });

});
