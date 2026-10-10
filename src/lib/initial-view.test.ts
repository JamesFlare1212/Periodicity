import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!bootstrap) throw new Error('The initial view bootstrap is missing.');

function initialView(path: string, getTheme = (): string | null => null) {
	const dataset: Record<string, string> = { theme: 'dark' };
	runInNewContext(bootstrap!, {
		location: new URL(path, 'https://periodicity.example'),
		URLSearchParams,
		document: { documentElement: { dataset } },
		localStorage: { getItem: getTheme }
	});
	return dataset;
}

describe('prerendered query views', () => {
	test.each([
		'/?element=118',
		'/?display=electronAffinity',
		'/?temperature=6000',
		'/?family=actinide',
		'/trends/?property=density',
		'/trends?view=table',
		'/trends/?period=7',
		'/compare/?elements=118,103,88,1',
		'/compare/?elements=',
		'/calculator/?formula=CuSO4%C2%B75H2O',
		'/calculator/?formula=',
		'/element/118/?configuration=shell#electronic-heading',
		'/element/1?configuration=short'
	])('waits for the requested view before showing %s', (path) => {
		expect(initialView(path).initialView).toBe('pending');
	});

	test.each([
		'/',
		'/trends/',
		'/compare/',
		'/calculator/',
		'/element/118/',
		'/element/118/#electronic-heading',
		'/?display=families&temperature=298&family=',
		'/trends/?property=ionizationEnergy&view=chart&period=all',
		'/compare/?elements=6,14',
		'/calculator/?formula=H2O',
		'/element/118/?configuration=full',
		'/?utm_source=example',
		'/trends/?formula=H2O',
		'/calculator/?elements=6,14',
		'/does-not-exist/?configuration=shell'
	])('keeps ordinary prerendered content visible at %s', (path) => {
		expect(initialView(path).initialView).toBeUndefined();
	});

	test('unavailable storage does not prevent a query view from initializing', () => {
		const dataset = initialView('/compare/?elements=118', () => {
			throw new Error('Storage unavailable');
		});
		expect(dataset).toEqual({ theme: 'dark', initialView: 'pending' });
	});

	test('restores the appearance before the query view is displayed', () => {
		expect(initialView('/calculator/?formula=NaCl', () => 'light')).toEqual({
			theme: 'light',
			initialView: 'pending'
		});
	});
});
