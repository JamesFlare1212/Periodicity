import { expect, test, type Page } from '@playwright/test';

async function ready(page: Page) {
	await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
	await expect(page.locator('html')).not.toHaveAttribute('data-initial-view', 'pending');
}

async function failNextHistoryWrite(page: Page) {
	await page.evaluate(() => {
		const original = history.replaceState;
		history.replaceState = function () {
			history.replaceState = original;
			throw new Error('History unavailable');
		};
	});
}

async function mockClipboard(page: Page) {
	await page.addInitScript(() => {
		const requests: {
			text: string;
			resolve: () => void;
			reject: (error: Error) => void;
		}[] = [];
		Object.defineProperty(navigator, 'clipboard', {
			configurable: true,
			value: {
				writeText: (text: string) =>
					new Promise<void>((resolve, reject) => requests.push({ text, resolve, reject }))
			}
		});
		Reflect.set(window, 'clipboardRequests', requests);
		Reflect.set(window, 'settleClipboard', (index: number, success: boolean) => {
			if (success) requests[index].resolve();
			else requests[index].reject(new Error('Clipboard unavailable'));
		});
	});
}

async function settleClipboard(page: Page, index: number, success: boolean) {
	await page.evaluate(
		({ index, success }) => Reflect.get(window, 'settleClipboard')(index, success),
		{ index, success }
	);
}

