import { test as setup, expect } from '@playwright/test';
import { ADMIN_AUTH_STATE } from '../../playwright.config';

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#email', process.env.TEST_ADMIN_EMAIL!);
  await page.fill('#password', process.env.TEST_ADMIN_PASSWORD!);
  await page.click('button[type="submit"]');
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
  await page.context().storageState({ path: ADMIN_AUTH_STATE });
});
