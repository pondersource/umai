const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: '.',
    timeout: 90_000,
    use: { baseURL: 'http://localhost:5001', trace: 'retain-on-failure' },
    webServer: [
        { command: 'npm run dev -- --port 5001 --strictPort', cwd: '..', url: 'http://localhost:5001' },
        { command: 'npm run test:serve-pod', cwd: '..', url: 'http://localhost:4000' },
    ],
});