test('pointer preview falls back to the keyboard element and quick add uses that element', async ({
	page
}) => {
	await page.goto('/');
	await ready(page);
	const hydrogen = page.locator('button[data-element="1"]');
	await hydrogen.focus();
	await expect(page.getByRole('heading', { name: 'Hydrogen', exact: true })).toBeVisible();
	await page.locator('button[data-element="2"]').hover();
	await expect(page.getByRole('heading', { name: 'Helium', exact: true })).toBeVisible();
	await page.getByRole('heading', { name: 'The periodic table.', exact: true }).hover();
	await expect(hydrogen).toBeFocused();
	await expect(page.getByRole('heading', { name: 'Hydrogen', exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Add H to mass, Hydrogen', exact: true }).click();
	await expect(page.getByRole('region', { name: 'Formula H', exact: true })).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('region', { name: 'Quick molar mass calculation' })).toHaveCount(0);
});

for (const query of ['zzzzzz', 'ca']) {
	test(`URL navigation into the chart discards hidden table search (${query})`, async ({
		page
	}) => {
		await page.goto('/trends/?view=table');
		await ready(page);
		await page.getByRole('searchbox', { name: 'Find an element' }).fill(query);
		await page
			.getByRole('navigation', { name: 'Main navigation' })
			.getByRole('link', { name: 'Trends' })
			.click();
		await expect(page.getByRole('button', { name: 'Chart', exact: true })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		await expect(page.locator('.data-coverage')).toHaveText('102 of 118 values recorded');
		await expect(
			page.getByLabel('Explore an element', { exact: true }).locator('option')
		).toHaveCount(118);
		await page.getByRole('button', { name: 'Data', exact: true }).click();
		await expect(page.getByRole('searchbox', { name: 'Find an element' })).toHaveValue('');
	});
}

test('a chart selection removed by a period filter does not silently return', async ({ page }) => {
	await page.goto('/trends/');
	await ready(page);
	const choice = page.getByLabel('Explore an element', { exact: true });
	await choice.selectOption('26');
	await expect(page.locator('.readout-element')).toContainText('Iron');
	await page.getByLabel('Show', { exact: true }).selectOption('1');
	await expect(choice).toHaveValue('1');
	await page.getByLabel('Show', { exact: true }).selectOption('all');
	await expect(choice).toHaveValue('1');
	await page.getByRole('slider', { name: 'Explore elements by atomic number' }).focus();
	await page.keyboard.press('ArrowRight');
	await expect(choice).toHaveValue('2');
});

test('same-turn explore updates compose rather than overwrite other controls', async ({ page }) => {
	await page.goto('/?element=8&keep=1');
	await ready(page);
	await page.evaluate(() => {
		const display = document.querySelector<HTMLSelectElement>('#display')!;
		display.value = 'phase';
		display.dispatchEvent(new Event('change', { bubbles: true }));
		const temperature = document.querySelector<HTMLInputElement>('#temperature-value')!;
		temperature.value = '600';
		temperature.dispatchEvent(new Event('input', { bubbles: true }));
		Array.from(document.querySelectorAll<HTMLButtonElement>('.family-legend button'))
			.find((button) => button.textContent?.includes('Noble gases'))!
			.click();
	});
	await expect(page.getByLabel('Color by')).toHaveValue('phase');
	await expect(page.getByLabel('Temperature in kelvin')).toHaveValue('600');
	await expect(page.getByRole('button', { name: 'Noble gases', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await expect
		.poll(() => Object.fromEntries(new URL(page.url()).searchParams))
		.toMatchObject({
			element: '8',
			display: 'phase',
			temperature: '600',
			family: 'noble-gas',
			keep: '1'
		});
});

test('clipboard results are isolated across full, shell, and full again', async ({ page }) => {
	await mockClipboard(page);
	await page.goto('/element/26/');
	await ready(page);
	const viewer = page.locator('.configuration-viewer');
	const copy = viewer.getByRole('button', { name: 'Copy', exact: true });
	const views = viewer.getByRole('group', { name: 'Electron configuration view' });
	await copy.click();
	await expect(viewer.getByRole('button', { name: 'Copying…', exact: true })).toBeDisabled();
	await views.getByRole('button', { name: 'By shell', exact: true }).click();
	await copy.click();
	await views.getByRole('button', { name: 'Full', exact: true }).click();
	await copy.click();
	await settleClipboard(page, 1, true);
	await settleClipboard(page, 0, false);
	await expect(viewer.getByRole('button', { name: 'Copying…', exact: true })).toBeDisabled();
	await expect(viewer.locator('.copy-feedback')).toHaveText('');
	await settleClipboard(page, 2, true);
	await expect(viewer.getByRole('button', { name: 'Copied', exact: true })).toBeEnabled();
	await expect(viewer.locator('.copy-feedback')).toHaveText('Configuration copied.');
	const texts = await page.evaluate(() =>
		Reflect.get(window, 'clipboardRequests').map((request: { text: string }) => request.text)
	);
	expect(texts[0]).toBe(texts[2]);
	expect(texts[0]).toContain('3d6');
	expect(texts[1]).toContain('n=3:');
});

test('clipboard failures can retry and a disposed dialog cannot update its replacement', async ({
	page
}) => {
	await mockClipboard(page);
	await page.goto('/?element=26');
	await ready(page);
	const trigger = page.getByRole('button', { name: 'Full configuration', exact: true });
	await trigger.click();
	const dialog = page.getByRole('dialog');
	await dialog.getByRole('button', { name: 'Copy', exact: true }).click();
	await settleClipboard(page, 0, false);
	await expect(dialog.locator('.copy-feedback')).toContainText('Copy unavailable');
	await dialog.getByRole('button', { name: 'Copy', exact: true }).click();
	await page.keyboard.press('Escape');
	await trigger.click();
	await settleClipboard(page, 1, true);
	await expect(dialog.locator('.copy-feedback')).toHaveText('');
	await expect(dialog.getByRole('button', { name: 'Copy', exact: true })).toBeEnabled();
	await dialog.getByRole('button', { name: 'Copy', exact: true }).click();
	await settleClipboard(page, 2, true);
	await expect(dialog.getByRole('button', { name: 'Copied', exact: true })).toBeEnabled();
});

test('dialog restores its actual entry even when activation did not focus it', async ({ page }) => {
	await page.goto('/?element=1');
	await ready(page);
	const trigger = page.getByRole('button', { name: 'Full configuration', exact: true });
	await page.getByRole('link', { name: 'Periodicity home' }).focus();
	await trigger.evaluate((button: HTMLButtonElement) => button.click());
	await expect(page.getByRole('dialog')).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(trigger).toBeFocused();
	await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');
});

test('dialog ignores a drag from inside to the backdrop, then closes on a backdrop click', async ({
	page
}) => {
	await page.goto('/?element=1');
	await ready(page);
	const trigger = page.getByRole('button', { name: 'Full configuration', exact: true });
	await trigger.click();
	const dialog = page.getByRole('dialog');
	const box = (await dialog.boundingBox())!;
	await page.mouse.move(box.x + 20, box.y + 20);
	await page.mouse.down();
	await page.mouse.move(2, 2);
	await page.mouse.up();
	await expect(dialog).toBeVisible();
	await page.mouse.click(2, 2);
	await expect(dialog).toHaveCount(0);
	await expect(trigger).toBeFocused();
	await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');
});

test('dialog navigation restores body scrolling without dragging focus back to the old route', async ({
	page
}) => {
	await page.goto('/?element=1');
	await ready(page);
	await page.getByRole('button', { name: 'Full configuration', exact: true }).click();
	await page.getByRole('dialog').getByRole('link', { name: 'Open element page' }).click();
	await expect(page).toHaveURL(/\/element\/1\//);
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect(page.locator('body')).toBeFocused();
	await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');
});

test('quick mass undoes in insertion order and restores a fallback when its tile is hidden', async ({
	page
}) => {
	await page.setViewportSize({ width: 375, height: 812 });
	await page.goto('/?element=1');
	await ready(page);
	for (const number of [1, 8, 1]) {
		await page.locator(`button[data-element="${number}"]`).focus();
		await page.keyboard.press('Shift+Enter');
	}
	await expect(page.getByRole('region', { name: 'Formula H2O', exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Undo last atom', exact: true }).click();
	await expect(page.getByRole('region', { name: 'Formula HO', exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Undo last atom', exact: true }).click();
	await expect(page.getByRole('region', { name: 'Formula H', exact: true })).toBeVisible();
	await page.getByLabel('Family', { exact: true }).selectOption('noble-gas');
	await page.getByRole('button', { name: 'Undo last atom', exact: true }).click();
	await expect(page.getByRole('region', { name: 'Quick molar mass calculation' })).toHaveCount(0);
	await expect(
		page.getByRole('button', { name: 'Add H to mass, Hydrogen', exact: true })
	).toBeFocused();
});

test('comparison releases its submit lock after a history failure and permits a retry', async ({
	page
}) => {
	await page.goto('/compare/?elements=');
	await ready(page);
	await failNextHistoryWrite(page);
	await page.locator('button[data-element="1"]').click();
	await expect(page.getByRole('status')).toContainText('could not be updated');
	await expect(page.locator('.periodic-picker')).toHaveAttribute('aria-busy', 'false');
	await expect(page.locator('button[data-element="1"]')).toHaveAttribute('aria-pressed', 'false');
	await page.locator('button[data-element="1"]').click();
	await expect(page.locator('button[data-element="1"]')).toHaveAttribute('aria-pressed', 'true');
});

test('calculator keeps previous results distinct from drafts and recovers after invalid input', async ({
	page
}) => {
	await page.goto('/calculator/?formula=H2O');
	await ready(page);
	const input = page.getByLabel('Chemical formula', { exact: true });
	await input.fill('NaCl');
	await expect(page.getByText('Previous result', { exact: true })).toBeVisible();
	await expect(page.locator('.result-formula')).toHaveAttribute('aria-label', 'Formula H2O');
	await input.fill('Xx2');
	await page.getByRole('button', { name: 'Calculate', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('not an element symbol');
	await expect(input).toBeFocused();
	await expect(page.locator('.result-formula')).toHaveCount(0);
	await input.fill('NaCl');
	await page.getByRole('button', { name: 'Calculate', exact: true }).click();
	await expect(page.getByRole('alert')).toHaveCount(0);
	await expect(page.locator('.result-formula')).toHaveAttribute('aria-label', 'Formula NaCl');
	await expect(page).toHaveURL(/formula=NaCl/);
});

for (const route of ['explore', 'trends', 'element'] as const) {
	test(`${route} remains usable and reports a failed view-link update`, async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', (error) => errors.push(error.message));
		await page.goto(
			route === 'explore' ? '/?element=8' : route === 'trends' ? '/trends/' : '/element/26/'
		);
		await ready(page);
		await failNextHistoryWrite(page);
		if (route === 'explore') {
			await page.getByRole('button', { name: 'Noble gases', exact: true }).click();
			await expect(page.getByRole('button', { name: 'Noble gases', exact: true })).toHaveAttribute(
				'aria-pressed',
				'true'
			);
		} else if (route === 'trends') {
			await page.getByRole('button', { name: /^Density/ }).click();
			await expect(page.getByRole('heading', { name: 'Density', exact: true })).toBeVisible();
		} else {
			await page.getByRole('button', { name: 'By shell', exact: true }).click();
			await expect(page.getByRole('button', { name: 'By shell', exact: true })).toHaveAttribute(
				'aria-pressed',
				'true'
			);
		}
		await expect(
			page.getByText('The view changed, but its link could not be updated. Try again.', {
				exact: true
			})
		).toBeVisible();
		if (route === 'explore') {
			await page.getByRole('button', { name: 'Halogens', exact: true }).click();
			await expect
				.poll(() => new URL(page.url()).searchParams.get('family')?.split(',').sort())
				.toEqual(['halogen', 'noble-gas']);
		} else if (route === 'trends') {
			await page.getByRole('button', { name: 'Data', exact: true }).click();
			await expect
				.poll(() => Object.fromEntries(new URL(page.url()).searchParams))
				.toMatchObject({ property: 'density', view: 'table' });
		} else {
			await page.getByRole('button', { name: 'Short', exact: true }).click();
			await expect(page).toHaveURL(/configuration=short/);
		}
		await expect(
			page.getByText('The view changed, but its link could not be updated. Try again.', {
				exact: true
			})
		).toBeHidden();
		expect(errors).toEqual([]);
	});
}

for (const disposition of ['hidden', 'removed'] as const) {
	test(`dialog has a safe focus fallback if its entry is ${disposition}`, async ({ page }) => {
		await page.goto('/?element=1');
		await ready(page);
		const trigger = page.getByRole('button', { name: 'Full configuration', exact: true });
		await trigger.click();
		await trigger.evaluate((button: HTMLButtonElement, disposition) => {
			if (disposition === 'hidden') button.style.display = 'none';
			else button.remove();
		}, disposition);
		await page.keyboard.press('Escape');
		await expect(page.getByRole('dialog')).toHaveCount(0);
		await expect(page.locator('#main')).toBeFocused();
		await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');
	});
}

test('pointer and keyboard preview contexts clear independently, while a lock overrides both', async ({
	page
}) => {
	await page.goto('/');
	await ready(page);
	await page.locator('button[data-element="1"]').hover();
	await page.keyboard.press('Tab');
	await page.locator('button[data-element="2"]').focus();
	await expect(page.getByRole('heading', { name: 'Hydrogen', exact: true })).toBeVisible();
	await page.getByRole('heading', { name: 'The periodic table.', exact: true }).hover();
	await expect(page.getByRole('heading', { name: 'Helium', exact: true })).toBeVisible();
	await page.getByRole('link', { name: 'Periodicity home' }).focus();
	await expect(page.getByRole('heading', { name: 'Carbon', exact: true })).toBeVisible();
	await page.locator('button[data-element="8"]').click();
	await page.locator('button[data-element="1"]').hover();
	await page.keyboard.press('Tab');
	await page.locator('button[data-element="2"]').focus();
	await expect(page.getByRole('heading', { name: 'Oxygen', exact: true })).toBeVisible();
});

test('a chart selection retained by a filter remains selected', async ({ page }) => {
	await page.goto('/trends/');
	await ready(page);
	const choice = page.getByLabel('Explore an element', { exact: true });
	await choice.selectOption('26');
	await page.getByLabel('Show', { exact: true }).selectOption('4');
	await expect(choice).toHaveValue('26');
	await page.getByLabel('Show', { exact: true }).selectOption('all');
	await expect(choice).toHaveValue('26');
});

test('calculator keeps a valid result when history persistence fails', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.goto('/calculator/?formula=H2O');
	await ready(page);
	await failNextHistoryWrite(page);
	await page.getByLabel('Chemical formula', { exact: true }).fill('NaCl');
	await page.getByRole('button', { name: 'Calculate', exact: true }).click();
	await expect(page.locator('.result-formula')).toHaveAttribute('aria-label', 'Formula NaCl');
	await expect(page).toHaveURL(/formula=H2O/);
	await page.getByRole('button', { name: 'Calculate', exact: true }).click();
	await expect(page).toHaveURL(/formula=NaCl/);
	expect(errors).toEqual([]);
});

// Component reuse must not carry a warning for a previous element into a new URL.
test('a fresh element navigation clears the previous failed-link notice', async ({ page }) => {
	await page.goto('/element/26/');
	await ready(page);
	await failNextHistoryWrite(page);
	await page.getByRole('button', { name: 'By shell', exact: true }).click();
	const notice = page.getByText('The view changed, but its link could not be updated. Try again.', {
		exact: true
	});
	await expect(notice).toBeVisible();
	await page.locator('a[href="/element/27/?configuration=shell"]').click();
	await expect(page.getByRole('heading', { name: 'Cobalt', exact: true })).toBeVisible();
	await expect(notice).toBeHidden();
	await expect(page.getByRole('button', { name: 'By shell', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
});

test('comparison rejects another same-turn mutation while its submission is pending', async ({
	page
}) => {
	await page.goto('/compare/?elements=');
	await ready(page);
	await page.evaluate(() => {
		document.querySelector<HTMLButtonElement>('button[data-element="1"]')!.click();
		document.querySelector<HTMLButtonElement>('button[data-element="2"]')!.click();
	});
	await expect(page.locator('.periodic-picker')).toHaveAttribute('aria-busy', 'false');
	await expect(page.locator('button[data-element="1"]')).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator('button[data-element="2"]')).toHaveAttribute('aria-pressed', 'false');
	await page.locator('button[data-element="2"]').click();
	await expect.poll(() => new URL(page.url()).searchParams.get('elements')).toBe('1,2');
});

test('table sorting and search reset pagination and recover from an empty result', async ({
	page
}) => {
	await page.goto('/trends/?view=table&property=electronegativity');
	await ready(page);
	await page.getByRole('button', { name: 'Next page', exact: true }).click();
	await expect(page.locator('tbody tr').first().locator('.number-cell')).toHaveText('25');
	await page.getByRole('button', { name: 'Sort by Electronegativity', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Previous page', exact: true })).toBeDisabled();
	await expect(page.locator('th.value-column')).toHaveAttribute('aria-sort', 'descending');
	await expect(page.locator('tbody tr').first().locator('.number-cell')).toHaveText('9');
	await page.getByRole('searchbox', { name: 'Find an element' }).fill('zzzzzz');
	await expect(page.locator('tbody tr')).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Next page', exact: true })).toBeDisabled();
	await expect(page.getByRole('button', { name: 'Previous page', exact: true })).toBeDisabled();
	await page.getByRole('searchbox', { name: 'Find an element' }).fill('');
	await expect(page.locator('tbody tr')).toHaveCount(24);
	await page.getByLabel('Show', { exact: true }).selectOption('3');
	await expect(page.locator('tbody tr')).toHaveCount(8);
	await page.getByRole('button', { name: 'Sort by atomic number', exact: true }).click();
	await expect(page.locator('tbody tr').first().locator('.number-cell')).toHaveText('11');
});
