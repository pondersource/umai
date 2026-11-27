const core = 'https://atomicdata.dev/properties/';
const prefix = 'umai-recipe/v1:';
const fields = [
  ['name', 'Name'], ['description', 'Description', true], ['recipeYield', 'Servings'],
  ['recipeIngredient', 'Ingredients (one per line)', true],
  ['recipeInstructions', 'Instructions (one step per line)', true]
];

function el(tag, text) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

function lines(text) {
  return text.split('\n').map(line => line.trim()).filter(Boolean);
}

function scaleIngredient(text, ratio) {
  return text.replace(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)(?=\s|$)/, quantity => {
    const value = quantity.split(/\s+/).reduce((sum, term) => {
      const [base, denominator] = term.split('/').map(Number);
      return sum + base / (denominator ?? 1);
    }, 0);
    if (!Number.isFinite(value)) return quantity;
    return String(Number((value * ratio).toFixed(2)));
  });
}

async function cookbook(store) {
  const {table, rowClass} = await store.getData();
  if (!table || !rowClass) throw new Error('Umai needs a recipe table.');

  function recipe(row) {
    if (row.error) throw new Error('Atomic could not read a recipe.');
    const data = row.get(core + 'description');
    if (row.get(core + 'parent') !== table || !row.get(core + 'isA')?.includes(rowClass) ||
        typeof data !== 'string' || !data.startsWith(prefix)) return;
    return {...JSON.parse(data.slice(prefix.length)), name: row.get(core + 'name'), subject: row.subject};
  }

  return {
    async list() {
      const all = await store.query({property: core + 'parent', value: table});
      if (all.length >= 500) throw new Error('This version supports fewer than 500 rows.');
      const result = [];
      for (let offset = 0; offset < all.length; offset += 100) {
        const rows = await store.getMany(all.slice(offset, offset + 100));
        result.push(...rows.map(recipe).filter(Boolean));
      }
      return result.sort((first, second) => first.name.localeCompare(second.name));
    },
    async save({subject, name, ...record}) {
      const props = {[core + 'name']: name, [core + 'description']: prefix + JSON.stringify(record)};
      if (!subject) {
        await store.newResource({parent: table, isA: [rowClass], propVals: props});
        return;
      }
      const row = await store.getResource(subject);
      if (!recipe(row)) throw new Error('That recipe is outside this cookbook.');
      for (const [property, value] of Object.entries(props)) row.set(property, value);
      await row.save();
    },
    async remove(subject) {
      const row = await store.getResource(subject);
      if (!recipe(row)) throw new Error('That recipe is outside this cookbook.');
      await row.destroy();
    }
  };
}

export async function view({root, store}) {
  const book = await cookbook(store);
  const style = el('style', `
    main { max-width: 60rem; margin: auto; padding: 1.25rem; font: 1rem system-ui; }
    fieldset { display: grid; gap: .6rem; }
    fieldset label, fieldset input, textarea { display: block; width: 100%; box-sizing: border-box; }
    textarea { min-height: 4rem; }
    input, textarea, button { font: inherit; padding: .35rem; }
    button { margin: .2rem .4rem .2rem 0; }
    article { border-top: 1px solid #8886; margin-block: 1rem; padding-block: .5rem; }
    article label { display: block; }
  `);
  const main = el('main');
  const editor = el('fieldset');
  editor.append(el('legend', 'Recipe'));
  const input = {};
  for (const [key, label, multiline] of fields) {
    input[key] = el(multiline ? 'textarea' : 'input');
    const wrapper = el('label', label);
    wrapper.append(input[key]);
    editor.append(wrapper);
  }
  const actions = el('div');
  const save = el('button', 'Add recipe');
  const cancel = el('button', 'Cancel edit');
  actions.append(save, cancel);
  editor.append(actions);
  const status = el('p');
  status.setAttribute('role', 'status');
  const filterLabel = el('label', 'Find a recipe');
  const filter = el('input');
  filter.type = 'search';
  filterLabel.append(filter);
  const results = el('section');
  main.append(el('h1', 'Umai cookbook'), editor, status, filterLabel, results);
  root.replaceChildren(style, main);

  let all = [];
  let selected;
  let busy = false;

  function edit(record) {
    selected = record;
    for (const [key] of fields) {
      const value = record?.[key];
      input[key].value = Array.isArray(value) ? value.join('\n') : value || '';
    }
    save.textContent = record ? 'Save recipe' : 'Add recipe';
    cancel.hidden = !record;
  }

  function render() {
    results.replaceChildren();
    const query = filter.value.trim().toLocaleLowerCase();
    for (const recipe of all) {
      if (![recipe.name, recipe.description, ...recipe.recipeIngredient].join(' ').toLocaleLowerCase().includes(query)) continue;
      const card = el('article');
      const ingredients = el('ul');
      const steps = el('ol');
      const base = Number(recipe.recipeYield.match(/^\d+/)?.[0]);
      const servingLabel = el('label', 'Servings');
      const servings = el('input');
      servings.type = 'number';
      servings.min = '1';
      servings.value = base || '';
      servingLabel.append(servings);
      const renderIngredients = () => {
        const quantity = servings.valueAsNumber;
        const ratio = base > 0 && quantity > 0 ? quantity / base : 1;
        ingredients.replaceChildren(...recipe.recipeIngredient.map(line => el('li', scaleIngredient(line, ratio))));
      };
      servings.addEventListener('input', renderIngredients);
      renderIngredients();
      steps.append(...recipe.recipeInstructions.map(step => el('li', step)));
      const change = el('button', 'Edit recipe');
      change.addEventListener('click', () => { if (!busy) edit(recipe); });
      const remove = el('button', 'Delete recipe');
      remove.addEventListener('click', () => {
        if (busy || !window.confirm('Delete ' + recipe.name + '?')) return;
        run(async () => {
          await book.remove(recipe.subject);
          if (selected?.subject === recipe.subject) edit();
        }, 'Recipe deleted.');
      });
      card.append(el('h2', recipe.name));
      if (recipe.description) card.append(el('p', recipe.description));
      if (base > 0) card.append(servingLabel);
      else if (recipe.recipeYield) card.append(el('p', recipe.recipeYield));
      card.append(el('h3', 'Ingredients'), ingredients, el('h3', 'Instructions'), steps, change, remove);
      results.append(card);
    }
    if (!results.children.length) results.append(el('p', 'No matching recipes.'));
  }

  async function run(operation, message) {
    if (busy) return;
    busy = editor.disabled = true;
    status.textContent = '';
    try {
      await operation();
      all = await book.list();
      render();
      status.textContent = message;
    } catch (error) {
      status.textContent = error.message;
    } finally {
      busy = editor.disabled = false;
    }
  }

  filter.addEventListener('input', render);
  cancel.addEventListener('click', () => edit());
  save.addEventListener('click', () => run(async () => {
    const name = input.name.value.trim();
    if (!name) throw new Error('Enter a recipe name.');
    await book.save({
      subject: selected?.subject,
      name,
      description: input.description.value.trim(),
      recipeYield: input.recipeYield.value.trim(),
      recipeIngredient: lines(input.recipeIngredient.value),
      recipeInstructions: lines(input.recipeInstructions.value)
    });
    edit();
  }, 'Recipe saved.'));
  edit();
  await run(async () => {}, '');
}
