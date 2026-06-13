import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const MAGIC_LINK = 'https://ojmysozhwaeqhgrcctph.supabase.co/auth/v1/verify?token=60724c2d0e3d40fa27232351f480b1b6b83d333e0505d1cc972826dc&type=magiclink&redirect_to=http://localhost:3000';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const consoleLogs = [];
page.on('console', msg => consoleLogs.push({ type: msg.type(), text: msg.text() }));

// Step 1: Visit magic link and wait for Supabase client to exchange the token
console.log('--- Step 1: Magic link auth ---');
await page.goto(MAGIC_LINK, { waitUntil: 'networkidle', timeout: 20000 });
// Give Supabase SSR enough time to exchange the hash token and set cookies
await page.waitForTimeout(5000);
console.log('URL after magic link wait:', page.url());

// Check cookies
const cookies = await context.cookies();
const authCookies = cookies.filter(c => c.name.includes('auth') || c.name.includes('sb-') || c.name.includes('supabase'));
console.log('Auth cookies set:', authCookies.map(c => `${c.name}=${c.value.slice(0, 20)}...`));
await page.screenshot({ path: 'verify-step1-after-magic.png' });

// Step 2: Navigate to partner analytics
console.log('--- Step 2: /partner/analytics ---');
const response = await page.goto(`${BASE}/partner/analytics`, { waitUntil: 'networkidle', timeout: 25000 });
await page.waitForTimeout(3000);
console.log('URL:', page.url());
console.log('Status:', response?.status());
await page.screenshot({ path: 'verify-step2-analytics.png' });

const bodyText = await page.locator('body').innerText();
console.log('Body excerpt (first 400):', bodyText.slice(0, 400));

// Step 3: Check for Average Rating
const hasAvgRating = bodyText.includes('Average Rating');
console.log('Has "Average Rating":', hasAvgRating);

if (hasAvgRating) {
  // Find the KPI card
  const cards = page.locator('div').filter({ hasText: /^Average Rating/ });
  const count = await cards.count();

  // Look for the KPI card structure
  const kpiCards = page.locator('.rounded-2xl');
  const kpiCount = await kpiCards.count();
  console.log('Rounded-2xl elements:', kpiCount);

  for (let i = 0; i < kpiCount; i++) {
    const text = await kpiCards.nth(i).innerText().catch(() => '');
    if (text.includes('Average Rating') && text.length < 500) {
      console.log('Average Rating KPI card text:', JSON.stringify(text));
    }
  }
}

// Step 4: Console errors
const errors = consoleLogs.filter(l => l.type === 'error');
console.log('Console errors (first 3):', JSON.stringify(errors.slice(0, 3), null, 2));

await browser.close();
console.log('Done');
