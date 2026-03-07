import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PW_BASE_URL;
const webServerCommand = process.env.PW_WEB_SERVER_COMMAND;

if (!baseURL || !webServerCommand) {
    throw new Error('PW_BASE_URL and PW_WEB_SERVER_COMMAND must be set.');
}

export default defineConfig({
    testDir: '.',
    fullyParallel: false,
    workers: 1,
    reporter: 'line',
    use: {
        baseURL,
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: webServerCommand,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120000,
    },
});
