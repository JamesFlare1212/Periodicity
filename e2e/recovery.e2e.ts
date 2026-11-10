import { expect, test, type Page } from '@playwright/test';

async function ready(page: Page) {
	await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
	await expect(page.locator('html')).not.toHaveAttribute('data-initial-view');
}

test('failed startup offers a query-preserving retry instead of loading forever', async ({
	page
}) => {
	await page.route('**/_app/**/*.js', (route) => route.abort());
	await page.goto('/trends/?property=density&view=table&period=7#selected-property', {
		waitUntil: 'domcontentloaded'
	});
	await expect(
		page.getByRole('heading', { name: 'Your view could not be loaded', exact: true })
	).toBeVisible();
	await expect(page.locator('main')).toBeHidden();
	await page.unroute('**/_app/**/*.js');
	await page.getByRole('button', { name: 'Retry loading', exact: true }).click();
	await ready(page);
	expect(new URL(page.url()).searchParams.get('property')).toBe('density');
	expect(new URL(page.url()).hash).toBe('#selected-property');
	await expect(page.getByRole('heading', { name: 'Density', exact: true })).toBeVisible();
	await expect(page.getByLabel('Show', { exact: true })).toHaveValue('7');
});

test('an explicit default-view fallback is usable even while application modules fail', async ({
	page
}) => {
	await page.route('**/_app/**/*.js', (route) => route.abort());
	await page.goto('/trends/?property=density', { waitUntil: 'domcontentloaded' });
	await page.getByRole('link', { name: 'Open default view', exact: true }).click();
	expect(new URL(page.url()).search).toBe('');
	await expect(page.locator('main')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Ionization energy', exact: true })).toBeVisible();
});

test('stalled startup has a bounded wait and late hydration can still recover', async ({
	page
}) => {
	await page.clock.install();
	let release!: () => void;
	const held = new Promise<void>((resolve) => {
		release = resolve;
	});
	await page.route('**/_app/**/*.js', async (route) => {
		await held;
		await route.continue();
	});
	await page.goto('/?element=8', { waitUntil: 'domcontentloaded' });
	await expect(page.locator('html')).toHaveAttribute('data-initial-view', 'pending');
	await page.clock.fastForward(15000);
	await expect(page.getByRole('button', { name: 'Retry loading', exact: true })).toBeVisible();
	await expect(page.locator('main')).toBeHidden();
	release();
	await ready(page);
	await expect(page.getByRole('heading', { name: 'Oxygen', exact: true })).toBeVisible();
	await page.clock.fastForward(30000);
	await expect(page.locator('#initial-view-loading')).toBeHidden();
});

for (const unavailable of ['visibility', 'inert', 'disabled'] as const) {
	test(`dialog focus falls back when its connected entry is ${unavailable}`, async ({ page }) => {
		await page.goto('/?element=1');
		await ready(page);
		const trigger = page.getByRole('button', { name: 'Full configuration', exact: true });
		await trigger.click();
		await trigger.evaluate((button: HTMLButtonElement, unavailable) => {
			if (unavailable === 'visibility') button.style.visibility = 'hidden';
			else if (unavailable === 'inert') button.inert = true;
			else button.disabled = true;
		}, unavailable);
		await page.keyboard.press('Escape');
		await expect(page.getByRole('dialog')).toHaveCount(0);
		await expect(page.locator('#main')).toBeFocused();
	});
}

test('resize moves a filtered-out keyboard focus to a visible element', async ({ page }) => {
	await page.goto('/?family=noble-gas');
	await ready(page);
	await page.locator('button[data-element="1"]').focus();
	await expect(page.getByRole('heading', { name: 'Hydrogen', exact: true })).toBeVisible();
	await page.setViewportSize({ width: 375, height: 812 });
	await expect(page.locator('button[data-element="1"]')).toBeHidden();
	await expect(page.locator('button[data-element="2"]')).toBeFocused();
	await expect(page.getByRole('heading', { name: 'Helium', exact: true })).toBeVisible();
});

test('a canceled backdrop gesture cannot close a dialog through a later click', async ({
	page
}) => {
	await page.goto('/?element=1');
	await ready(page);
	await page.getByRole('button', { name: 'Full configuration', exact: true }).click();
	const dialog = page.getByRole('dialog');
	await dialog.dispatchEvent('pointerdown', { clientX: 0, clientY: 0, pointerId: 1 });
	await dialog.dispatchEvent('pointercancel', { pointerId: 1 });
	await dialog.dispatchEvent('click', { clientX: 0, clientY: 0 });
	await expect(dialog).toBeVisible();
});

for (const submitInvalid of [false, true]) {
	test(`a pending calculation cannot overwrite a newer ${submitInvalid ? 'invalid submission' : 'draft'}`, async ({
		page
	}) => {
		await page.goto('/calculator/?formula=H2O');
		await ready(page);
		await page.evaluate((submitInvalid) => {
			const input = document.querySelector<HTMLInputElement>('#chemical-formula')!;
			const form = input.form!;
			input.value = 'NaCl';
			input.dispatchEvent(new Event('input', { bubbles: true }));
			form.requestSubmit();
			input.value = submitInvalid ? 'Xx2' : 'Ca(OH)2';
			input.dispatchEvent(new Event('input', { bubbles: true }));
			if (submitInvalid) form.requestSubmit();
		}, submitInvalid);
		await expect(page.getByLabel('Chemical formula', { exact: true })).toHaveValue(
			submitInvalid ? 'Xx2' : 'Ca(OH)2'
		);
		if (submitInvalid) {
			await expect(page.getByRole('alert')).toContainText('not an element symbol');
			await expect(page.locator('.result-formula')).toHaveCount(0);
		} else {
			await expect(page.getByText('Previous result', { exact: true })).toBeVisible();
			await expect(page.locator('.result-formula')).toHaveAttribute('aria-label', 'Formula NaCl');
		}
		expect(new URL(page.url()).searchParams.get('formula')).toBe('H2O');
	});
}

test('a same-turn duplicate copy starts only one clipboard request', async ({ page }) => {
	await page.addInitScript(() => {
		Reflect.set(window, 'copyCalls', 0);
		Object.defineProperty(navigator, 'clipboard', {
			value: {
				writeText: () => {
					Reflect.set(window, 'copyCalls', Reflect.get(window, 'copyCalls') + 1);
					return new Promise<void>(() => {});
				}
			}
		});
	});
	await page.goto('/element/26/');
	await ready(page);
	await page.locator('.copy-button').evaluate((button: HTMLButtonElement) => {
		button.click();
		button.click();
	});
	expect(await page.evaluate(() => Reflect.get(window, 'copyCalls'))).toBe(1);
	await expect(page.getByRole('button', { name: 'Copying…', exact: true })).toBeDisabled();
});

test('same-turn full to shell to full copies keep the latest request alive', async ({ page }) => {
	await page.addInitScript(() => {
		const requests: { text: string; resolve: () => void; reject: (error: Error) => void }[] = [];
		Reflect.set(window, 'copyRequests', requests);
		Object.defineProperty(navigator, 'clipboard', {
			value: {
				writeText: (text: string) =>
					new Promise<void>((resolve, reject) => requests.push({ text, resolve, reject }))
			}
		});
	});
	await page.goto('/element/26/');
	await ready(page);
	await page.locator('.configuration-viewer').evaluate((viewer) => {
		const copy = viewer.querySelector<HTMLButtonElement>('.copy-button')!;
		const buttons = Array.from(viewer.querySelectorAll<HTMLButtonElement>('.view-switch button'));
		copy.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		buttons.find((button) => button.textContent === 'By shell')!.click();
		copy.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		buttons.find((button) => button.textContent === 'Full')!.click();
		copy.dispatchEvent(new MouseEvent('click', { bubbles: true }));
	});
	const texts = await page.evaluate(() =>
		Reflect.get(window, 'copyRequests').map((request: { text: string }) => request.text)
	);
	expect(texts).toHaveLength(3);
	expect(texts[0]).toBe(texts[2]);
	expect(texts[1]).toContain('n=3:');
	await page.evaluate(() => {
		const requests = Reflect.get(window, 'copyRequests');
		requests[0].resolve();
		requests[1].reject(new Error('Old request failed'));
	});
	await expect(page.getByRole('button', { name: 'Copying…', exact: true })).toBeDisabled();
	await expect(page.locator('.copy-feedback')).toHaveText('');
	await page.evaluate(() => Reflect.get(window, 'copyRequests')[2].resolve());
	await expect(page.getByRole('button', { name: 'Copied', exact: true })).toBeEnabled();
});

test('back and forward restore the explorer view after a route boundary', async ({ page }) => {
	await page.goto('/?element=1&family=noble-gas&display=phase&temperature=600');
	await ready(page);
	await page
		.getByRole('navigation', { name: 'Main navigation' })
		.getByRole('link', { name: 'Trends' })
		.click();
	await expect(page).toHaveURL(/\/trends\//);
	await page.goBack();
	await expect(page.getByRole('heading', { name: 'Hydrogen', exact: true })).toBeVisible();
	await expect(page.getByLabel('Color by')).toHaveValue('phase');
	await expect(page.getByLabel('Temperature in kelvin')).toHaveValue('600');
	await expect(page.getByRole('button', { name: 'Noble gases', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await page.goForward();
	await expect(page.getByRole('heading', { name: 'Periodic trends', exact: true })).toBeVisible();
});

test('a route change wins over an outstanding calculation and its feedback', async ({ page }) => {
	await page.goto('/calculator/?formula=H2O');
	await ready(page);
	await page.evaluate(() => {
		const input = document.querySelector<HTMLInputElement>('#chemical-formula')!;
		input.value = 'NaCl';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		input.form!.requestSubmit();
		document.querySelector<HTMLAnchorElement>('nav a[href="/trends/"]')!.click();
	});
	await expect(page).toHaveURL(/\/trends\//);
	await expect(page.getByRole('heading', { name: 'Periodic trends', exact: true })).toBeVisible();
	await expect(
		page.getByText('The view changed, but its link could not be updated. Try again.', {
			exact: true
		})
	).toBeHidden();
});

test('comparison navigation clears a success message belonging to the old selection', async ({
	page
}) => {
	await page.goto('/compare/?elements=');
	await ready(page);
	await page.locator('button[data-element="1"]').click();
	await expect(page.locator('.compare-page [role="status"]')).toContainText('Added Hydrogen');
	await page
		.getByRole('navigation', { name: 'Main navigation' })
		.getByRole('link', { name: 'Compare' })
		.click();
	await expect(
		page.getByRole('button', { name: 'Remove Carbon from comparison', exact: true })
	).toBeVisible();
	await expect(page.locator('.compare-page [role="status"]')).toHaveText('');
});
