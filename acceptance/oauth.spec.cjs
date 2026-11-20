const { test, expect } = require('@playwright/test');
for (const [button, host] of [['Dropbox', 'www.dropbox.com'], ['Google Drive', 'accounts.google.com']]) {
    test(button + ' uses the home callback when login starts from a nested route', async ({ page, baseURL }) => {
        await page.route('https://' + host + '/**', route => route.fulfill({ body: 'Authorization boundary' }));
        await page.goto('/');
        await page.evaluate(() => history.replaceState(history.state, '', '/collection#test'));
        const authorization = page.waitForRequest(request => new URL(request.url()).hostname === host);
        await page.getByRole('button', { name: button, exact: true }).click();
        const url = new URL((await authorization).url());
        expect(url.searchParams.get('redirect_uri')).toBe(new URL(baseURL).origin);
    });
}
