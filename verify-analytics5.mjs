import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const BASE = 'http://localhost:3000';
const PROJECT_REF = 'ojmysozhwaeqhgrcctph';

// Read env
const env = readFileSync('C:\\Users\\Administrator\\hotel-deals\\.env.local', 'utf-8');
const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
const SERVICE_KEY = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+(?:\n.+)*?)(?:\n#|\n\n|$)/)?.[1]?.replace(/\s/g, '');

// Step A: Generate a fresh magic link via admin API
console.log('--- Generating fresh magic link ---');
const linkRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
  method: 'POST',
  headers: {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ type: 'magiclink', email: 'manager@CoveRotana.com' }),
});
const linkData = await linkRes.json();
const MAGIC_LINK = linkData.action_link;
console.log('Magic link generated (token only):', MAGIC_LINK?.split('token=')[1]?.slice(0, 20) + '...');

if (!MAGIC_LINK) {
  console.error('Failed to generate magic link:', JSON.stringify(linkData));
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const consoleLogs = [];
page.on('console', msg => {
  consoleLogs.push({ type: msg.type(), text: msg.text() });
  if (msg.type() === 'error') console.log('[browser error]', msg.text().slice(0, 200));
});

// Step 1: Visit the magic link — Supabase redirects to localhost with hash token
console.log('--- Step 1: Visiting magic link ---');
await page.goto(MAGIC_LINK, { timeout: 20000 });
console.log('After redirect, URL:', page.url().slice(0, 100));

// Wait for the Supabase client to detect the hash and set cookies
// The client calls supabase.auth.getSession() on init which handles the hash
console.log('Waiting 12s for Supabase to process hash token...');
await page.waitForTimeout(12000);

const cookiesBefore = await context.cookies('http://localhost:3000');
console.log('Cookies after wait:', cookiesBefore.map(c => `${c.name}=${c.value.slice(0, 30)}...`));

// Check if there's a hash with access_token still
const hash = await page.evaluate(() => window.location.hash).catch(() => '');
console.log('Hash still present:', hash.slice(0, 80));

// Try checking storage
const storage = await page.evaluate(() => {
  const items = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.includes('supabase') || key.includes('sb-')) {
      items[key] = localStorage.getItem(key)?.slice(0, 80);
    }
  }
  return items;
}).catch(() => ({}));
console.log('LocalStorage supabase items:', JSON.stringify(storage));

await page.screenshot({ path: 'verify-step1-magic.png' });

// Step 2: Navigate to partner analytics page
console.log('--- Step 2: Navigate to /partner/analytics ---');
await page.goto(`${BASE}/partner/analytics`, { waitUntil: 'networkidle', timeout: 25000 });
await page.waitForTimeout(2000);
console.log('URL:', page.url());

if (page.url().includes('/login')) {
  console.log('=== AUTH FAILED: Redirected to login ===');

  // Try alternative: set the session directly via the Supabase client on the page
  // First navigate back home and inject the session
  console.log('Trying to inject session via page.evaluate on home...');
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });

  // Manually parse the access token and refresh token from the magic link hash
  const accessToken = linkData.action_link?.match(/access_token=([^&]+)/)?.[1] ?? '';
  const refreshToken = linkData.refresh_token ?? '';
  console.log('Access token prefix:', accessToken.slice(0, 30));

  // Inject session via the global Supabase client
  const injectResult = await page.evaluate(async ({ at, rt }) => {
    // Try to find the supabase client
    const supabase = window.__supabase_client__;
    if (supabase) {
      const res = await supabase.auth.setSession({ access_token: at, refresh_token: rt });
      return { found: true, error: res.error?.message };
    }
    return { found: false };
  }, { at: accessToken, rt: refreshToken }).catch(e => ({ error: e.message }));
  console.log('Inject result:', JSON.stringify(injectResult));

  await browser.close();
  process.exit(1);
}

// Step 3: Check for Average Rating KPI
await page.screenshot({ path: 'verify-step2-analytics.png' });
const bodyText = await page.locator('body').innerText();
console.log('Page body excerpt:', bodyText.slice(0, 400));

const hasAvgRating = bodyText.includes('Average Rating');
console.log('Has "Average Rating":', hasAvgRating);

if (hasAvgRating) {
  const kpiCards = page.locator('.rounded-2xl.border');
  const count = await kpiCards.count();
  for (let i = 0; i < count; i++) {
    const text = await kpiCards.nth(i).innerText().catch(() => '');
    if (text.includes('Average Rating') && text.length < 300) {
      console.log('=== Average Rating KPI card ===');
      console.log(JSON.stringify(text));
    }
  }
}

const errors = consoleLogs.filter(l => l.type === 'error');
console.log('Console errors:', JSON.stringify(errors.slice(0, 3), null, 2));

await browser.close();
console.log('Done');
