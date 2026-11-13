const { test, expect } = require('@playwright/test');

const pod = 'http://localhost:4000/alice/';
const email = 'alice@example.com';
const password = 'umai-ci-password';
const title = 'Playwright acceptance recipe';

async function connect(page, register = false) {
    await page.goto('/');
    await page.getByText('Connect your Solid POD', { exact: true }).click();
    const login = page.getByLabel('Login url');
    await login.fill(pod);
    await login.press('Enter');

    if (register) {
        await page.getByText('Sign up', { exact: true }).click();
        await page.locator('#email').fill(email);
        await page.locator('#password').fill(password);
        await page.locator('#confirmPassword').fill(password);
        await page.locator('#podName').fill('alice');
        await page.getByRole('button', { name: 'Sign up', exact: true }).click();
        await page.getByRole('link', { name: 'log in', exact: true }).click();
    }

    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await page.getByRole('button', { name: /authorize|consent/i }).click();
    await expect(page).toHaveURL(/^http:\/\/localhost:5001\//);
}

test('persists a private recipe and syncs it into a fresh browser', async ({ page, browser, request, baseURL }) => {
    await connect(page, true);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();

    await page.getByText(/^(New recipe|Create your first recipe)$/).first().click();
    const write = page.waitForResponse(response =>
        response.url().startsWith(pod + 'cookbook/') &&
        ['PUT', 'PATCH', 'POST'].includes(response.request().method()) &&
        response.ok() &&
        (response.request().postData() || '').includes(title),
    );
    await page.locator('input[type=file][accept*="json"]').setInputFiles({
        name: 'recipe.jsonld',
        mimeType: 'application/ld+json',
        buffer: Buffer.from(JSON.stringify({
            '@context': { '@vocab': 'https://schema.org/' },
            '@type': 'Recipe',
            name: title,
            recipeIngredient: ['1 cup flour'],
            recipeInstructions: [{ '@type': 'HowToStep', text: 'Mix the flour.', position: 1 }],
        })),
    });
    await expect(page.getByText(title, { exact: true }).first()).toBeVisible({ timeout: 15_000 });
    const saved = await write;
    const recipeUrl = new URL(saved.headers().location || saved.url(), saved.url()).href;
    expect(recipeUrl).not.toBe(pod + 'cookbook/');
    expect([401, 403, 404]).toContain((await request.get(recipeUrl)).status());

    const fresh = await browser.newContext({ baseURL });
    try {
        const freshPage = await fresh.newPage();
        const read = freshPage.waitForResponse(response =>
            response.url() === recipeUrl && response.request().method() === 'GET' && response.ok(),
        );
        await connect(freshPage);
        const stored = await read;
        expect(await stored.text()).toContain(title);
        await freshPage.getByText(title, { exact: true }).first().click();
        await expect(freshPage.getByText('1 cup flour', { exact: false }).first()).toBeVisible();
    } finally {
        await fresh.close();
    }
});
