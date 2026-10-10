import { expect, test, type Page } from '@playwright/test';

async function ready(page: Page) {
	await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
	await expect(page.locator('html')).not.toHaveAttribute('data-initial-view', 'pending');
	await expect(page.locator('#initial-view-loading')).toBeHidden();
}

test('query content stays hidden until the requested state has initialized', async ({ page }) => {
	await page.route('**/_app/**/*.js', (route) => route.abort());
	await page.goto('/trends/?property=density&view=table&period=7', {
		waitUntil: 'domcontentloaded'
	});
	await expect(page.locator('html')).toHaveAttribute('data-initial-view', 'pending');
	await expect(page.locator('main')).toBeHidden();
	await expect(
		page.getByRole('status', { name: '' }).filter({ hasText: 'Loading your view' })
	).toBeVisible();

	await page.unroute('**/_app/**/*.js');
	await page.reload();
	await ready(page);
	await expect(page.getByRole('heading', { name: 'Density', exact: true })).toBeVisible();
	await expect(page.getByLabel('Show', { exact: true })).toHaveValue('7');
	await expect(page.getByRole('button', { name: 'Data', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await ready(page);
});

test('explore restores every URL control and mounts one table and preview', async ({ page }) => {
	await page.goto('/?element=118&display=phase&temperature=6000&family=noble-gas');
	await ready(page);
	await expect(page.getByLabel('Color by')).toHaveValue('phase');
	await expect(page.getByLabel('Temperature in kelvin')).toHaveValue('6000');
	await expect(page.getByRole('heading', { name: 'Oganesson', exact: true })).toHaveCount(1);
	await expect(page.getByRole('heading', { name: 'Oganesson', exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Noble gases', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await expect(page.locator('button[data-element]')).toHaveCount(118);
	await expect(page.locator('button[data-element="118"]')).toHaveAttribute('aria-pressed', 'true');
	await ready(page);
});

test('consecutive explore updates retain the previous shallow URL state', async ({ page }) => {
	await page.goto('/');
	await ready(page);
	await page.evaluate(() => Reflect.set(window, 'periodicityNavigationMarker', 'ready'));
	await page.locator('button[data-element="1"]').click();
	await expect(page).toHaveURL(/element=1(?:&|$)/);
	await page.locator('button[data-element="2"]').click();
	await expect(page).toHaveURL(/element=2(?:&|$)/);
	await page.getByLabel('Color by').selectOption('phase');
	await expect(page).toHaveURL(/display=phase/);
	await page.getByLabel('Temperature in kelvin').fill('600');
	await expect(page).toHaveURL(/temperature=600(?:&|$)/);
	await page.getByRole('button', { name: 'Noble gases', exact: true }).click();
	await expect(page).toHaveURL(/family=noble-gas/);
	const parameters = new URL(page.url()).searchParams;
	expect(parameters.get('element')).toBe('2');
	expect(parameters.get('display')).toBe('phase');
	expect(parameters.get('temperature')).toBe('600');
	await expect(page.getByRole('heading', { name: 'Helium', exact: true })).toBeVisible();
	expect(await page.evaluate(() => Reflect.get(window, 'periodicityNavigationMarker'))).toBe(
		'ready'
	);
});

test('consecutive trends changes preserve property, period, and visualization state', async ({
	page
}) => {
	await page.goto('/trends/');
	await ready(page);
	await page.evaluate(() => Reflect.set(window, 'periodicityNavigationMarker', 'ready'));
	await page.getByRole('button', { name: /^Density/ }).click();
	await expect(page).toHaveURL(/property=density/);
	await page.getByLabel('Show', { exact: true }).selectOption('3');
	await expect(page).toHaveURL(/period=3/);
	await page.getByRole('button', { name: 'Data', exact: true }).click();
	await expect(page).toHaveURL(/view=table/);
	await page.getByRole('searchbox', { name: 'Find an element' }).fill('aluminium');
	await expect(page.locator('tbody tr')).toHaveCount(1);
	await page.getByRole('button', { name: 'Chart', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Chart', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	const parameters = new URL(page.url()).searchParams;
	expect(parameters.get('property')).toBe('density');
	expect(parameters.get('period')).toBe('3');
	expect(parameters.has('view')).toBe(false);
	await expect(page.getByLabel('Show', { exact: true })).toHaveValue('3');
	expect(await page.evaluate(() => Reflect.get(window, 'periodicityNavigationMarker'))).toBe(
		'ready'
	);
});

test('comparison normalizes the URL selection, enforces four, and restores remove focus', async ({
	page
}) => {
	await page.goto('/compare/?elements=6,6,14,32,50,1,999');
	await ready(page);
	await expect(page.getByRole('button', { name: /Remove .+ from comparison/ })).toHaveCount(4);
	const hydrogen = page.locator('button[data-element="1"]');
	await expect(hydrogen).toHaveAttribute('aria-disabled', 'true');
	await hydrogen.focus();
	await page.keyboard.press('Enter');
	await expect(page.getByRole('button', { name: /Remove .+ from comparison/ })).toHaveCount(4);
	await expect(
		page.getByRole('button', { name: 'Remove Hydrogen from comparison', exact: true })
	).toHaveCount(0);
	await page.getByRole('button', { name: 'Remove Carbon from comparison', exact: true }).click();
	await expect(page.locator('button[data-element="6"]')).toBeFocused();
	await expect(hydrogen).toHaveAttribute('aria-disabled', 'false');
	await hydrogen.click();
	await expect(
		page.getByRole('button', { name: 'Remove Hydrogen from comparison', exact: true })
	).toBeVisible();
	expect(new URL(page.url()).searchParams.get('elements')?.split(',')).toEqual([
		'14',
		'32',
		'50',
		'1'
	]);
	await page.getByRole('button', { name: 'Clear all', exact: true }).click();
	await expect(page.getByRole('button', { name: /Remove .+ from comparison/ })).toHaveCount(0);
	await expect(hydrogen).toBeFocused();
	expect(new URL(page.url()).searchParams.get('elements')).toBe('');
	await ready(page);
});

test('calculator restores a hydrate URL and continues calculating without a reload', async ({
	page
}) => {
	await page.goto('/calculator/?formula=CuSO4%C2%B75H2O');
	await ready(page);
	await expect(page.getByLabel('Chemical formula', { exact: true })).toHaveValue('CuSO4·5H2O');
	await expect(page.locator('[aria-label="Formula CuSO4·5H2O"]')).toBeVisible();
	await expect(page.getByText('21 atoms in the formula', { exact: true })).toBeVisible();
	await ready(page);
	await page.evaluate(() => Reflect.set(window, 'periodicityNavigationMarker', 'ready'));
	await page.getByLabel('Chemical formula', { exact: true }).fill('NaCl');
	await page.getByRole('button', { name: 'Calculate', exact: true }).click();
	await expect(page.locator('[aria-label="Formula NaCl"]')).toBeVisible();
	expect(new URL(page.url()).searchParams.get('formula')).toBe('NaCl');
	await page.getByLabel('Chemical formula', { exact: true }).fill('Ca(OH)2');
	await page.getByRole('button', { name: 'Calculate', exact: true }).click();
	await expect(page.locator('[aria-label="Formula Ca(OH)2"]')).toBeVisible();
	expect(new URL(page.url()).searchParams.get('formula')).toBe('Ca(OH)2');
	expect(await page.evaluate(() => Reflect.get(window, 'periodicityNavigationMarker'))).toBe(
		'ready'
	);
});

test('an explicitly empty calculator URL remains empty and explains the error', async ({
	page
}) => {
	await page.goto('/calculator/?formula=');
	await ready(page);
	await expect(page.getByLabel('Chemical formula', { exact: true })).toHaveValue('');
	await expect(page.getByRole('alert')).toBeVisible();
	await expect(
		page.getByRole('heading', { name: 'Check your formula', exact: true })
	).toBeVisible();
	await ready(page);
});

test('element view restores its URL mode across consecutive view changes and neighbor navigation', async ({
	page
}) => {
	await page.goto('/element/118/?configuration=shell#electronic-heading');
	await ready(page);
	await expect(page.getByRole('heading', { name: 'Oganesson', exact: true })).toBeVisible();
	const views = page.getByRole('group', { name: 'Electron configuration view' });
	await expect(views.getByRole('button', { name: 'By shell', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await ready(page);
	await views.getByRole('button', { name: 'Short', exact: true }).click();
	await expect(page).toHaveURL(/configuration=short/);
	await views.getByRole('button', { name: 'Full', exact: true }).click();
	await expect(page).toHaveURL(/configuration=full/);
	await views.getByRole('button', { name: 'By shell', exact: true }).click();
	await expect(page).toHaveURL(/configuration=shell/);
	await page.locator('a[href="/element/117/?configuration=shell"]').click();
	await expect(page.getByRole('heading', { name: 'Tennessine', exact: true })).toBeVisible();
	await expect(views.getByRole('button', { name: 'By shell', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
});

test('the electron dialog traps focus and Escape returns it to its trigger', async ({ page }) => {
	await page.goto('/?element=6');
	await ready(page);
	const trigger = page.getByRole('button', { name: 'Full configuration', exact: true });
	await trigger.click();
	const dialog = page.getByRole('dialog', { name: 'C · Carbon' });
	await expect(dialog).toBeVisible();
	const last = dialog.getByRole('link', { name: 'Open element page' });
	await last.focus();
	await page.keyboard.press('Tab');
	await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
	await page.keyboard.press('Shift+Tab');
	await expect(last).toBeFocused();
	await page.keyboard.press('Escape');
	await expect(dialog).toHaveCount(0);
	await expect(trigger).toBeFocused();
});

test('quick mass uses one panel and Escape restores the element trigger', async ({ page }) => {
	await page.goto('/');
	await ready(page);
	const carbon = page.locator('button[data-element="6"]');
	await carbon.focus();
	await page.keyboard.press('Shift+Enter');
	const calculation = page.getByRole('region', { name: 'Quick molar mass calculation' });
	await expect(calculation).toHaveCount(1);
	await expect(calculation).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(calculation).toHaveCount(0);
	await expect(carbon).toBeFocused();
});

test('mobile grid uses the same 118 tiles and supports visual arrow navigation', async ({
	page
}) => {
	await page.setViewportSize({ width: 375, height: 812 });
	await page.goto('/');
	await ready(page);
	await expect(page.locator('button[data-element]')).toHaveCount(118);
	const hydrogen = page.locator('button[data-element="1"]');
	await hydrogen.focus();
	await page.keyboard.press('ArrowRight');
	await expect(page.locator('button[data-element="2"]')).toBeFocused();
	const columns = await hydrogen.evaluate((tile) => {
		const grid = tile.closest('.periodic-grid');
		if (!grid) throw new Error('The element layout is missing.');
		return getComputedStyle(grid).gridTemplateColumns.split(' ').length;
	});
	await page.keyboard.press('ArrowDown');
	await expect(page.locator(`button[data-element="${2 + columns}"]`)).toBeFocused();
	await page.keyboard.press('Control+End');
	await expect(page.locator('button[data-element="118"]')).toBeFocused();
	await page.getByRole('button', { name: 'Periodic table view', exact: true }).click();
	await expect(page.locator('button[data-element]')).toHaveCount(118);
	await page.getByRole('button', { name: 'Grid view', exact: true }).click();
	await expect(page.locator('button[data-element]')).toHaveCount(118);
	await page.getByLabel('Family', { exact: true }).selectOption('noble-gas');
	await expect(page.locator('button[data-element]')).toHaveCount(118);
	await expect(page.locator('button[data-element]:visible')).toHaveCount(7);
	await expect(page.locator('button[data-element="2"]')).toBeVisible();
	await page.getByLabel('Family', { exact: true }).selectOption('');
	await expect(page.locator('button[data-element]')).toHaveCount(118);
});

test('mobile comparison keeps help out of the grid and permits selection up to its limit', async ({
	page
}) => {
	await page.setViewportSize({ width: 375, height: 812 });
	await page.goto('/compare/?elements=');
	await ready(page);
	await expect(page.locator('.table-help')).toBeHidden();
	await expect(page.locator('button[data-element]')).toHaveCount(118);
	for (const number of [1, 4, 3, 2]) {
		await page.locator(`button[data-element="${number}"]`).click();
		await expect(page.locator(`button[data-element="${number}"]`)).toHaveAttribute(
			'aria-pressed',
			'true'
		);
	}
	await expect(page.getByRole('button', { name: /Remove .+ from comparison/ })).toHaveCount(4);
	const boron = page.locator('button[data-element="5"]');
	await expect(boron).toHaveAttribute('aria-disabled', 'true');
	await boron.focus();
	await page.keyboard.press('Enter');
	await expect(page.getByRole('button', { name: /Remove .+ from comparison/ })).toHaveCount(4);
	await expect(boron).toHaveAttribute('aria-pressed', 'false');
	await page.getByRole('button', { name: 'Remove Hydrogen from comparison', exact: true }).click();
	await expect(page.locator('button[data-element="1"]')).toBeFocused();
	await expect(boron).toHaveAttribute('aria-disabled', 'false');
	await boron.click();
	await expect(
		page.getByRole('button', { name: 'Remove Boron from comparison', exact: true })
	).toBeVisible();
	expect(new URL(page.url()).searchParams.get('elements')?.split(',')).toEqual([
		'4',
		'3',
		'2',
		'5'
	]);
});

test('mobile element details use consistent two-column spacing without page overflow', async ({
	page
}) => {
	await page.setViewportSize({ width: 375, height: 812 });
	await page.goto('/element/118/');
	await ready(page);
	const padding = await page
		.locator('.physical-properties > div')
		.evaluateAll((cells) => [0, 2, 4].map((index) => getComputedStyle(cells[index]).paddingRight));
	expect(padding).toEqual(['14px', '14px', '14px']);
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
		true
	);
});

for (const [alias, name] of [
	['aluminium', 'Aluminum'],
	['caesium', 'Cesium'],
	['sulphur', 'Sulfur']
]) {
	test(`the real trends search accepts ${alias}`, async ({ page }) => {
		await page.goto('/trends/?view=table');
		await ready(page);
		await page.getByRole('searchbox', { name: 'Find an element' }).fill(alias);
		await expect(page.locator('tbody tr')).toHaveCount(1);
		await expect(page.locator('tbody').getByRole('link', { name: new RegExp(name) })).toBeVisible();
		await expect(page.getByText(/No elements match/)).toHaveCount(0);
	});
}

test('saved light appearance synchronizes browser color before hydration and after toggling', async ({
	page
}) => {
	await page.addInitScript(() => localStorage.setItem('periodicity-theme', 'light'));
	await page.route('**/_app/**/*.js', (route) => route.abort());
	await page.goto('/?element=118', { waitUntil: 'domcontentloaded' });
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
	await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#f5f7fa');
	await page.unroute('**/_app/**/*.js');
	await page.reload();
	await ready(page);
	await page.getByRole('button', { name: 'Switch to dark appearance' }).click();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#10151e');
	await page.getByRole('button', { name: 'Switch to light appearance' }).click();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
	await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#f5f7fa');
	await ready(page);
});

test('unavailable storage does not stop query initialization', async ({ page }) => {
	await page.addInitScript(() => {
		Object.defineProperty(window, 'localStorage', {
			get() {
				throw new Error('Storage unavailable');
			}
		});
	});
	await page.goto('/trends/?property=density&view=table&period=7');
	await ready(page);
	await expect(page.getByRole('heading', { name: 'Density', exact: true })).toBeVisible();
	await expect(page.getByLabel('Show', { exact: true })).toHaveValue('7');
	await expect(page.getByRole('searchbox', { name: 'Find an element' })).toBeVisible();
	await ready(page);
});
