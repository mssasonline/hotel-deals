import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.test.local') });

export const AUTH_STATE         = path.join(__dirname, 'tests/.auth/user.json');
export const ADMIN_AUTH_STATE   = path.join(__dirname, 'tests/.auth/admin.json');
export const PARTNER_AUTH_STATE = path.join(__dirname, 'tests/.auth/partner.json');

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 1,
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // ── Setup (login once per role) ──────────────────────────────────────────
    { name: 'setup:user',    testMatch: '**/auth.setup.ts' },
    { name: 'setup:admin',   testMatch: '**/auth.setup.admin.ts' },
    { name: 'setup:partner', testMatch: '**/auth.setup.partner.ts' },

    // ── Test suites ──────────────────────────────────────────────────────────
    {
      name: 'user',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/booking.spec.ts',
      dependencies: ['setup:user'],
    },
    {
      name: 'admin',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/admin.spec.ts',
      dependencies: ['setup:admin'],
    },
    {
      name: 'partner',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/partner.spec.ts',
      dependencies: ['setup:partner'],
    },
    {
      name: 'rbac',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/auth.spec.ts',
      dependencies: ['setup:user'],
    },
  ],
});
