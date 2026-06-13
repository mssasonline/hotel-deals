import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const consoleLogs = [];
const networkErrors = [];

page.on('console', msg => consoleLogs.push({ type: msg.type(), text: msg.text() }));
page.on('requestfailed', req => networkErrors.push({ url: req.url(), failure: req.failure()?.errorText }));

// Step 1: Navigate to login page
console.log('--- Step 1: Opening login page ---');
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
await page.screenshot({ path: 'verify-step1-login.png' });

// Step 2: Fill login form
console.log('--- Step 2: Logging in ---');
const emailInput = page.locator('input[type="email"]');
const passInput  = page.locator('input[type="password"]');
await emailInput.fill('mssas.online@gmail.com');
await passInput.fill('Admin123!'); // common test password — will fail gracefully

const submitBtn = page.locator('button[type="submit"]').first();
await submitBtn.click();

try {
  await page.waitForURL(url => !url.includes('/login'), { timeout: 8000 });
  console.log('Login redirected to:', page.url());
} catch {
  console.log('Login did not redirect. Current URL:', page.url());
  // check for error text
  const body = await page.locator('body').innerText();
  console.log('Page body (first 500):', body.slice(0, 500));
}

await page.screenshot({ path: 'verify-step2-after-login.png' });

// Step 3: Navigate to partner analytics
console.log('--- Step 3: Navigating to /partner/analytics ---');
await page.goto(`${BASE}/partner/analytics`, { waitUntil: 'networkidle', timeout: 20000 });
await page.screenshot({ path: 'verify-step3-analytics.png' });
console.log('Current URL:', page.url());

const bodyText = await page.locator('body').innerText();
console.log('Page body (first 800):', bodyText.slice(0, 800));

// Step 4: Look for Average Rating KPI card
console.log('--- Step 4: Looking for Average Rating KPI card ---');
const allText = await page.locator('body').innerText();
const hasAvgRating = allText.includes('Average Rating');
console.log('Has "Average Rating" text:', hasAvgRating);

// Find the KPI value near "Average Rating"
const kpiCards = page.locator('.bg-white.rounded-2xl');
const count = await kpiCards.count();
console.log('KPI card count:', count);

for (let i = 0; i < count; i++) {
  const text = await kpiCards.nth(i).innerText().catch(() => '');
  if (text.includes('Average Rating')) {
    console.log('Average Rating card content:', text);
  }
}

// Step 5: Check console errors
console.log('--- Step 5: Console logs ---');
const errors = consoleLogs.filter(l => l.type === 'error');
const warnings = consoleLogs.filter(l => l.type === 'warning' && l.text.toLowerCase().includes('review'));
console.log('Console errors:', JSON.stringify(errors, null, 2));
console.log('Review-related warnings:', JSON.stringify(warnings, null, 2));
console.log('Network errors:', JSON.stringify(networkErrors, null, 2));

await browser.close();
