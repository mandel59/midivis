const { defineConfig } = require('@playwright/test')
module.exports = defineConfig({
    testDir: './tests/browser',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: process.env.CI ? 2 : undefined,
    use: {
        baseURL: 'http://127.0.0.1:4173',
        browserName: 'chromium',
        viewport: { width: 1600, height: 1000 },
        serviceWorkers: 'block',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    webServer: {
        command: 'node tests/serve.mjs',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: false,
    },
})
