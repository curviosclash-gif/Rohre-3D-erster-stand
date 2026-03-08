// @ts-check
import { defineConfig, devices } from '@playwright/test';

const TEST_PORT = process.env.TEST_PORT || 5173;

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: 1,
    workers: process.env.CI ? 1 : 2,
    reporter: 'html',
    use: {
        baseURL: `http://localhost:${TEST_PORT}`,
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: `npx vite --port ${TEST_PORT}`,
        url: `http://localhost:${TEST_PORT}`,
        reuseExistingServer: !process.env.CI,
    },
});
