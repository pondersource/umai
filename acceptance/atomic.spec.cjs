const { readFileSync } = require('node:fs');
const { test, expect } = require('@playwright/test');

function run(source) {
    const core = 'https://atomicdata.dev/properties/';
    const table = 'https://example.test/recipes';
    const rowClass = table + '/recipe';
    const rows = new Map();
    let next = 0;
    function resource(subject) {
        const values = {...rows.get(subject)};
        return {
            subject,
            get: property => values[property],
            set: (property, value) => { values[property] = value; },
            save: async () => { rows.set(subject, values); },
            destroy: async () => { rows.delete(subject); },
        };
    }
    const store = {
        getData: async () => ({table, rowClass}),
        query: async ({property, value}) => [...rows].filter(([, row]) => row[property] === value).map(([key]) => key),
        getResource: async subject => resource(subject),
        getMany: async subjects => subjects.map(resource),
        newResource: async ({parent, isA, propVals}) => {
            rows.set(table + '/' + ++next, {...propVals, [core + 'parent']: parent, [core + 'isA']: isA});
        },
    };

    window.addEventListener('message', async ({data}) => {
        if (data === 'snapshot') {
            window.parent.postMessage([...rows], '*');
        } else if (Array.isArray(data)) {
            for (const [key, value] of data) rows.set(key, value);
            next = rows.size;
            const url = URL.createObjectURL(new Blob([source], {type: 'text/javascript'}));
            const {view} = await import(url);
            URL.revokeObjectURL(url);
            await view({root: document.getElementById('root'), store});
        }
    });
}

test('Umai stores and scales recipes in Atomic’s sandbox', async ({ page }) => {
    const source = readFileSync('../atomic/umai-0.1.0.js', 'utf8');
    const payload = JSON.stringify(source).replace(/</g, '\\u003c');
    const document = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-demo' blob:; style-src 'unsafe-inline'; font-src data:; img-src data:; connect-src 'none'">
<div id="root"></div><script type="module" nonce="demo">(${run})(${payload})</script>`;
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent('<iframe id="app" width="1000" height="640" sandbox="allow-scripts allow-modals"></iframe>');
    const iframe = page.locator('#app');
    const frame = page.frameLocator('#app');

    async function open(rows) {
        await iframe.evaluate((element, {document, rows}) => new Promise(resolve => {
            element.addEventListener('load', () => {
                element.contentWindow.postMessage(rows, '*');
                resolve();
            }, {once: true});
            element.srcdoc = document;
        }), {document, rows});
        await expect(frame.getByRole('heading', {name: 'Umai cookbook'})).toBeVisible();
    }

    await open([]);
    await frame.getByLabel('Name', {exact: true}).fill('Pancakes');
    await frame.getByLabel('Servings', {exact: true}).fill('2');
    await frame.getByLabel('Ingredients (one per line)').fill('1 1/2 cups flour\n2 eggs');
    await frame.getByLabel('Instructions (one step per line)').fill('Mix the batter.\nCook.');
    await frame.getByRole('button', {name: 'Add recipe'}).click();
    await expect(frame.getByRole('status')).toHaveText('Recipe saved.');
    const card = frame.locator('article');
    await expect(card.getByRole('heading', {name: 'Pancakes'})).toBeVisible();
    await card.getByLabel('Servings').fill('4');
    await expect(card.getByText('3 cups flour')).toBeVisible();
    await expect(card.getByText('4 eggs')).toBeVisible();
    const rows = await iframe.evaluate(element => new Promise(resolve => {
        window.addEventListener('message', event => resolve(event.data), {once: true});
        element.contentWindow.postMessage('snapshot', '*');
    }));
    expect(rows).toHaveLength(1);
    await open(rows);
    await expect(card.getByRole('heading', {name: 'Pancakes'})).toBeVisible();
    await expect(card.getByText('Cook.', {exact: true})).toBeVisible();
    expect(errors).toEqual([]);
});
