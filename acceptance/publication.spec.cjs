const { test, expect } = require('@playwright/test');

test('published origin serves its client identity, assets and direct recipe route', async ({ page, request, baseURL }) => {
    test.skip(!process.env.ACCEPTANCE_URL, 'Requires the published Pages origin');
    const origin = new URL(baseURL).origin;
    const identity = await request.get('/clientid.jsonld');
    expect(identity.ok()).toBeTruthy();
    expect(await identity.json()).toMatchObject({
        client_id: origin + '/clientid.jsonld',
        client_uri: origin + '/',
        redirect_uris: [origin + '/'],
    });
    await page.goto('/recipes');
    await expect(page.getByText('Connect your Solid POD', { exact: true })).toBeVisible();
    await expect(page).toHaveURL(origin + '/recipes');
    const assets = await page.locator('script[src], link[rel=stylesheet]').evaluateAll(nodes => nodes.map(n => n.src || n.href));
    expect(assets.length).toBeGreaterThan(0);
    for (const asset of assets) {
        expect(new URL(asset).origin).toBe(origin);
        expect((await request.get(asset)).ok()).toBeTruthy();
    }
    const registrations = await page.evaluate(() => navigator.serviceWorker.getRegistrations().then(rs => rs.map(r => r.scope)));
    for (const scope of registrations) expect(scope).toBe(origin + '/');
});
