// @ts-check
import { defineConfig, devices } from '@playwright/test';

const TEST_PORT = process.env.TEST_PORT || 5173;
const isCI = !!process.env.CI;

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: isCI,
    retries: isCI ? 1 : 0,
    workers: isCI ? 1 : undefined,
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        baseURL: `http://localhost:${TEST_PORT}`,
        trace: 'retain-on-failure',
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
        reuseExistingServer: !isCI,
    },
});
