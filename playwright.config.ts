import { defineConfig, devices } from '@playwright/test'

// Set E2E_BASE_URL to run against an already-running server (e.g. the deployed
// site) and skip starting a local dev server. Defaults to a local dev server.
const externalBaseURL = process.env.E2E_BASE_URL

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'line',
  timeout: 60000,
  use: {
    baseURL: externalBaseURL || 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Only manage a local dev server when not targeting an external URL.
  webServer: externalBaseURL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3001',
        reuseExistingServer: !process.env.CI,
        timeout: 180000,
      },
})
