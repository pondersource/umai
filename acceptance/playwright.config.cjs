const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: '.',
    timeout: 90_000,
    use: { launchOptions: {executablePath: process.env.CHROMIUM_PATH}, baseURL: process.env.ACCEPTANCE_URL || 'http://localhost:5001', trace: 'retain-on-failure' },
    webServer: [
        ...(!process.env.ACCEPTANCE_URL ? [{ command: process.env.ACCEPTANCE_BUILD === 'production'
            ? 'node acceptance/serve.cjs'
            : 'npm run dev -- --port 5001 --strictPort', cwd: '..', url: 'http://localhost:5001' }] : []),
        { command: 'node pod-server.cjs', url: 'http://localhost:4000' },
    ],
});
