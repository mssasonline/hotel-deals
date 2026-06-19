import { test, expect } from '@playwright/test';
import { AUTH_STATE } from '../../playwright.config';

test.use({ storageState: AUTH_STATE });

test('search → hotel → Book Now → booking page → confirm → success', async ({ page }) => {
  // Patch Date.prototype.getHours in the browser to always return 14 (2 PM).
  // isBookingOpen() only uses getHours() to decide whether the booking window is open
  // (restricted to 12 PM – 6 AM by pricingEngine.ts).  Patching only getHours() leaves
  // JWT timestamp comparisons (which use getTime() / valueOf()) untouched, so Supabase
  // auth session management continues to work correctly.
  // addInitScript() re-runs on every navigation, so the patch persists across pages.
  await page.addInitScript(() => {
    const _orig = Date.prototype.getHours;
    Date.prototype.getHours = function () {
      // Only intercept calls on "now" (within 60 s of real current time).
      // Expiry timestamps and other historical dates use the real hour.
      if (Math.abs(this.valueOf() - Date.now()) < 60_000) return 14;
      return _orig.call(this);
    };
  });

  // ── 1. Home page ──
  await page.goto('/');
  await expect(page).toHaveTitle(/SelectedRoom/i);

  // ── 2. Submit search form for Dubai ──
  await page.locator('input[name="city"]').fill('Dubai');
  await page.locator('button[type="submit"]').first().click();

  // ── 3. Search results ──
  await page.waitForURL(/\/search/, { timeout: 15_000 });

  // Click first "See Availability" button on a hotel card
  const firstCard = page.locator('button', { hasText: 'See Availability' }).first();
  await firstCard.waitFor({ timeout: 15_000 });
  await firstCard.click();

  // ── 4. Hotel detail page ──
  await page.waitForURL(/\/hotel\/\d+/, { timeout: 10_000 });
  await page.waitForLoadState('networkidle');

  // Click "Book Now" on first room card → opens LiveBookingModal
  const roomBookBtn = page.locator('button', { hasText: 'Book Now' }).first();
  await roomBookBtn.waitFor({ timeout: 10_000 });
  await roomBookBtn.click();

  // LiveBookingModal appears — wait for availability check to finish (button becomes enabled)
  const modalBookBtn = page.locator('[data-testid="modal-book-now"]:not([disabled])');
  await modalBookBtn.waitFor({ timeout: 20_000 });
  await modalBookBtn.click({ force: true });

  // ── 5. Booking page ──
  await page.waitForURL(/\/booking\/\d+/, { timeout: 15_000 });
  await expect(page.locator('h1', { hasText: /Complete Your Booking/i }).first()).toBeVisible();

  // ── 6. Guest details ──
  // Name and phone may be pre-filled from profile; ensure they have values
  const nameVal = await page.locator('#ud-fullName').inputValue();
  if (!nameVal.trim()) await page.fill('#ud-fullName', 'Test Guest');

  const phoneVal = await page.locator('#ud-phone').inputValue();
  if (!phoneVal.trim()) await page.fill('#ud-phone', '501234567');

  // Select country (custom dropdown — click trigger, search, pick first result)
  const countryTrigger = page.locator('button', { hasText: 'Select country' });
  if (await countryTrigger.isVisible()) {
    await countryTrigger.click();
    const searchInput = page.locator('input[placeholder="Select country"]');
    await searchInput.waitFor({ timeout: 3_000 });
    await searchInput.fill('United Arab');
    await page.locator('ul li').first().click();
  }

  // ── 7. Payment ──
  // If a saved card is already selected, skip card entry. Otherwise fill mock card.
  const savedCardSelected = await page.locator('input[type="radio"]:checked').first().isVisible().catch(() => false);
  if (!savedCardSelected) {
    await page.fill('#cardHolder', 'Test Guest');
    await page.fill('#cardNumber', '4111 1111 1111 1111');
    await page.fill('#expiry', '12/26');
    await page.fill('#cvv', '123');
  }

  // ── 8. Confirm booking ──
  const confirmBtn = page.locator('[data-testid="confirm-booking"]');
  await confirmBtn.waitFor({ timeout: 8_000 });
  await expect(confirmBtn).toBeEnabled();
  await confirmBtn.click();

  // ── 9. Success page ──
  await page.waitForURL(/\/booking\/success\//, { timeout: 20_000 });
  await expect(page.locator('body')).toContainText(/confirmed|success|booked/i);
});
