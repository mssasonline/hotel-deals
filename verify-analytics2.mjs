import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const MAGIC_LINK = 'https://ojmysozhwaeqhgrcctph.supabase.co/auth/v1/verify?token=60724c2d0e3d40fa27232351f480b1b6b83d333e0505d1cc972826dc&type=magiclink&redirect_to=http://localhost:3000';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const consoleLogs = [];
page.on('console', msg => consoleLogs.push({ type: msg.type(), text: msg.text() }));

// Step 1: Use magic link to authenticate
console.log('--- Step 1: Using magic link to authenticate ---');
await page.goto(MAGIC_LINK, { waitUntil: 'networkidle', timeout: 20000 });
await page.waitForTimeout(2000);
console.log('URL after magic link:', page.url());
await page.screenshot({ path: 'verify-step1-magic-auth.png' });

// Step 2: Navigate to partner analytics
console.log('--- Step 2: Navigate to /partner/analytics ---');
await page.goto(`${BASE}/partner/analytics`, { waitUntil: 'networkidle', timeout: 20000 });
await page.waitForTimeout(2000);
console.log('URL after nav:', page.url());
await page.screenshot({ path: 'verify-step2-analytics.png' });

const bodyText = await page.locator('body').innerText();
console.log('Page body (first 1000):', bodyText.slice(0, 1000));

// Step 3: Look for Average Rating KPI card
console.log('--- Step 3: Look for Average Rating KPI card ---');
const hasAvgRating = bodyText.includes('Average Rating');
console.log('Has "Average Rating":', hasAvgRating);

// Find cards with Average Rating
const cards = page.locator('div').filter({ hasText: 'Average Rating' });
const cardCount = await cards.count();
console.log('Matching elements:', cardCount);

for (let i = 0; i < Math.min(cardCount, 5); i++) {
  const text = await cards.nth(i).innerText().catch(() => '');
  if (text.length < 300) {
    console.log(`Card ${i}:`, JSON.stringify(text));
  }
}

// Step 4: Check spinner / loading state
const spinner = page.locator('.animate-spin');
const spinnerCount = await spinner.count();
console.log('Spinner visible:', spinnerCount > 0);

// Step 5: Check KPI cards grid
const kpiGrid = page.locator('.grid.grid-cols-2');
const gridCount = await kpiGrid.count();
console.log('KPI grid count:', gridCount);

// Step 6: Console errors related to reviews
console.log('--- Step 6: Console errors ---');
const errors = consoleLogs.filter(l => l.type === 'error');
console.log('Console errors:', JSON.stringify(errors.slice(0, 5), null, 2));

// Step 7: Check with loading wait
if (spinnerCount > 0 || !hasAvgRating) {
  console.log('--- Waiting for data to load ---');
  try {
    await page.waitForSelector('text=Average Rating', { timeout: 15000 });
    console.log('Average Rating appeared after wait!');
    await page.screenshot({ path: 'verify-step7-after-load.png' });

    // Re-check the card
    const avgCards = page.locator('div').filter({ hasText: 'Average Rating' });
    const cnt = await avgCards.count();
    for (let i = 0; i < Math.min(cnt, 3); i++) {
      const t = await avgCards.nth(i).innerText().catch(() => '');
      if (t.length < 300) console.log(`Post-load card ${i}:`, JSON.stringify(t));
    }
  } catch (e) {
    console.log('Average Rating never appeared:', e.message);
    const finalBody = await page.locator('body').innerText();
    console.log('Final body:', finalBody.slice(0, 800));
    await page.screenshot({ path: 'verify-step7-timeout.png' });
  }
}

await browser.close();
console.log('Done');
