import { test, expect } from '@playwright/test';
import { PARTNER_AUTH_STATE, AUTH_STATE } from '../../playwright.config';

test.use({ storageState: PARTNER_AUTH_STATE });

test.describe('Partner — access & navigation', () => {

  test('dashboard loads', async ({ page }) => {
    await page.goto('/partner/dashboard');
    await expect(page).toHaveURL(/\/partner\/dashboard/);
    // Dashboard renders hotel selector or "no hotels" state — either way page loads
    await expect(page.locator('main, [class*="p-6"], h1, h2').first()).toBeVisible({ timeout: 12_000 });
  });

  test('bookings page loads', async ({ page }) => {
    await page.goto('/partner/bookings');
    await expect(page).toHaveURL(/\/partner\/bookings/);
    await expect(page.locator('main, [class*="p-6"]').first()).toBeVisible({ timeout: 12_000 });
  });

  test('hotels page loads', async ({ page }) => {
    await page.goto('/partner/hotels');
    await expect(page).toHaveURL(/\/partner\/hotels/);
    await expect(page.locator('main, [class*="p-6"]').first()).toBeVisible({ timeout: 12_000 });
  });

  test('rooms page loads', async ({ page }) => {
    await page.goto('/partner/rooms');
    await expect(page).toHaveURL(/\/partner\/rooms/);
    await expect(page.locator('main, [class*="p-6"]').first()).toBeVisible({ timeout: 12_000 });
  });

  test('analytics page loads', async ({ page }) => {
    await page.goto('/partner/analytics');
    await expect(page).toHaveURL(/\/partner\/analytics/);
    await expect(page.locator('main, [class*="p-6"]').first()).toBeVisible({ timeout: 12_000 });
  });

  test('earnings page loads', async ({ page }) => {
    await page.goto('/partner/earnings');
    await expect(page).toHaveURL(/\/partner\/earnings/);
    await expect(page.locator('main, [class*="p-6"]').first()).toBeVisible({ timeout: 12_000 });
  });

});

test.describe('Partner — RBAC', () => {

  test('partner cannot access admin console (redirected to /)', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL('http://localhost:3000/', { timeout: 8_000 });
  });

  test('regular user cannot access partner (redirected to /login)', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH_STATE });
    const page = await ctx.newPage();
    await page.goto('/partner/dashboard');
    // Regular user (role=user) → admin layout redirects to /login
    await expect(page).toHaveURL(/\/(login)?$/, { timeout: 8_000 });
    await ctx.close();
  });

});
