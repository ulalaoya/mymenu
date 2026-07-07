import { defineConfig, devices } from '@playwright/test';

// E2E על viewport מובייל 390×844 לפי SPEC
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // ריצת יחיד-worker כברירת מחדל: השרת (build+preview) על פורט יחיד.
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'mobile',
      use: {
        // מנוע Chromium עם viewport מובייל 390×844 (לפי SPEC).
        // משתמשים ב-Chromium (ולא ב-WebKit של iPhone 12) לזמינות התקנה יציבה.
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: false,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
