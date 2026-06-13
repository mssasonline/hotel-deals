import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const MAGIC_LINK = 'https://ojmysozhwaeqhgrcctph.supabase.co/auth/v1/verify?token=2de6a3376ecd79e30dc947fb8a71a6ceabb2e32cb4d30bfeced0fc06&type=magiclink&redirect_to=http://localhost:3000';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const consoleLogs = [];
const networkReqs = [];
page.on('console', msg => consoleLogs.push({ type: msg.type(), text: msg.text() }));
page.on('response', res => {
  if (res.url().includes('supabase') || res.url().includes('partner')) {
    networkReqs.push({ url: res.url(), status: res.status() });
  }
});

// Step 1: Visit magic link — Supabase returns a hash-based token
console.log('--- Step 1: magic link ---');
await page.goto(MAGIC_LINK, { waitUntil: 'domcontentloaded', timeout: 20000 });

// Wait for Supabase JS to exchange the hash token and set cookies
await page.waitForFunction(() => {
  // Wait until the hash is gone (exchanged) or a redirect happens
  return !window.location.hash.includes('access_token') || document.cookie.includes('sb-');
}, { timeout: 10000 }).catch(() => {});

await page.waitForTimeout(3000); // extra grace period for cookie setting
console.log('URL after magic link:', page.url());

const cookies = await context.cookies();
const authCookies = cookies.filter(c => c.name.includes('sb-') || c.name.includes('supabase') || c.name.includes('auth'));
console.log('Auth cookies:', authCookies.map(c => c.name));
await page.screenshot({ path: 'verify-step1-magic.png' });

if (authCookies.length === 0) {
  // Check URL hash for token and manually extract/inject
  const url = page.url();
  console.log('No auth cookies. Current URL:', url);

  // Try getting token from page's localStorage or check hash
  const hash = await page.evaluate(() => window.location.hash);
  console.log('Hash:', hash.slice(0, 100));
}

// Step 2: Navigate to analytics
console.log('--- Step 2: /partner/analytics ---');
await page.goto(`${BASE}/partner/analytics`, { waitUntil: 'networkidle', timeout: 25000 });
await page.waitForTimeout(2000);
console.log('URL:', page.url());
await page.screenshot({ path: 'verify-step2-analytics.png' });

if (page.url().includes('/login')) {
  console.log('Still on login — session not set. Trying another approach...');

  // Navigate back to magic link page and wait longer before going to analytics
  const res2 = await fetch(MAGIC_LINK, { redirect: 'follow' });
  console.log('Direct fetch status:', res2.status, res2.url);
  await browser.close();
  process.exit(1);
}

const bodyText = await page.locator('body').innerText();
console.log('Has "Average Rating":', bodyText.includes('Average Rating'));

// Find all KPI cards
const kpiCards = page.locator('.rounded-2xl.border');
const count = await kpiCards.count();
console.log('KPI card count:', count);

for (let i = 0; i < count; i++) {
  const text = await kpiCards.nth(i).innerText().catch(() => '');
  if (text.includes('Average Rating') && text.length < 300) {
    console.log('=== Average Rating KPI ===');
    console.log(JSON.stringify(text));
  }
}

// Console errors
const errors = consoleLogs.filter(l => l.type === 'error');
console.log('Console errors:', JSON.stringify(errors.slice(0, 5), null, 2));

await browser.close();
console.log('Done');
