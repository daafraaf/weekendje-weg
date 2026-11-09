import { defineConfig, devices } from '@playwright/test';

const port = 4173;
const mockPort = 8787;

export default defineConfig({
  testDir: 'test/e2e',
  reporter: 'line',
  use: { baseURL: `http://127.0.0.1:${port}` },
  webServer: [
    {
      command: 'node scripts/serve-dist.mjs',
      url: `http://127.0.0.1:${port}`,
      env: { PORT: String(port) },
      reuseExistingServer: false,
    },
    {
      command: 'node test/mock-backend/server.mjs',
      url: `http://127.0.0.1:${mockPort}/macros/s/demo/exec`,
      env: { MOCK_PORT: String(mockPort) },
      reuseExistingServer: false,
    },
  ],
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'] } },
    { name: 'chromium-mobiel', use: { ...devices['Pixel 5'] } },
    { name: 'webkit-mobiel', use: { ...devices['iPhone 13'] } },
  ],
});
