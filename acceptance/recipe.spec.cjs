const { test, expect } = require('@playwright/test');

const pod = 'http://localhost:4000/alice/';
const email = 'alice@example.com';
const password = 'storage-test-password';
const title = 'Playwright acceptance recipe';

async function connect(page) {
    if (process.env.ACCEPTANCE_URL) {
        // Allow this public test origin to reach the disposable localhost Pod.
        await page.context().grantPermissions(['local-network-access'], { origin: process.env.ACCEPTANCE_URL });
    }
    await page.goto('/');
    await page.locator('.rs-choose-solid').click();
    await page.locator('[name=rs-provider-address]').fill('http://localhost:4000');
    await page.locator('.rs-solid-connect').click();


    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await page.getByRole('button', { name: /authorize|consent/i }).click();
    await expect(page).toHaveURL(url => url.origin === new URL(process.env.ACCEPTANCE_URL || 'http://localhost:5001').origin);
}

test('persists a private recipe and syncs it into a fresh browser', async ({ page, browser, request, baseURL }) => {
    await connect(page);
    const registered = page.waitForResponse(response => response.ok() && response.request().method()==='PUT' && response.url().includes('privateTypeIndex') && (response.request().postData()||'').includes('TypeRegistration'));
    await page.getByRole('button', { name: 'Continue', exact: true }).click();

    await page.getByText(/^(New recipe|Create your first recipe)$/).first().click();
    const write = page.waitForResponse(response =>
        response.url().startsWith(pod + 'recipes/_rs/resources/') &&
        ['PUT', 'PATCH', 'POST'].includes(response.request().method()) &&
        response.ok() &&
        (response.request().postData() || '').includes(title),
    );
    await page.getByRole('button', { name: 'Upload JsonLD file', exact: true }).setInputFiles({
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
    await registered;
    const recipeUrl = new URL(saved.headers().location || saved.url(), saved.url()).href;
    expect(recipeUrl).not.toBe(pod + 'recipes/_rs/resources/');
    expect([401, 403, 404]).toContain((await request.get(recipeUrl)).status());

    if (await page.getByRole('button',{name:'not now',exact:true}).isVisible()) await page.getByRole('button',{name:'not now',exact:true}).click();
    await page.getByRole('button',{name:'Share',exact:true}).click();
    await page.getByRole('button',{name:'Create public link',exact:true}).click();
    await expect(page.getByRole('button',{name:'Remove public copy',exact:true})).toBeVisible();
    const documentUrl=JSON.parse(saved.request().postData()).url;
    const publicUrl=await page.evaluate(url=>window.ponderStorage.api.getPublicURL(url),documentUrl);
    expect(publicUrl).toMatch(/^http:/);
    const published=await request.get(publicUrl);
    expect(published.status()).toBe(200);
    expect(await published.text()).toContain(title);
    await page.getByRole('button',{name:'Remove public copy',exact:true}).click();
    await expect(page.getByRole('button',{name:'Create public link',exact:true})).toBeVisible();
    expect([401,403,404]).toContain((await request.get(publicUrl)).status());
    expect(await page.evaluate(async url=>(await window.ponderStorage.rs.solid.getSession().fetch(url)).status,publicUrl)).toBe(404);
    expect(await page.evaluate(async url=>(await window.ponderStorage.api.fetch(url)).status,documentUrl)).toBe(200);
    await page.keyboard.press('Escape');

    const fresh = await browser.newContext({ baseURL });
    try {
        const freshPage = await fresh.newPage();
        const read = freshPage.waitForResponse(response =>
            response.url() === recipeUrl && response.request().method() === 'GET' && response.ok(),
        );
        await connect(freshPage);
        const stored = await read;
        const { parseRecipes } = await import('../shared-data-modules/recipes/index.js');
        expect(parseRecipes((await stored.json()).resource.triples.join('\n'), stored.url())).toEqual(expect.arrayContaining([
            expect.objectContaining({
                recipe: expect.objectContaining({
                    title,
                    ingredients: ['1 cup flour'],
                    instructions: ['Mix the flour.'],
                }),
            }),
        ]));
        await freshPage.getByText(title, { exact: true }).first().click();
        await expect(freshPage.getByText('1 cup flour', { exact: false }).first()).toBeVisible();
        const recipeRoute = freshPage.url();
        await freshPage.reload();
        // rs.js restores its persisted session without another consent prompt.
        await expect(freshPage).toHaveURL(recipeRoute);
        await expect(freshPage.getByText('1 cup flour', { exact: false }).first()).toBeVisible();
        if (!await freshPage.locator('.rs-box-connected .rs-disconnect').isVisible()) await freshPage.locator('.rs-widget-icon').click();
        await freshPage.locator('.rs-box-connected .rs-disconnect').click();
        await expect(freshPage.getByText(title, {exact:true})).toHaveCount(0);
    } finally {
        await fresh.close();
    }
});
