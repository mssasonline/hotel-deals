import { test as setup, expect } from '@playwright/test';
import { PARTNER_AUTH_STATE } from '../../playwright.config';

setup('authenticate as partner', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#email', process.env.TEST_PARTNER_EMAIL!);
  await page.fill('#password', process.env.TEST_PARTNER_PASSWORD!);
  await page.click('button[type="submit"]');
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
  await page.context().storageState({ path: PARTNER_AUTH_STATE });
});
