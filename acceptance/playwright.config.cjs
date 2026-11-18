const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: '.',
    timeout: 90_000,
    use: { baseURL: process.env.ACCEPTANCE_URL || 'http://localhost:5001', trace: 'retain-on-failure' },
    webServer: [
        ...(!process.env.ACCEPTANCE_URL ? [{ command: process.env.ACCEPTANCE_BUILD === 'production'
            ? 'npm run serve -- --port 5001 --strictPort'
            : 'npm run dev -- --port 5001 --strictPort', cwd: '..', url: 'http://localhost:5001' }] : []),
        { command: 'npm run test:serve-pod', cwd: '..', url: 'http://localhost:4000' },
    ],
});
